import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ClientOrderService } from '@core/services/client-order.service';
import { NotificationService } from '@core/services/notification.service';
import { ButtonComponent } from '@shared/components';

/**
 * Trang kết quả thanh toán VNPay — BE /return verify chữ ký rồi redirect
 * trình duyệt về đây kèm orderCode + status. Không bắt buộc đăng nhập để xem
 * (khách vừa rời cổng VNPay); nút "Thanh toán lại" mới cần token.
 */
@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      @if (status() === 'success') {
        <div
          class="w-[84px] h-[84px] mx-auto mb-5 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/30"
        >
          <span class="text-4xl text-green-600 dark:text-green-400">✓</span>
        </div>
        <h1 class="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
        @if (orderCode()) {
          <p class="font-mono text-lg text-primary-600 dark:text-primary-400 mb-3">
            #{{ orderCode() }}
          </p>
        }
        <p class="text-slate-500 dark:text-slate-400 mb-8">
          VNPay đã xác nhận thanh toán. Chúng tôi sẽ liên hệ xác nhận đơn trong thời gian sớm nhất.
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <a
            routerLink="/orders"
            class="px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
            >Theo dõi đơn hàng</a
          >
          <a
            routerLink="/products"
            class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
            >Tiếp tục mua sắm</a
          >
        </div>
      } @else {
        <div
          class="w-[84px] h-[84px] mx-auto mb-5 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/30"
        >
          <span class="text-4xl text-red-600 dark:text-red-400">✕</span>
        </div>
        <h1 class="text-2xl font-bold mb-2">Thanh toán chưa hoàn tất</h1>
        @if (orderCode()) {
          <p class="font-mono text-lg text-slate-500 mb-3">#{{ orderCode() }}</p>
        }
        <p class="text-slate-500 dark:text-slate-400 mb-8">
          @if (code()) {
            Giao dịch không thành công hoặc đã bị hủy (mã {{ code() }}).
          } @else {
            Giao dịch không thành công hoặc đã bị hủy.
          }
          Bạn có thể thanh toán lại ngay — đơn hàng vẫn đang được giữ.
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <app-button
            label="Thanh toán lại"
            variant="primary"
            [loading]="isRetrying()"
            (click)="retry()"
          />
          <a
            routerLink="/cart"
            class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
            >Về giỏ hàng</a
          >
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PaymentResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(ClientOrderService);
  private readonly notification = inject(NotificationService);

  readonly orderCode = signal('');
  readonly status = signal<'success' | 'failed'>('failed');
  readonly code = signal('');
  readonly isRetrying = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.orderCode.set(params.get('orderCode') ?? '');
    this.status.set(params.get('status') === 'success' ? 'success' : 'failed');
    this.code.set(params.get('code') ?? '');
  }

  /** Thanh toán lại — đơn đã tồn tại, chỉ cần tạo URL mới rồi sang cổng VNPay. */
  retry(): void {
    if (!this.orderCode()) {
      return;
    }
    this.isRetrying.set(true);
    this.orderService.createVnpayPayment({ orderCode: this.orderCode() }).subscribe({
      next: (res) => {
        window.location.href = res.paymentUrl;
      },
      error: (err) => {
        this.isRetrying.set(false);
        this.notification.error(this.notification.extractError(err));
      },
    });
  }
}
