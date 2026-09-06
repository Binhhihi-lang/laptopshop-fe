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
 * Trang đăng nhập storefront. Guest only — `clientGuestGuard` chặn customer
 * đã login và admin/STAFF.
 *
 * Lưu ý: dùng cùng localStorage key `access_token` với admin (xem comment
 * trong `ClientAuthService`) nên JwtInterceptor gắn header tự động. Sau khi
 * login thành công, điều hướng về `returnUrl` (query) hoặc `/`.
 */
@Component({
  selector: 'app-client-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class ClientLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get emailControl() {
    return this.form.get('email');
  }
  get passwordControl() {
    return this.form.get('password');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const { email, password } = this.form.value;
    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notification.success('Đăng nhập thành công');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message = err?.error?.message || 'Email hoặc mật khẩu không đúng';
        this.notification.error(message);
      },
    });
  }
}
