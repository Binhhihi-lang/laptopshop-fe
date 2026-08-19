import { Component, OnInit, signal, computed, inject } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { CouponService } from '@core/services/coupon.service';
import {
  CouponResponse,
  CouponCreationRequest,
  CouponUpdateRequest,
} from '@core/models/coupon.model';

// Shared components
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';

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
  selector: 'app-coupon-form',
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
  ],
  templateUrl: './coupon-form.component.html',
  styleUrl: './coupon-form.component.css',
})
export class CouponFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly couponService = inject(CouponService);
  private readonly snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  isSubmitting = signal(false);
  imageFile = signal<File | null>(null);
  existingImage = signal<string | null>(null);
  imageRemoved = signal(false);

  couponId = signal<string>('');

  couponForm: FormGroup = this.fb.group(
    {
      code: ['', [Validators.required, Validators.maxLength(50)]],
      discountType: ['percent', [Validators.required]],
      discountPercent: [null, [Validators.min(1), Validators.max(100)]],
      discountAmount: [null, [Validators.min(1)]],
      expiryDate: [''],
      usageLimit: [0, [Validators.min(0)]],
      active: [true],
    },
    { validators: discountXorValidator },
  );

  isEditMode = computed(() => !!this.couponId());
  pageTitle = computed(() => (this.isEditMode() ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'));
  pageSubtitle = computed(() =>
    this.isEditMode() ? 'Cập nhật thông tin mã giảm giá' : 'Điền thông tin để tạo mã giảm giá mới',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Tạo mã'));
  submitButtonIcon = computed(() => (this.isEditMode() ? 'save' : 'add'));

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.couponId.set(idParam);
      this.loadCoupon();
    }
  }

  // Gọi từ (change) của radio discountType. Khi user đổi loại giảm giá
  // (percent/amount) phải xoá giá trị trường số đối diện, nếu không
  // discountXorValidator sẽ thấy CẢ 2 trường cùng có giá trị và báo lỗi
  // "Chỉ được chọn một loại giảm giá" mãi không tắt.
  // Chỉ chạy khi user tương tác thật sự (không bắn lúc load dữ liệu cũ).
  onDiscountTypeChange(type: 'percent' | 'amount'): void {
    const otherControl =
      type === 'percent'
        ? this.couponForm.get('discountAmount')
        : this.couponForm.get('discountPercent');
    otherControl?.setValue(null, { emitEvent: false });
    this.couponForm.updateValueAndValidity({ emitEvent: false });
  }

  loadCoupon(): void {
    if (!this.couponId()) return;

    this.isLoading.set(true);
    this.couponService.getCouponById(this.couponId()).subscribe({
      next: (coupon: CouponResponse) => {
        this.patchForm(coupon);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Không thể tải thông tin mã giảm giá', 'Đóng', { duration: 3000 });
        this.router.navigate(['/admin/coupons']);
        this.isLoading.set(false);
      },
    });
  }

  patchForm(coupon: CouponResponse): void {
    const discountType = coupon.discountPercent !== null ? 'percent' : 'amount';
    this.couponForm.patchValue({
      code: coupon.code,
      discountType,
      discountPercent: coupon.discountPercent,
      discountAmount: coupon.discountAmount,
      expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '',
      usageLimit: coupon.usageLimit,
      active: coupon.active,
    });

    this.existingImage.set(coupon.image ?? null);
    this.imageRemoved.set(false);
  }

  // Nhận file từ app-image-upload (file mới hoặc null khi hủy file mới)
  onImageFileChange(file: File | null): void {
    this.imageFile.set(file);
    if (file) {
      this.imageRemoved.set(false);
    }
  }

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.markFormGroupTouched(this.couponForm);
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.couponForm.value;
    const isPercent = formValue.discountType === 'percent';

    // File ảnh nằm TRONG data (inputFile), khớp backend @ModelAttribute + MultipartFile inputFile.
    // buildFormData trong coupon.service sẽ append đúng field + chuyển expiryDate sang ISO.
    const baseData: CouponCreationRequest = {
      code: formValue.code,
      expiryDate: formValue.expiryDate || undefined,
      usageLimit: formValue.usageLimit,
      inputFile: this.imageFile() ?? undefined,
      ...(isPercent
        ? { discountPercent: formValue.discountPercent || null, discountAmount: null }
        : { discountAmount: formValue.discountAmount || null, discountPercent: null }),
    };

    if (this.isEditMode() && this.couponId()) {
      const updateData: CouponUpdateRequest = {
        ...baseData,
        active: formValue.active ?? true,
        removeImage: this.imageRemoved(),
      };
      this.couponService.updateCoupon(this.couponId(), updateData).subscribe({
        next: () => {
          this.snackBar.open('Cập nhật mã giảm giá thành công', 'Đóng', { duration: 3000 });
          this.isSubmitting.set(false);
          this.router.navigate(['/admin/coupons']);
        },
        error: (error) => {
          this.snackBar.open(error.error?.message || 'Cập nhật thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.couponService.createCoupon(baseData).subscribe({
        next: () => {
          this.snackBar.open('Tạo mã giảm giá thành công', 'Đóng', { duration: 3000 });
          this.isSubmitting.set(false);
          this.router.navigate(['/admin/coupons']);
        },
        error: (error) => {
          this.snackBar.open(error.error?.message || 'Tạo mã giảm giá thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/coupons']);
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
    return this.couponForm.controls;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.couponForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }

  hasFormError(errorName: string): boolean {
    return (this.couponForm.touched && this.couponForm.hasError(errorName)) ?? false;
  }
}
