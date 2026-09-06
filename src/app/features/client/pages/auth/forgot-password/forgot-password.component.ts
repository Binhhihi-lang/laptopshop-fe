import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
 * Quên mật khẩu — nhập email để nhận link reset. BE luôn trả 200 dù email
 * có/không tồn tại (chống email enumeration), nên UI luôn hiển thị thông báo
 * chung chung "nếu email tồn tại".
 */
@Component({
  selector: 'app-client-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ClientForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(ClientAuthService);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly isSent = signal(false);
  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get emailControl() {
    return this.form.get('email');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.auth.forgotPassword({ email: this.form.value.email }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSent.set(true);
        this.notification.success(
          'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
        );
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message = err?.error?.message || 'Gửi yêu cầu thất bại, vui lòng thử lại';
        this.notification.error(message);
      },
    });
  }
}
