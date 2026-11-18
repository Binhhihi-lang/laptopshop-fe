import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { switchMap, tap } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { NotificationService } from '@core/services/notification.service';
import { ButtonComponent, FormFieldComponent, InputComponent } from '@shared/components/client-components';

/** Xác nhận mật khẩu phải khớp — kiểm tra ở FE, BE không nhận trường này. */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

/**
 * Đăng ký tài khoản customer. BE tự gán role CUSTOMER và `active=true`, nhưng
 * chỉ trả UserResponse (không kèm token) — nên FE đăng ký xong phải gọi
 * login ngay để vào trang chủ ở trạng thái đã đăng nhập.
 */
@Component({
  selector: 'app-client-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class ClientRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(ClientAuthService);
  private readonly cartService = inject(ClientCartService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly form: FormGroup = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  get fullNameControl() {
    return this.form.get('fullName');
  }
  get emailControl() {
    return this.form.get('email');
  }
  get passwordControl() {
    return this.form.get('password');
  }
  get confirmPasswordControl() {
    return this.form.get('confirmPassword');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const v = this.form.value;
    // Cờ phân biệt "tạo tài khoản lỗi" với "tạo xong nhưng tự đăng nhập lỗi"
    // để báo đúng việc khách cần làm tiếp.
    let registered = false;
    this.auth
      .register({
        fullName: v.fullName,
        email: v.email,
        password: v.password,
      })
      .pipe(
        tap(() => {
          registered = true;
        }),
        switchMap(() => this.auth.login({ email: v.email, password: v.password })),
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notification.success('Đăng ký thành công. Chào mừng bạn đến với LaptopShop!');
          this.mergeGuestCartAndGo();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (registered) {
            this.notification.warn('Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.');
            this.router.navigateByUrl('/login');
            return;
          }
          const message = err?.error?.message || 'Đăng ký thất bại, vui lòng thử lại';
          this.notification.error(message);
        },
      });
  }

  /** Gộp giỏ guest (nếu có) rồi vào trang chủ — giống luồng đăng nhập. */
  private mergeGuestCartAndGo(): void {
    const goHome = () => this.router.navigateByUrl('/');
    const guestItems = this.cartService.getGuestCart();
    if (guestItems.length === 0) {
      goHome();
      return;
    }
    this.cartService.mergeGuestCart({ items: guestItems }).subscribe({
      next: () => goHome(),
      error: () => goHome(),
    });
  }
}
