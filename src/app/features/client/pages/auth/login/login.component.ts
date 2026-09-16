import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { DeviceLimitDialogService } from '@core/services/device-limit-dialog.service';
import { NotificationService } from '@core/services/notification.service';
import { DeviceLimitPayload } from '@core/models/device.model';
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
  private readonly cartService = inject(ClientCartService);
  private readonly deviceLimitDialog = inject(DeviceLimitDialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);

  /** Mã lỗi BE trả khi user đã đủ số thiết bị tối đa (ErrorCode.DEVICE_LIMIT_EXCEEDED). */
  private readonly DEVICE_LIMIT_ERROR_CODE = 1013;

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
        this.mergeGuestCartAndGo();
      },
      error: (err) => {
        // Vượt giới hạn thiết bị (code 1013): BE trả kèm danh sách thiết bị +
        // revokeTicket. Mở dialog cho user chọn máy cần đá thay vì hiện toast.
        if (err?.error?.code === this.DEVICE_LIMIT_ERROR_CODE) {
          this.handleDeviceLimit(err.error.result);
          return;
        }
        this.isSubmitting.set(false);
        const message = err?.error?.message || 'Email hoặc mật khẩu không đúng';
        this.notification.error(message);
      },
    });
  }

  /**
   * User đã đủ thiết bị: mở dialog chọn thiết bị cần đăng xuất. Nếu user xác
   * nhận, BE đá máy đó và trả luôn token -> đăng nhập tiếp như bình thường.
   */
  private handleDeviceLimit(payload: DeviceLimitPayload): void {
    if (!payload?.devices?.length || !payload.revokeTicket) {
      this.isSubmitting.set(false);
      this.notification.error('Bạn đã đăng nhập trên số thiết bị tối đa');
      return;
    }

    this.deviceLimitDialog.open(payload.devices, payload.maxSessions).subscribe({
      next: (targetDeviceId) => {
        if (!targetDeviceId) {
          // Hủy: giữ nguyên form để user tự xử lý.
          this.isSubmitting.set(false);
          return;
        }
        this.revokeAndLogin(payload.revokeTicket, targetDeviceId);
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  private revokeAndLogin(revokeTicket: string, targetDeviceId: string): void {
    this.auth.revokeDeviceAndLogin(revokeTicket, targetDeviceId).subscribe({
      next: () => {
        // Đăng xuất thiết bị cũ thành công, token mới đã được lưu vào localStorage
        // bởi handleLoginSuccess trong ClientAuthService.
        // CHỜ 1 tick để đảm bảo token được lưu hoàn toàn trước khi gọi API tiếp.
        setTimeout(() => this.mergeGuestCartAndGo(), 0);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notification.error(this.notification.extractError(err));
      },
    });
  }

  /** Gộp giỏ guest vào giỏ server rồi mới điều hướng. */
  private mergeGuestCartAndGo(): void {
    const navigate = () => {
      this.isSubmitting.set(false);
      this.notification.success('Đăng nhập thành công');
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
      this.router.navigateByUrl(returnUrl);
    };

    const guestItems = this.cartService.getGuestCart();
    if (guestItems.length === 0) {
      this.cartService.getCart().subscribe({ next: () => navigate(), error: () => navigate() });
      return;
    }

    this.cartService.mergeGuestCart({ items: guestItems }).subscribe({
      next: (cart) => {
        this.notification.success(`Đã gộp ${cart.totalItems} sản phẩm vào giỏ hàng`);
        navigate();
      },
      // Merge lỗi không nên chặn đăng nhập.
      error: () => navigate(),
    });
  }
}
