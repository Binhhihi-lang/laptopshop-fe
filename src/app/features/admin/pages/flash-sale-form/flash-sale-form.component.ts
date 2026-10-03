import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { FlashSaleService } from '@core/services/flash-sale.service';
import { ProductService } from '@core/services/product.service';
import {
  FlashSaleCreationRequest,
  FlashSaleItemRequest,
  FlashSaleResponse,
} from '@core/models/flash-sale.model';
import { PageHeaderComponent } from '@shared/components';
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { ProductPickerComponent } from '@shared/components/product-picker/product-picker.component';

/**
 * Tạo/sửa phiên flash sale (Sprint 4c).
 *
 * <p>
 * Bảng item thêm/xóa inline. Validate client `flashPrice < giá thường` (D26)
 * để báo lỗi ngay, nhưng BE vẫn là nơi chặn thật (FLASH_PRICE_NOT_LOWER).
 */
@Component({
  selector: 'app-flash-sale-form',
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
    ProductPickerComponent,
  ],
  templateUrl: './flash-sale-form.component.html',
})
export class FlashSaleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly flashSaleService = inject(FlashSaleService);
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);

  isLoading = signal(false);
  isSubmitting = signal(false);
  flashSaleId = signal<string>('');

  /**
   * Giá thường theo productId — tra từ danh sách sản phẩm của phiên (BE trả kèm
   * `regularPrice`), không cần tải cả catalog về.
   */
  private regularPrices = signal<Record<string, number>>({});

  /** Tổng suất còn lại của phiên — hiện ở dòng tổng của bảng sản phẩm. */
  totalStock = computed(() =>
    this.items.controls.reduce((sum, c) => sum + (Number(c.get('flashStock')?.value) || 0), 0),
  );

  flashSaleForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      startAt: ['', [Validators.required]],
      endAt: ['', [Validators.required]],
      active: [true],
      items: this.fb.array([]),
    },
    { validators: dateRangeValidator },
  );

  isEditMode = computed(() => !!this.flashSaleId());
  pageTitle = computed(() =>
    this.isEditMode() ? 'Chỉnh sửa phiên flash sale' : 'Tạo phiên flash sale',
  );
  pageSubtitle = computed(() =>
    this.isEditMode()
      ? 'Cập nhật thông tin và danh sách sản phẩm của phiên'
      : 'Điền thông tin và thêm sản phẩm vào phiên',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Tạo phiên'));
  submitButtonIcon = computed(() => (this.isEditMode() ? 'save' : 'add'));

  get items(): FormArray {
    return this.flashSaleForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.flashSaleId.set(idParam);
      this.loadFlashSale();
    } else {
      // Phiên mới: mở sẵn 1 dòng để admin nhập luôn.
      this.addItem();
    }
  }

  loadFlashSale(): void {
    if (!this.flashSaleId()) return;
    this.isLoading.set(true);
    this.flashSaleService.getFlashSaleById(this.flashSaleId()).subscribe({
      next: (sale) => {
        this.patchForm(sale);
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/admin/flash-sales']);
        this.isLoading.set(false);
      },
    });
  }

  patchForm(sale: FlashSaleResponse): void {
    this.flashSaleForm.patchValue({
      name: sale.name,
      description: sale.description ?? '',
      // datetime-local cần 'YYYY-MM-DDTHH:mm'
      startAt: sale.startAt ? sale.startAt.slice(0, 16) : '',
      endAt: sale.endAt ? sale.endAt.slice(0, 16) : '',
      active: sale.active,
    });
    this.items.clear();
    // Nạp giá thường + tên của từng sản phẩm đã có trong phiên (BE trả kèm
    // `regularPrice`/`productName`) để cột "Giá thường" và picker hiện ngay.
    const prices: Record<string, number> = {};
    const labels: Record<string, string> = {};
    const solds: Record<string, number> = {};
    (sale.items ?? []).forEach((item) => {
      if (item.productId && item.regularPrice != null) {
        prices[item.productId] = item.regularPrice;
      }
      if (item.productId && item.productName) {
        labels[item.productId] = item.productName;
      }
      if (item.productId && item.soldInFlash != null) {
        solds[item.productId] = item.soldInFlash;
      }
    });
    this.regularPrices.set(prices);
    this.itemLabels.set(labels);
    this.itemSold.set(solds);
    (sale.items ?? []).forEach((item) => {
      this.items.push(
        this.buildItemGroup({
          productId: item.productId,
          flashPrice: item.flashPrice,
          flashStock: item.flashStock,
          perUserLimit: item.perUserLimit,
        }),
      );
    });
  }

  private buildItemGroup(item?: FlashSaleItemRequest): FormGroup {
    return this.fb.group(
      {
        productId: [item?.productId ?? '', [Validators.required]],
        flashPrice: [item?.flashPrice ?? null, [Validators.required, Validators.min(1)]],
        // flashStock = số suất CÒN LẠI: 0 = hết suất (hợp lệ), âm = sai.
        flashStock: [item?.flashStock ?? null, [Validators.required, Validators.min(0)]],
        perUserLimit: [item?.perUserLimit ?? null, [Validators.required, Validators.min(1)]],
      },
      { validators: limitWithinStockValidator },
    );
  }

  addItem(): void {
    this.items.push(this.buildItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) {
      this.notification.warn('Phiên phải có ít nhất một sản phẩm');
      return;
    }
    this.items.removeAt(index);
  }

  /**
   * Giá thường của sản phẩm đã chọn — để hiện gạch ngang + tính % giảm.
   * Phiên đang sửa: BE trả kèm `regularPrice`; dòng mới thêm thì tra từ picker.
   */
  regularPriceOf(productId: string): number | null {
    return this.regularPrices()[productId] ?? this.pickedPrices()[productId] ?? null;
  }

  /** Giá thường của sản phẩm vừa chọn từ picker (chưa có trong phiên). */
  private pickedPrices = signal<Record<string, number>>({});

  /** Tên sản phẩm theo productId — nạp sẵn khi sửa phiên để picker hiện ngay. */
  private itemLabels = signal<Record<string, string>>({});

  /** Số đã bán theo productId — hiện dưới ô "Suất còn lại" khi sửa phiên. */
  private itemSold = signal<Record<string, number>>({});

  /** Số đã bán của dòng thứ i (0 nếu dòng mới). */
  soldAt(index: number): number {
    const id = this.items.at(index)?.get('productId')?.value;
    return id ? (this.itemSold()[id] ?? 0) : 0;
  }

  /** Tên sản phẩm của dòng thứ i — cho picker khỏi chờ HTTP tra tên. */
  itemLabelAt(index: number): string {
    const id = this.items.at(index)?.get('productId')?.value;
    return id ? (this.itemLabels()[id] ?? '') : '';
  }

  /** Giá thường của sản phẩm vừa chọn từ picker (chưa có trong phiên). */
  onProductPicked(index: number, ids: string[]): void {
    const productId = ids[0];
    if (!productId) {
      return;
    }
    this.productService.getProductById(productId).subscribe({
      next: (product) =>
        this.pickedPrices.update((map) => ({ ...map, [productId]: product.price })),
      error: () => {},
    });
  }

  /** Giá thường của dòng thứ i — template không gọi được `group.get()` trực tiếp. */
  regularPriceAt(index: number): number | null {
    return this.regularPriceOf(this.items.at(index).get('productId')?.value);
  }

  /** % giảm của dòng thứ i; null nếu chưa đủ dữ liệu. */
  discountPercent(index: number): number | null {
    const group = this.items.at(index);
    const price = group.get('flashPrice')?.value;
    const regular = this.regularPriceOf(group.get('productId')?.value);
    if (!price || !regular || regular <= 0) {
      return null;
    }
    return Math.round((1 - price / regular) * 100);
  }

  /** D26: cảnh báo ngay trên form — BE vẫn chặn thật. */
  isPriceInvalid(index: number): boolean {
    const group = this.items.at(index);
    const price = group.get('flashPrice')?.value;
    const regular = this.regularPriceOf(group.get('productId')?.value);
    return price != null && regular != null && price >= regular;
  }

  /**
   * Tối đa/khách vượt suất còn lại → con số vượt là ảo (cả phiên chỉ có bấy
   * nhiêu máy). BE cũng chặn (FLASH_PER_USER_LIMIT_EXCEEDS_STOCK).
   */
  isLimitExceedsStock(index: number): boolean {
    return this.items.at(index)?.hasError('limitExceedsStock') ?? false;
  }

  /** Lỗi "required" của một ô trong dòng — hiện ngay dưới ô thay vì báo chung. */
  itemError(index: number, field: string): string {
    const ctrl = this.items.at(index)?.get(field);
    if (!ctrl || !ctrl.touched || !ctrl.errors) {
      return '';
    }
    if (ctrl.errors['required']) {
      if (field === 'productId') {
        return 'Chưa chọn sản phẩm';
      }
      if (field === 'perUserLimit') {
        return 'Bắt buộc nhập — mỗi khách mua tối đa bao nhiêu máy?';
      }
      return 'Không được để trống';
    }
    if (ctrl.errors['min']) {
      return 'Phải lớn hơn 0';
    }
    return '';
  }

  onSubmit(): void {
    if (this.flashSaleForm.invalid) {
      this.markFormGroupTouched(this.flashSaleForm);
      // Chỉ rõ dòng nào đang thiếu/sai để người dùng biết sửa chỗ nào.
      const badRow = this.items.controls.findIndex((c) => c.invalid);
      this.notification.warn(
        badRow >= 0
          ? `Dòng sản phẩm ${badRow + 1} chưa hợp lệ — kiểm tra lại giá, kho và sản phẩm`
          : 'Vui lòng điền đầy đủ thông tin bắt buộc',
      );
      return;
    }
    // Kiểm tra trùng sản phẩm trước khi gửi — BE cũng chặn (FLASH_SALE_ITEM_DUPLICATE).
    const productIds = this.items.controls.map((c) => c.get('productId')?.value);
    const dupIndex = productIds.findIndex((id, i) => productIds.indexOf(id) !== i);
    if (dupIndex >= 0) {
      this.notification.warn(
        `Sản phẩm ở dòng ${dupIndex + 1} đã có trong phiên — mỗi sản phẩm chỉ được thêm một lần`,
      );
      return;
    }
    const invalidIndex = this.items.controls.findIndex((_, i) => this.isPriceInvalid(i));
    if (invalidIndex >= 0) {
      this.notification.warn(
        `Giá flash ở dòng ${invalidIndex + 1} phải thấp hơn giá bán hiện tại của sản phẩm`,
      );
      return;
    }
    // Tối đa/khách > suất còn lại → báo từng dòng (BE cũng chặn cùng luật).
    const overLimitIndex = this.items.controls.findIndex((_, i) => this.isLimitExceedsStock(i));
    if (overLimitIndex >= 0) {
      const stock = this.items.at(overLimitIndex).get('flashStock')?.value;
      this.notification.warn(
        `Dòng ${overLimitIndex + 1}: tối đa mỗi khách không được vượt suất còn lại (${stock})`,
      );
      return;
    }

    this.isSubmitting.set(true);
    const v = this.flashSaleForm.value;
    const payload: FlashSaleCreationRequest = {
      name: v.name.trim(),
      description: v.description?.trim() || undefined,
      startAt: this.toIso(v.startAt),
      endAt: this.toIso(v.endAt),
      active: v.active ?? true,
      items: this.items.controls.map((c) => ({
        productId: c.get('productId')?.value,
        flashPrice: Number(c.get('flashPrice')?.value),
        flashStock: Number(c.get('flashStock')?.value),
        perUserLimit: c.get('perUserLimit')?.value ? Number(c.get('perUserLimit')?.value) : null,
      })),
    };

    const request$ =
      this.isEditMode() && this.flashSaleId()
        ? this.flashSaleService.updateFlashSale(this.flashSaleId(), payload)
        : this.flashSaleService.createFlashSale(payload);

    request$.subscribe({
      next: () => {
        this.notification.success(
          this.isEditMode() ? 'Cập nhật phiên thành công' : 'Tạo phiên thành công',
        );
        this.isSubmitting.set(false);
        this.router.navigate(['/admin/flash-sales']);
      },
      error: (error) => {
        this.notification.error(this.notification.extractError(error));
        this.isSubmitting.set(false);
      },
    });
  }

  /** 'YYYY-MM-DDTHH:mm' → ISO có giây để BE parse được. */
  private toIso(local: string): string {
    return local.length === 16 ? `${local}:00` : local;
  }

  onCancel(): void {
    this.router.navigate(['/admin/flash-sales']);
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
    return this.flashSaleForm.controls;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.flashSaleForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }

  hasFormError(errorName: string): boolean {
    return (this.flashSaleForm.touched && this.flashSaleForm.hasError(errorName)) ?? false;
  }

  formatPrice(value: number | null): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

/** endAt phải sau startAt — chặn trước khi gửi lên BE. */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startAt')?.value;
  const end = group.get('endAt')?.value;
  if (!start || !end) {
    return null;
  }
  return new Date(end) > new Date(start) ? null : { dateRange: true };
}

/** Tối đa/khách không được vượt suất còn lại của dòng. Bỏ trống = không giới hạn. */
function limitWithinStockValidator(group: AbstractControl): ValidationErrors | null {
  const limit = group.get('perUserLimit')?.value;
  const stock = group.get('flashStock')?.value;
  if (limit == null || limit === '' || stock == null || stock === '') {
    return null;
  }
  return Number(limit) > Number(stock) ? { limitExceedsStock: true } : null;
}
