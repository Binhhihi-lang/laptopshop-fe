import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { VoucherService } from '@core/services/voucher.service';
import { ClientCategoryService } from '@core/services/client-category.service';
import { ProductService } from '@core/services/product.service';
import { CategoryResponse } from '@core/models/category.model';
import {
  VoucherResponse,
  VoucherCreationRequest,
  VoucherUpdateRequest,
  VoucherType,
  ScopeType,
} from '@core/models/voucher.model';

// Shared components
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { ScopePickerComponent } from '@shared/components/scope-picker/scope-picker.component';
import { UserPickerComponent } from '@shared/components/user-picker/user-picker.component';

function discountXorValidator(group: AbstractControl): ValidationErrors | null {
  const percent = group.get('discountPercent')?.value;
  const amount = group.get('discountAmount')?.value;
  const hasPercent = percent !== null && percent !== '' && percent !== undefined;
  const hasAmount = amount !== null && amount !== '' && amount !== undefined;

  if (hasPercent && hasAmount) {
    return { bothDiscount: true };
  }
  if (!hasPercent && !hasAmount) {
    return { noDiscount: true };
  }
  return null;
}

@Component({
  selector: 'app-voucher-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    FormFieldComponent,
    InputComponent,
    ButtonComponent,
    CardComponent,
    LoadingComponent,
    PageHeaderComponent,
    ImageUploadComponent,
    ScopePickerComponent,
    UserPickerComponent,
  ],
  templateUrl: './voucher-form.component.html',
  styleUrl: './voucher-form.component.css',
})
export class VoucherFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly voucherService = inject(VoucherService);
  private readonly categoryService = inject(ClientCategoryService);
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);

  isLoading = signal(false);
  isSubmitting = signal(false);
  imageFile = signal<File | null>(null);
  existingImage = signal<string | null>(null);
  imageRemoved = signal(false);

  voucherId = signal<string>('');

  voucherForm: FormGroup = this.fb.group(
    {
      code: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(500)]],
      discountType: ['percent', [Validators.required]],
      discountPercent: [null, [Validators.min(1), Validators.max(100)]],
      discountAmount: [null, [Validators.min(1)]],
      // G9: field mở rộng từ Sprint 1 — null = không giới hạn (P3).
      startDate: [''],
      expiryDate: [''],
      usageLimit: [0, [Validators.min(0)]],
      minOrderValue: [null, [Validators.min(0)]],
      maxDiscountAmount: [null, [Validators.min(1)]],
      perUserLimit: [null, [Validators.min(1)]],
      voucherType: ['PUBLIC' as VoucherType],
      active: [true],
      imageUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    },
    { validators: discountXorValidator },
  );

  /** Loại phạm vi — tách khỏi FormGroup vì do app-scope-picker quản lý. */
  scopeType = signal<ScopeType>('ALL');
  /** Giá trị phạm vi đã chọn (Category.id | tên hãng | Product.id). */
  scopeValues = signal<string[]>([]);
  /** Danh mục + hãng để picker hiện lựa chọn. */
  categories = signal<CategoryResponse[]>([]);
  brands = signal<string[]>([]);

  /** scope ALL thì không cần chọn giá trị phạm vi. */
  needsScopeValue = computed(() => this.scopeType() !== 'ALL');
  /** Trần giảm chỉ có nghĩa với kiểu PERCENT. */
  // FormControl.value là thuộc tính THƯỜNG, không phải signal — computed() đọc
  // nó sẽ không bao giờ chạy lại. Bọc valueChanges thành signal thì mới phản ứng
  // khi admin đổi lựa chọn (toSignal tự hủy theo vòng đời component).
  private readonly discountTypeCtrl = toSignal(this.voucherForm.get('discountType')!.valueChanges, {
    initialValue: this.voucherForm.get('discountType')!.value,
  });
  private readonly voucherTypeCtrl = toSignal(this.voucherForm.get('voucherType')!.valueChanges, {
    initialValue: this.voucherForm.get('voucherType')!.value,
  });
  isPercentType = computed(() => this.discountTypeCtrl() === 'percent');
  voucherTypeValue = computed(() => this.voucherTypeCtrl() as VoucherType);
  /** Chỉ phát đích danh mới cần chọn khách; PUBLIC để khách tự nhận. */
  needsAssignees = computed(() => this.voucherTypeValue() === 'ASSIGNED');
  /** Khách sẽ được phát voucher (chỉ dùng khi lưu, không phải field của Voucher). */
  assigneeIds = signal<string[]>([]);

  readonly voucherTypes: { value: VoucherType; label: string }[] = [
    { value: 'PUBLIC', label: 'Công khai (PUBLIC)' },
    { value: 'ASSIGNED', label: 'Gán cho khách (ASSIGNED)' },
  ];

  /** Giải thích ý nghĩa kiểu phát hành đang chọn (mockup `vTypeHelp`). */
  voucherTypeHelp = computed(() =>
    this.needsAssignees()
      ? 'Voucher không gõ được ở checkout — chỉ dùng được khi có trong ví.'
      : 'Công khai = ai cũng claim được vào ví.',
  );

  isEditMode = computed(() => !!this.voucherId());
  pageTitle = computed(() =>
    this.isEditMode() ? 'Chỉnh sửa voucher' : 'Tạo voucher',
  );
  pageSubtitle = computed(() =>
    this.isEditMode()
      ? 'Cập nhật thông tin voucher'
      : 'Voucher trừ một lần cho cả đơn — mua 10 máy vẫn chỉ giảm đúng một mức.',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Lưu voucher'));
  submitButtonIcon = computed(() => (this.isEditMode() ? 'save' : 'check'));

  // ===== Preview "Xem trước cách tính" (mockup D22) =====

  /** Giỏ hàng mẫu cố định — chỉ để minh hoạ công thức, không phải dữ liệu thật. */
  private readonly SAMPLE_SUBTOTAL = 89970000;
  private readonly SAMPLE_PROMO = 2559200;

  /** Tiền hàng thuộc phạm vi voucher = tạm tính − giảm giá sản phẩm. */
  previewEligible = computed(() => this.SAMPLE_SUBTOTAL - this.SAMPLE_PROMO);

  /** Voucher giảm bao nhiêu — công thức khớp VoucherService.calculateDiscount. */
  previewDiscount = computed(() => {
    const eligible = this.previewEligible();
    const minOrder = Number(this.voucherForm.get('minOrderValue')?.value) || 0;
    if (eligible < minOrder) {
      return 0; // chưa đủ điều kiện đơn tối thiểu
    }
    const value = Number(
      this.isPercentType()
        ? this.voucherForm.get('discountPercent')?.value
        : this.voucherForm.get('discountAmount')?.value,
    );
    if (!value || value <= 0) {
      return 0;
    }
    const raw = this.isPercentType() ? Math.round((eligible * value) / 100) : value;
    const cap = Number(this.voucherForm.get('maxDiscountAmount')?.value) || Infinity;
    return Math.min(raw, eligible, cap);
  });

  /** Số tiền khách phải trả sau khi áp voucher. */
  previewPay = computed(() => this.previewEligible() - this.previewDiscount());

  /** Có bị chặn bởi trần giảm tối đa không. */
  previewCapped = computed(() => {
    if (!this.isPercentType()) return false;
    const eligible = this.previewEligible();
    const value = Number(this.voucherForm.get('discountPercent')?.value) || 0;
    const cap = Number(this.voucherForm.get('maxDiscountAmount')?.value) || Infinity;
    return value > 0 && Math.round((eligible * value) / 100) > cap;
  });

  /** Chưa đạt đơn tối thiểu. */
  previewBelowMin = computed(() => {
    const minOrder = Number(this.voucherForm.get('minOrderValue')?.value) || 0;
    return this.previewEligible() < minOrder;
  });

  /** Ghi chú giải thích cách tính (mockup `vdNote`). */
  previewNote = computed(() => {
    const eligible = this.previewEligible();
    const minOrder = Number(this.voucherForm.get('minOrderValue')?.value) || 0;
    if (this.previewBelowMin()) {
      return `Chưa đủ điều kiện: tiền hàng thuộc phạm vi ${this.money(eligible)} < đơn tối thiểu ${this.money(minOrder)}. Điều kiện xét trên tiền hàng khớp phạm vi, không phải tổng giỏ.`;
    }
    if (this.previewCapped()) {
      const cap = Number(this.voucherForm.get('maxDiscountAmount')?.value) || 0;
      return `Đã chạm trần giảm tối đa ${this.money(cap)}.`;
    }
    return 'Voucher trừ một lần cho cả đơn — mua thêm máy vẫn chỉ giảm đúng mức này.';
  });

  previewScopeNote = computed(() =>
    this.scopeType() === 'ALL'
      ? 'Phạm vi toàn bộ đơn → tiền hàng được giảm là cả giỏ sau khuyến mại.'
      : `Phạm vi ${this.scopeLabel()} → chỉ tính trên tiền hàng khớp phạm vi.`,
  );

  scopeLabel(): string {
    return {
      ALL: 'toàn bộ đơn',
      CATEGORY: 'danh mục',
      BRAND: 'thương hiệu',
      PRODUCT: 'sản phẩm',
    }[this.scopeType()];
  }

  money(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  ngOnInit(): void {
    this.loadScopeOptions();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.voucherId.set(idParam);
      this.loadVoucher();
    } else {
      this.applyDuplicateData();
    }
  }

  /** Nhân bản: form tạo mới nhưng điền sẵn dữ liệu voucher được chọn. */
  private applyDuplicateData(): void {
    const source = (history.state as { duplicateFrom?: VoucherResponse })?.duplicateFrom;
    if (!source) return;
    this.patchForm(source);
    // Mã phải khác — BE chặn trùng mã.
    this.voucherForm.get('code')?.setValue('');
    this.voucherId.set('');
  }

  /** Danh mục + hãng cho picker phạm vi. */
  private loadScopeOptions(): void {
    this.categoryService.list().subscribe({
      next: (categories) => this.categories.set(categories ?? []),
      error: () => this.categories.set([]),
    });
    this.productService.getProducts().subscribe({
      next: (products) => {
        const factories = Array.from(
          new Set((products ?? []).map((p) => p.factory).filter((f) => !!f)),
        ).sort();
        this.brands.set(factories);
      },
      error: () => this.brands.set([]),
    });
  }

  // Gọi từ (change) của radio discountType. Khi user đổi loại giảm giá
  // (percent/amount) phải xoá giá trị trường số đối diện, nếu không
  // discountXorValidator sẽ thấy CẢ 2 trường cùng có giá trị và báo lỗi
  // "Chỉ được chọn một loại giảm giá" mãi không tắt.
  // Chỉ chạy khi user tương tác thật sự (không bắn lúc load dữ liệu cũ).
  onDiscountTypeChange(type: 'percent' | 'amount'): void {
    const otherControl =
      type === 'percent'
        ? this.voucherForm.get('discountAmount')
        : this.voucherForm.get('discountPercent');
    otherControl?.setValue(null, { emitEvent: false });

    // Trần giảm chỉ có nghĩa với kiểu phần trăm. Đổi sang kiểu số tiền thì xoá
    // luôn giá trị đã nhập — ô bị ẩn nên admin không thấy để sửa, giữ lại sẽ
    // gửi lên BE một trần mồ côi.
    if (type === 'amount') {
      this.voucherForm.get('maxDiscountAmount')?.setValue(null, { emitEvent: false });
    }

    this.voucherForm.updateValueAndValidity({ emitEvent: false });
  }

  loadVoucher(): void {
    if (!this.voucherId()) return;

    this.isLoading.set(true);
    this.voucherService.getVoucherById(this.voucherId()).subscribe({
      next: (voucher: VoucherResponse) => {
        this.patchForm(voucher);
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/admin/vouchers']);
        this.isLoading.set(false);
      },
    });
  }

  patchForm(voucher: VoucherResponse): void {
    const discountType = voucher.discountPercent !== null ? 'percent' : 'amount';
    this.voucherForm.patchValue({
      code: voucher.code,
      title: voucher.title ?? '',
      description: voucher.description ?? '',
      discountType,
      discountPercent: voucher.discountPercent,
      discountAmount: voucher.discountAmount,
      // datetime-local cần 'YYYY-MM-DDTHH:mm'
      startDate: voucher.startDate ? voucher.startDate.slice(0, 16) : '',
      expiryDate: voucher.expiryDate ? voucher.expiryDate.slice(0, 16) : '',
      usageLimit: voucher.usageLimit,
      minOrderValue: voucher.minOrderValue,
      maxDiscountAmount: voucher.maxDiscountAmount,
      perUserLimit: voucher.perUserLimit,
      voucherType: voucher.voucherType ?? 'PUBLIC',
      active: voucher.active,
    });
    this.scopeType.set(voucher.scopeType ?? 'ALL');
    this.scopeValues.set(voucher.scopeValues ?? []);

    this.existingImage.set(voucher.image ?? null);
    this.imageRemoved.set(false);
  }

  /** Đổi loại phạm vi từ app-scope-picker — xoá lựa chọn cũ cho khỏi lẫn. */
  onScopeKindChange(kind: ScopeType): void {
    this.scopeType.set(kind);
    this.scopeValues.set([]);
  }

  // Nhận file từ app-image-upload (file mới hoặc null khi hủy file mới)
  onImageFileChange(file: File | null): void {
    this.imageFile.set(file);
    if (file) {
      this.imageRemoved.set(false);
    }
  }

  onSubmit(): void {
    if (this.voucherForm.invalid) {
      this.markFormGroupTouched(this.voucherForm);
      this.notification.warn('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (this.needsAssignees() && this.assigneeIds().length === 0) {
      this.notification.warn('Vui lòng chọn ít nhất một khách để phát voucher');
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.voucherForm.value;
    const isPercent = formValue.discountType === 'percent';

    // File ảnh nằm TRONG data (inputFile), khớp backend @ModelAttribute + MultipartFile inputFile.
    // buildFormData trong voucher.service sẽ append đúng field + chuyển expiryDate sang ISO.
    const baseData: VoucherCreationRequest = {
      code: formValue.code,
      title: formValue.title?.trim() || null,
      description: formValue.description?.trim() || null,
      startDate: formValue.startDate || undefined,
      expiryDate: formValue.expiryDate || undefined,
      usageLimit: formValue.usageLimit,
      // G9: field mở rộng Sprint 1 — null/'' = không giới hạn (P3).
      minOrderValue: formValue.minOrderValue ?? null,
      maxDiscountAmount: formValue.maxDiscountAmount ?? null,
      perUserLimit: formValue.perUserLimit ?? null,
      scopeType: this.scopeType(),
      scopeValues: this.scopeType() === 'ALL' ? [] : this.scopeValues(),
      voucherType: formValue.voucherType ?? 'PUBLIC',
      inputFile: this.imageFile() ?? undefined,
      imageUrl: formValue.imageUrl?.trim() || undefined,
      ...(isPercent
        ? { discountPercent: formValue.discountPercent || null, discountAmount: null }
        : { discountAmount: formValue.discountAmount || null, discountPercent: null }),
    };

    if (this.isEditMode() && this.voucherId()) {
      const updateData: VoucherUpdateRequest = {
        ...baseData,
        active: formValue.active ?? true,
        removeImage: this.imageRemoved(),
      };
      this.voucherService.updateVoucher(this.voucherId(), updateData).subscribe({
        next: (saved) => {
          // Voucher đã tồn tại thì phát thêm cho khách vừa chọn (nếu có).
          this.assignIfNeeded(saved.id, () => {
            this.notification.success('Cập nhật voucher thành công');
            this.router.navigate(['/admin/vouchers']);
          });
        },
        error: () => this.isSubmitting.set(false),
      });
    } else {
      this.voucherService.createVoucher(baseData).subscribe({
        next: (saved) => {
          this.assignIfNeeded(saved.id, () => {
            this.notification.success('Tạo voucher thành công');
            this.router.navigate(['/admin/vouchers']);
          });
        },
        error: () => this.isSubmitting.set(false),
      });
    }
  }

  /**
   * Phát voucher cho khách đã chọn rồi chạy `onDone`.
   *
   * <p>
   * Voucher phải lưu xong mới có id để phát, nên việc phát nằm sau bước lưu.
   * Lỗi ở bước phát KHÔNG chặn điều hướng — voucher đã tạo thành công rồi, báo
   * lỗi rồi bắt admin làm lại từ đầu là sai.
   */
  private assignIfNeeded(voucherId: string, onDone: () => void): void {
    const userIds = this.assigneeIds();
    if (!this.needsAssignees() || userIds.length === 0) {
      this.isSubmitting.set(false);
      onDone();
      return;
    }
    this.voucherService.assignVoucher(voucherId, userIds).subscribe({
      next: (issued) => {
        this.isSubmitting.set(false);
        this.notification.success(`Đã phát voucher cho ${issued} khách`);
        onDone();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.notification.error(this.notification.extractError(error));
        onDone();
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/vouchers']);
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
    return this.voucherForm.controls;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.voucherForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }

  hasFormError(errorName: string): boolean {
    return (this.voucherForm.touched && this.voucherForm.hasError(errorName)) ?? false;
  }
}
