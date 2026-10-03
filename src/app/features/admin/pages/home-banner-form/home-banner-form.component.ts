import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { HomeBannerService } from '@core/services/home-banner.service';
import { CategoryService } from '@core/services/category.service';
import { ClientProductService } from '@core/services/client-product.service';
import { FlashSaleService } from '@core/services/flash-sale.service';
import {
  BannerTargetType,
  HomeBannerCreationRequest,
  HomeBannerResponse,
} from '@core/models/home-banner.model';
import { CategoryResponse } from '@core/models/category.model';
import { FlashSaleResponse } from '@core/models/flash-sale.model';
import { PageHeaderComponent } from '@shared/components';
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { ProductPickerComponent } from '@shared/components/product-picker/product-picker.component';

/**
 * Tạo/sửa banner trang chủ (Sprint 4c).
 *
 * <p>
 * `targetValue` đổi widget theo `targetType` (D30): chọn từ danh sách có sẵn
 * (Category/Product/FlashSale/Brand) — không có đường cho admin gõ link tay.
 * Panel bên phải xem trước slide, cập nhật ngay khi gõ.
 */
@Component({
  selector: 'app-home-banner-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    LoadingComponent,
    ImageUploadComponent,
    ProductPickerComponent,
  ],
  templateUrl: './home-banner-form.component.html',
})
export class HomeBannerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bannerService = inject(HomeBannerService);
  private readonly categoryService = inject(CategoryService);
  private readonly clientProductService = inject(ClientProductService);
  private readonly flashSaleService = inject(FlashSaleService);
  private readonly notification = inject(NotificationService);

  isLoading = signal(false);
  isSubmitting = signal(false);
  bannerId = signal<string>('');
  imageFile = signal<File | null>(null);
  existingImage = signal<string | null>(null);
  imageRemoved = signal(false);

  /** Dữ liệu cho dropdown theo targetType. Chỉ nạp mục đang dùng được. */
  categories = signal<CategoryResponse[]>([]);
  flashSales = signal<FlashSaleResponse[]>([]);
  /** Hãng lấy từ nguồn đang bán — BE chỉ chấp nhận hãng có sản phẩm active. */
  brands = signal<string[]>([]);

  readonly targetTypes: { value: BannerTargetType; label: string }[] = [
    { value: 'CATEGORY', label: 'CATEGORY — mở danh mục' },
    { value: 'PRODUCT', label: 'PRODUCT — mở sản phẩm' },
    { value: 'BRAND', label: 'BRAND — mở thương hiệu' },
    { value: 'FLASH_SALE', label: 'FLASH_SALE — mở phiên flash sale' },
  ];

  bannerForm: FormGroup = this.fb.group({
    kicker: ['', [Validators.maxLength(100)]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    subtitle: [''],
    imageUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    targetType: ['CATEGORY' as BannerTargetType, [Validators.required]],
    targetValue: ['', [Validators.required]],
    sortOrder: [0, [Validators.min(0)]],
    active: [true],
  });

  isEditMode = computed(() => !!this.bannerId());
  pageTitle = computed(() =>
    this.isEditMode() ? 'Sửa slide banner' : 'Thêm slide banner',
  );
  pageSubtitle = computed(
    () =>
      'Slide hiện ở carousel đầu trang chủ. Tối đa 5 slide đang bật — tắt bớt nếu muốn thêm.',
  );

  // FormControl.value là thuộc tính thường — computed() đọc nó không bao giờ
  // chạy lại, nên đổi loại liên kết mà nhãn/ô chọn không đổi theo. Bọc
  // valueChanges thành signal để phần còn lại của form bám theo.
  private readonly targetTypeCtrl = toSignal(this.bannerForm.get('targetType')!.valueChanges, {
    initialValue: this.bannerForm.get('targetType')!.value,
  });

  targetType = computed(() => this.targetTypeCtrl() as BannerTargetType);

  /** Nhãn ô chọn giá trị đích — đổi theo loại liên kết. */
  targetLabel = computed(() => {
    switch (this.targetType()) {
      case 'PRODUCT':
        return 'Chọn sản phẩm';
      case 'CATEGORY':
        return 'Chọn danh mục';
      case 'BRAND':
        return 'Chọn thương hiệu';
      default:
        return 'Chọn phiên Flash Sale';
    }
  });

  targetHelp = computed(() => {
    switch (this.targetType()) {
      case 'PRODUCT':
        return 'Slide mở trang chi tiết sản phẩm.';
      case 'CATEGORY':
        return 'Slide mở danh sách đã lọc theo danh mục.';
      case 'BRAND':
        return 'Slide mở danh sách đã lọc theo thương hiệu.';
      default:
        return 'Slide sẽ mở trang Flash Sale của phiên này.';
    }
  });

  /** Giá trị form hiện tại — panel xem trước đọc từ đây. */
  preview = signal({
    kicker: '',
    title: '',
    subtitle: '',
    targetType: 'CATEGORY' as BannerTargetType,
    targetValue: '',
    sortOrder: 0,
    active: true,
  });

  ngOnInit(): void {
    this.loadOptions();
    // Xem trước bám theo form: gõ tới đâu panel đổi tới đó.
    this.bannerForm.valueChanges.subscribe(() => this.syncPreview());
    this.syncPreview();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.bannerId.set(idParam);
      this.loadBanner();
      return;
    }
    // Nhân bản: mở form tạo mới với nội dung slide nguồn đã điền sẵn. Ảnh KHÔNG
    // sao chép được (BE tạo mới bắt buộc có tệp) nên admin phải chọn ảnh mới.
    const duplicate = this.router.getCurrentNavigation()?.extras?.state?.['duplicateFrom'] as
      | HomeBannerResponse
      | undefined;
    const source = duplicate ?? (history.state?.duplicateFrom as HomeBannerResponse | undefined);
    if (source) {
      this.patchForm({ ...source, title: `${source.title} (bản sao)` });
      this.existingImage.set(null);
    }
  }

  private syncPreview(): void {
    const v = this.bannerForm.value;
    this.preview.set({
      kicker: v.kicker ?? '',
      title: v.title ?? '',
      subtitle: v.subtitle ?? '',
      targetType: v.targetType,
      targetValue: v.targetValue ?? '',
      sortOrder: v.sortOrder ?? 0,
      active: v.active ?? true,
    });
  }

  loadOptions(): void {
    // Chỉ danh mục đang bật: BE từ chối banner trỏ vào danh mục đã tắt.
    this.categoryService.getCategories().subscribe({
      next: (categories) => this.categories.set((categories ?? []).filter((c) => c.active)),
      error: () => this.categories.set([]),
    });
    this.clientProductService.getBrands().subscribe({
      next: (brands) => this.brands.set(brands ?? []),
      error: () => this.brands.set([]),
    });
    this.flashSaleService.getFlashSales().subscribe({
      next: (sales) => this.flashSales.set(sales ?? []),
      error: () => this.flashSales.set([]),
    });
  }

  loadBanner(): void {
    if (!this.bannerId()) return;
    this.isLoading.set(true);
    this.bannerService.getBannerById(this.bannerId()).subscribe({
      next: (banner) => {
        this.patchForm(banner);
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/admin/home-banners']);
        this.isLoading.set(false);
      },
    });
  }

  patchForm(banner: HomeBannerResponse): void {
    this.bannerForm.patchValue({
      kicker: banner.kicker ?? '',
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      targetType: banner.targetType,
      targetValue: banner.targetValue,
      sortOrder: banner.sortOrder,
      active: banner.active,
      // Ảnh hiện tại hiển thị ở khối image-upload; ô URL để trống cho lần sửa.
      imageUrl: '',
    });
    this.existingImage.set(banner.image ?? null);
    this.imageRemoved.set(false);
  }

  /** Đổi loại đích thì xóa giá trị cũ — tránh gửi id của loại khác. */
  onTargetTypeChange(): void {
    this.bannerForm.get('targetValue')?.setValue('');
  }

  onImageFileChange(file: File | null): void {
    this.imageFile.set(file);
    if (file) {
      this.imageRemoved.set(false);
    }
  }

  onSubmit(): void {
    if (this.bannerForm.invalid) {
      this.markFormGroupTouched(this.bannerForm);
      this.notification.warn('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    const value = this.bannerForm.get('targetValue')?.value?.trim() ?? '';

    this.isSubmitting.set(true);
    const v = this.bannerForm.value;
    const payload: HomeBannerCreationRequest = {
      kicker: v.kicker?.trim() || undefined,
      title: v.title.trim(),
      subtitle: v.subtitle?.trim() || undefined,
      targetType: v.targetType,
      targetValue: value,
      sortOrder: v.sortOrder ?? 0,
      active: v.active ?? true,
      imageUrl: v.imageUrl?.trim() || undefined,
      removeImage: this.imageRemoved(),
    };
    // Ảnh gửi ở part riêng `inputFile` (khuôn Product), không nằm trong JSON.
    const file = this.imageFile() ?? undefined;

    const request$ =
      this.isEditMode() && this.bannerId()
        ? this.bannerService.updateBanner(this.bannerId(), payload, file)
        : this.bannerService.createBanner(payload, file);

    request$.subscribe({
      next: () => {
        this.notification.success(
          this.isEditMode() ? 'Cập nhật banner thành công' : 'Tạo banner thành công',
        );
        this.isSubmitting.set(false);
        this.router.navigate(['/admin/home-banners']);
      },
      error: (error) => {
        this.notification.error(this.notification.extractError(error));
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/home-banners']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get f() {
    return this.bannerForm.controls;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.bannerForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }
}
