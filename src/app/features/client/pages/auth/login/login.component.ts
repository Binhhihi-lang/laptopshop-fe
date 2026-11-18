import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { DeviceLimitDialogService } from '@core/services/device-limit-dialog.service';
import { NotificationService } from '@core/services/notification.service';
import { DeviceLimitPayload } from '@core/models/device.model';
import { ButtonComponent, FormFieldComponent, InputComponent } from '@shared/components/client-components';

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
  private readonly destroyRef = inject(DestroyRef);

  /** Mã lỗi BE trả khi user đã đủ số thiết bị tối đa (ErrorCode.DEVICE_LIMIT_EXCEEDED). */
  private readonly DEVICE_LIMIT_ERROR_CODE = 1013;

  readonly isSubmitting = signal(false);
  /** Lỗi đăng nhập hiện ngay trong form — toast ở góc màn hình bị chậm và xa chỗ nhập. */
  readonly errorMessage = signal('');
  /** Checkbox "Ghi nhớ đăng nhập" — chỉ là UI, chưa triển khai gia hạn phiên. */
  readonly rememberMe = signal(true);
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

  constructor() {
    // Người dùng sửa lại email/mật khẩu là lỗi cũ phải biến mất ngay.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set('');
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
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
        this.errorMessage.set(this.toLoginErrorMessage(err));
      },
    });
  }

  /** Chọn câu ngắn theo mã lỗi thay vì bê nguyên văn message dài của BE. */
  private toLoginErrorMessage(err: any): string {
    const code = err?.error?.code;
    if (code === 1005) {
      return 'Email hoặc mật khẩu không đúng.';
    }
    if (code === 1010) {
      return err?.error?.message || 'Tài khoản đã bị khóa.';
    }
    if (code === 9006) {
      return 'Hệ thống đang bận, vui lòng thử lại sau ít phút.';
    }
    const raw = err?.error?.message;
    return typeof raw === 'string' && raw.length > 0 && raw.length <= 90
      ? raw
      : 'Đăng nhập thất bại, vui lòng thử lại.';
  }

  /**
   * User đã đủ thiết bị: mở dialog chọn một hoặc nhiều thiết bị cần đăng xuất.
   * Nếu user xác nhận, BE đá các máy đó (cùng 1 request — vé dùng 1 lần) và trả
   * luôn token -> đăng nhập tiếp như bình thường.
   */
  private handleDeviceLimit(payload: DeviceLimitPayload): void {
    if (!payload?.devices?.length || !payload.revokeTicket) {
      this.isSubmitting.set(false);
      this.notification.error('Bạn đã đăng nhập trên số thiết bị tối đa');
      return;
    }

    this.deviceLimitDialog.open(payload.devices, payload.maxSessions).subscribe({
      next: (targetDeviceIds) => {
        if (!targetDeviceIds?.length) {
          // Hủy: giữ nguyên form để user tự xử lý.
          this.isSubmitting.set(false);
          return;
        }
        this.revokeAndLogin(payload.revokeTicket, targetDeviceIds);
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  private revokeAndLogin(revokeTicket: string, targetDeviceIds: string[]): void {
    this.auth.revokeDeviceAndLogin(revokeTicket, targetDeviceIds).subscribe({
      next: () => {
        // Token mới đã lưu vào localStorage; chờ 1 tick trước khi gọi API tiếp.
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
