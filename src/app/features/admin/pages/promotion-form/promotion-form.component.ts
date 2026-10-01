import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { PromotionService } from '@core/services/promotion.service';
import { ClientCategoryService } from '@core/services/client-category.service';
import { ProductService } from '@core/services/product.service';
import { CategoryResponse } from '@core/models/category.model';
import {
  PromotionCreationRequest,
  PromotionDiscountType,
  PromotionResponse,
  PromotionType,
  ScopeType,
} from '@core/models/promotion.model';
import { PageHeaderComponent } from '@shared/components';
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { ScopePickerComponent } from '@shared/components/scope-picker/scope-picker.component';
import { ProductPickerComponent } from '@shared/components/product-picker/product-picker.component';

/**
 * Tạo/sửa chương trình khuyến mại (Sprint 4b).
 *
 * <p>
 * Route page (KHÔNG MatDialog) — theo `voucher-module-upgrade`: mọi form admin đã
 * chuyển sang route page để deep-link và back button hoạt động.
 */
@Component({
  selector: 'app-promotion-form',
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
    ScopePickerComponent,
    ProductPickerComponent,
  ],
  templateUrl: './promotion-form.component.html',
})
export class PromotionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly promotionService = inject(PromotionService);
  private readonly categoryService = inject(ClientCategoryService);
  private readonly notification = inject(NotificationService);
  private readonly productService = inject(ProductService);

  isLoading = signal(false);
  isSubmitting = signal(false);
  promotionId = signal<string>('');
  categories = signal<CategoryResponse[]>([]);
  /** Hãng suy từ factory của sản phẩm — BE không có bảng brand riêng. */
  brands = signal<string[]>([]);

  /** v1 chỉ có hai hình thức giảm — khớp đúng hai nhánh engine tính tiền. */
  readonly discountTypes: { value: PromotionDiscountType; label: string }[] = [
    { value: 'PERCENT', label: 'Phần trăm (%)' },
    { value: 'AMOUNT', label: 'Số tiền / máy (₫)' },
  ];

  promotionForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(255)]],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      type: ['PRODUCT_DISCOUNT' as PromotionType, [Validators.required]],
      discountType: ['PERCENT' as PromotionDiscountType, [Validators.required]],
      discountValue: [null, [Validators.required, Validators.min(1)]],
      maxDiscountAmount: [null, [Validators.min(1)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      priority: [null],
      minOrderValue: [null, [Validators.min(0)]],
      minQuantity: [null, [Validators.min(1)]],
      usageLimit: [null, [Validators.min(1)]],
      stackable: [false],
      active: [true],
    },
    { validators: dateRangeValidator },
  );

  isEditMode = computed(() => !!this.promotionId());
  pageTitle = computed(() =>
    this.isEditMode() ? 'Chỉnh sửa chương trình' : 'Tạo chương trình khuyến mại',
  );
  pageSubtitle = computed(() =>
    this.isEditMode()
      ? 'Cập nhật thông tin chương trình khuyến mại'
      : 'Điền thông tin để tạo chương trình khuyến mại mới',
  );
  /** Nhãn nút lưu trên header — khớp mockup "Lưu chương trình". */
  submitButtonLabel = computed(() => (this.isEditMode() ? 'Lưu thay đổi' : 'Lưu chương trình'));
  submitButtonIcon = computed(() => (this.isEditMode() ? 'save' : 'add'));
  // FormControl.value là thuộc tính thường — computed() đọc nó không bao giờ
  // chạy lại. Bọc valueChanges thành signal để panel xem trước cập nhật theo.
  private readonly discountTypeCtrl = toSignal(
    this.promotionForm.get('discountType')!.valueChanges,
    { initialValue: this.promotionForm.get('discountType')!.value },
  );
  private readonly discountValueCtrl = toSignal(
    this.promotionForm.get('discountValue')!.valueChanges,
    { initialValue: this.promotionForm.get('discountValue')!.value },
  );
  private readonly maxDiscountCtrl = toSignal(
    this.promotionForm.get('maxDiscountAmount')!.valueChanges,
    { initialValue: this.promotionForm.get('maxDiscountAmount')!.value },
  );
  isPercent = computed(() => this.discountTypeCtrl() === 'PERCENT');
  /** Loại phạm vi — tách khỏi FormGroup vì do app-scope-picker quản lý. */
  scopeType = signal<ScopeType>('ALL');
  /** Giá trị phạm vi đã chọn (Category.id | tên hãng | Product.id). */
  scopeValues = signal<string[]>([]);
  /** Sản phẩm loại trừ (id) — control riêng vì app-product-picker là CVA. */
  excludeControl = new FormControl<string[]>([], { nonNullable: true });
  /** Scope ALL thì không cần chọn giá trị phạm vi. */
  needsScopeValues = computed(() => this.scopeType() !== 'ALL');

  // ===== Xem trước cách tính =====
  /** Đơn giá + số máy của ví dụ minh hoạ trên panel preview. */
  readonly previewUnitPrice = 32990000;
  previewQty = signal(2);

  /** Thành tiền dòng mẫu. */
  previewLineTotal = computed(() => this.previewUnitPrice * this.previewQty());

  /** Mức giảm thô theo công thức BE (chưa áp trần). */
  private previewRawDiscount = computed(() => {
    const v = this.discountValueCtrl() ?? 0;
    if (!v) return 0;
    if (this.isPercent()) {
      return (this.previewLineTotal() * v) / 100;
    }
    // AMOUNT: giảm MỖI MÁY × số lượng (D21).
    return v * this.previewQty();
  });

  /** Trần giảm / đơn nếu admin có nhập. */
  previewCap = computed(() => this.maxDiscountCtrl() ?? null);

  /** Giảm thực tế = min(công thức, thành tiền, trần). */
  previewDiscount = computed(() => {
    const raw = this.previewRawDiscount();
    const cap = this.previewCap();
    const capped = cap && cap > 0 ? Math.min(raw, cap) : raw;
    return Math.min(capped, this.previewLineTotal());
  });

  previewPay = computed(() => this.previewLineTotal() - this.previewDiscount());

  /** Công thức bị chặn bởi trần hay không — để hiện ghi chú. */
  previewCapped = computed(() => {
    const cap = this.previewCap();
    return !!cap && cap > 0 && this.previewRawDiscount() > cap;
  });

  previewNote = computed(() => {
    if (this.previewCapped()) {
      return `Mức giảm theo công thức là ${this.format(this.previewRawDiscount())} nhưng bị chặn ở ${this.format(this.previewCap())}/đơn.`;
    }
    if (this.isPercent()) {
      const v = this.promotionForm.get('discountValue')?.value ?? 0;
      return `Phần trăm: ${v}% × thành tiền ${this.format(this.previewLineTotal())} = ${this.format(this.previewRawDiscount())}.`;
    }
    const v = this.promotionForm.get('discountValue')?.value ?? 0;
    return `Số tiền / máy: ${this.format(v)} × ${this.previewQty()} máy = ${this.format(this.previewRawDiscount())}.`;
  });

  ngOnInit(): void {
    this.loadCategories();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.promotionId.set(idParam);
      this.loadPromotion();
    } else {
      this.applyDuplicate();
    }
  }

  /**
   * Nhân bản: màn danh sách/chi tiết điều hướng sang form tạo mới kèm state.
   * Đổ sẵn dữ liệu nhưng KHÔNG set id → submit sẽ tạo chương trình mới.
   */
  private applyDuplicate(): void {
    const source = (history.state as { duplicateFrom?: PromotionResponse } | null)?.duplicateFrom;
    if (!source) return;
    this.patchForm(source);
  }

  loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => this.categories.set(categories),
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

  loadPromotion(): void {
    if (!this.promotionId()) return;
    this.isLoading.set(true);
    this.promotionService.getPromotionById(this.promotionId()).subscribe({
      next: (promo) => {
        this.patchForm(promo);
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/admin/promotions']);
        this.isLoading.set(false);
      },
    });
  }

  patchForm(promo: PromotionResponse): void {
    this.promotionForm.patchValue({
      name: promo.name,
      title: promo.title,
      description: promo.description ?? '',
      type: promo.type,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxDiscountAmount: promo.maxDiscountAmount,
      // datetime-local cần 'YYYY-MM-DDTHH:mm'
      startDate: promo.startDate ? promo.startDate.slice(0, 16) : '',
      endDate: promo.endDate ? promo.endDate.slice(0, 16) : '',
      priority: promo.priority,
      minOrderValue: promo.minOrderValue,
      minQuantity: promo.minQuantity,
      usageLimit: promo.usageLimit,
      stackable: promo.stackable,
      active: promo.active,
    });
    this.scopeType.set(promo.scopeType ?? 'ALL');
    this.scopeValues.set(promo.scopeValues ?? []);
    this.excludeControl.setValue(promo.excludeProductIds ?? []);
  }

  /** Đổi loại phạm vi từ app-scope-picker — xoá lựa chọn cũ cho khỏi lẫn. */
  onScopeKindChange(kind: ScopeType): void {
    this.scopeType.set(kind);
    this.scopeValues.set([]);
  }

  onSubmit(): void {
    if (this.promotionForm.invalid) {
      this.markFormGroupTouched(this.promotionForm);
      this.notification.warn('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    this.isSubmitting.set(true);
    const v = this.promotionForm.value;

    if (this.needsScopeValues() && this.scopeValues().length === 0) {
      this.isSubmitting.set(false);
      this.notification.warn('Vui lòng chọn giá trị cho phạm vi đã chọn');
      return;
    }

    const payload: PromotionCreationRequest = {
      name: v.name.trim(),
      title: v.title.trim(),
      description: v.description?.trim() || undefined,
      type: v.type,
      discountType: v.discountType,
      discountValue: v.discountValue,
      maxDiscountAmount: v.maxDiscountAmount ?? null,
      // BE nhận ISO datetime; datetime-local không có giây nên bù ':00'
      startDate: this.toIso(v.startDate),
      endDate: this.toIso(v.endDate),
      active: v.active ?? true,
      priority: v.priority ?? null,
      minOrderValue: v.minOrderValue ?? null,
      minQuantity: v.minQuantity ?? null,
      usageLimit: v.usageLimit ?? null,
      stackable: v.stackable ?? false,
      scopeType: this.scopeType(),
      scopeValues: this.scopeType() === 'ALL' ? [] : this.scopeValues(),
      excludeProductIds: this.excludeControl.value ?? [],
    };

    const request$ =
      this.isEditMode() && this.promotionId()
        ? this.promotionService.updatePromotion(this.promotionId(), payload)
        : this.promotionService.createPromotion(payload);

    request$.subscribe({
      next: () => {
        this.notification.success(
          this.isEditMode() ? 'Cập nhật chương trình thành công' : 'Tạo chương trình thành công',
        );
        this.isSubmitting.set(false);
        this.router.navigate(['/admin/promotions']);
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
    this.router.navigate(['/admin/promotions']);
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
    return this.promotionForm.controls;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.promotionForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }

  hasFormError(errorName: string): boolean {
    return (this.promotionForm.touched && this.promotionForm.hasError(errorName)) ?? false;
  }

  /** Tên hiển thị của kiểu giảm đang chọn — dùng cho nhãn field giá trị. */
  discountValueLabel = computed(() => (this.isPercent() ? 'Giá trị giảm (%)' : 'Giá trị giảm (₫ / máy)'));

  format(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

/** endDate phải sau startDate — chặn trước khi gửi lên BE. */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  if (!start || !end) {
    return null;
  }
  return new Date(end) > new Date(start) ? null : { dateRange: true };
}
