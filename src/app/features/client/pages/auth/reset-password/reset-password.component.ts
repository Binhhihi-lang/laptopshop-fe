import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientAuthService } from '@core/services/client-auth.service';
import { NotificationService } from '@core/services/notification.service';
import {
  ButtonComponent,
  CardComponent,
  CardHeaderComponent,
  FormFieldComponent,
  InputComponent,
} from '@shared/components';

/**
 * Đặt lại mật khẩu bằng token nhận từ email. Token đọc từ query `?token=`.
 * Sau khi đổi mật khẩu thành công, BE cũng revoke toàn bộ refresh token của
 * user đó → user phải đăng nhập lại. FE chuyển về /client/login.
 */
@Component({
  selector: 'app-client-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    FormFieldComponent,
    InputComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ClientResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(ClientAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly token = signal<string>(this.route.snapshot.queryParamMap.get('token') || '');

  readonly form: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  get newPasswordControl() {
    return this.form.get('newPassword');
  }
  get confirmPasswordControl() {
    return this.form.get('confirmPassword');
  }

  onSubmit(): void {
    if (!this.token()) {
      this.notification.error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.value.newPassword !== this.form.value.confirmPassword) {
      this.notification.error('Mật khẩu xác nhận không khớp');
      return;
    }
    this.isSubmitting.set(true);
    this.auth
      .resetPassword({ token: this.token(), newPassword: this.form.value.newPassword })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notification.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const message =
            err?.error?.message || 'Token không hợp lệ hoặc đã hết hạn, vui lòng thử lại';
          this.notification.error(message);
        },
      });
  }
}
