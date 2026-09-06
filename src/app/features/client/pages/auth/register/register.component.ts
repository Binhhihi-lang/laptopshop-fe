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
 * Đăng ký tài khoản customer. BE tự gán role CUSTOMER và `active=true` qua
 * `ClientAuthController.register`. Sau khi đăng ký thành công BE trả về
 * token, FE tự đăng nhập luôn.
 */
@Component({
  selector: 'app-client-register',
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
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class ClientRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
  });

  get fullNameControl() {
    return this.form.get('fullName');
  }
  get emailControl() {
    return this.form.get('email');
  }
  get passwordControl() {
    return this.form.get('password');
  }
  get phoneControl() {
    return this.form.get('phone');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const v = this.form.value;
    this.auth
      .register({
        fullName: v.fullName,
        email: v.email,
        password: v.password,
        phone: v.phone || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notification.success('Đăng ký thành công. Chào mừng bạn đến với LaptopShop!');
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const message = err?.error?.message || 'Đăng ký thất bại, vui lòng thử lại';
          this.notification.error(message);
        },
      });
  }
}
