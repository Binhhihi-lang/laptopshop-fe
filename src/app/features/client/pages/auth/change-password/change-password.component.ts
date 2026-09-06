import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientAuthService } from '@core/services/client-auth.service';
import { NotificationService } from '@core/services/notification.service';
import {
  ButtonComponent,
  CardComponent,
  FormFieldComponent,
  InputComponent,
  PageHeaderComponent,
} from '@shared/components';

/**
 * Đổi mật khẩu khi đã đăng nhập. Yêu cầu nhập mật khẩu cũ + mới. BE tự
 * revoke toàn bộ refresh token sau khi đổi → user phải đăng nhập lại.
 * Trang này dùng `clientAuthGuard` để bắt buộc đăng nhập.
 */
@Component({
  selector: 'app-client-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    FormFieldComponent,
    InputComponent,
    PageHeaderComponent,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ClientChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly form: FormGroup = this.fb.group({
    oldPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  get oldPasswordControl() {
    return this.form.get('oldPassword');
  }
  get newPasswordControl() {
    return this.form.get('newPassword');
  }
  get confirmPasswordControl() {
    return this.form.get('confirmPassword');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { oldPassword, newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      this.notification.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (oldPassword === newPassword) {
      this.notification.warn('Mật khẩu mới phải khác mật khẩu cũ');
      return;
    }
    this.isSubmitting.set(true);
    this.auth.changePassword({ oldPassword, newPassword }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notification.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
        this.auth.logout().subscribe();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message = err?.error?.message || 'Đổi mật khẩu thất bại, vui lòng thử lại';
        this.notification.error(message);
      },
    });
  }
}
