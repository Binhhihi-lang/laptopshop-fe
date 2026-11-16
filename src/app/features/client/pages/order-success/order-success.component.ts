import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Trang xác nhận đã tạo đơn — đọc mã đơn từ query param.
 * Với đơn VNPay, BE mở tab thanh toán riêng nên ở đây chỉ báo "chờ thanh toán",
 * không khẳng định đã trả tiền.
 */
@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      @if (isAwaitingVnpay()) {
        <div
          class="w-[84px] h-[84px] mx-auto mb-5 rounded-full flex items-center justify-center bg-warning-50 dark:bg-warning-900/30"
        >
          <mat-icon
            class="!w-10 !h-10 !text-4xl !leading-none text-warning-600 dark:text-warning-400"
            >schedule</mat-icon
          >
        </div>
      } @else {
        <div
          class="w-[84px] h-[84px] mx-auto mb-5 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/30"
        >
          <span class="text-4xl text-green-600 dark:text-green-400">✓</span>
        </div>
      }

      <h1 class="text-2xl font-bold mb-2">
        {{ isAwaitingVnpay() ? 'Đơn hàng đã được tạo!' : 'Đặt hàng thành công!' }}
      </h1>
      @if (orderCode()) {
        <p class="font-mono text-lg text-primary-600 dark:text-primary-400 mb-3">
          #{{ orderCode() }}
        </p>
      }
      <p class="text-slate-500 dark:text-slate-400 mb-8">
        @if (isAwaitingVnpay()) {
          Vui lòng hoàn tất thanh toán ở tab VNPay vừa mở. Đơn hàng được xác nhận ngay khi VNPay báo
          thanh toán thành công — bạn có thể đóng tab này và quay lại sau.
        } @else {
          Cảm ơn bạn đã mua sắm tại LaptopShop. Chúng tôi sẽ liên hệ xác nhận đơn trong thời gian
          sớm nhất.
        }
      </p>

      @if (isAwaitingVnpay() && vnpayRemaining() !== null) {
        @if (vnpayExpired()) {
          <p class="text-sm font-semibold text-red-600 dark:text-red-400 mb-8">
            Đã hết 30 phút giữ đơn cho lần thanh toán này — mở chi tiết đơn để thanh toán lại.
          </p>
        } @else {
          <p class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-8">
            Hạn thanh toán: còn <span class="font-mono">{{ vnpayCountdown() }}</span>
          </p>
        }
      }

      <div class="flex flex-wrap gap-3 justify-center">
        <a
          [routerLink]="['/orders', orderId()]"
          class="px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
          >Theo dõi đơn hàng</a
        >
        <a
          routerLink="/products"
          class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
          >Tiếp tục mua sắm</a
        >
      </div>
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
export class OrderSuccessComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);

  readonly orderCode = signal('');
  readonly orderId = signal('');
  /** Đơn VNPay: tiền chưa chắc đã trả, tab thanh toán đang mở ở nơi khác. */
  readonly isAwaitingVnpay = signal(false);

  /** Hạn 30 phút BE trả về cho lần thanh toán này (epoch ms, 0 = không có). */
  private readonly deadline = signal(0);
  private readonly now = signal(Date.now());
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  readonly vnpayRemaining = computed(() => {
    const deadline = this.deadline();
    if (!deadline) {
      return null;
    }
    return Math.max(0, Math.round((deadline - this.now()) / 1000));
  });

  readonly vnpayExpired = computed(() => this.vnpayRemaining() === 0);

  readonly vnpayCountdown = computed(() => {
    const seconds = this.vnpayRemaining();
    if (seconds === null) {
      return '';
    }
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.orderCode.set(params.get('code') ?? '');
    this.orderId.set(params.get('id') ?? '');
    this.isAwaitingVnpay.set(params.get('pending') === 'vnpay');
    const exp = params.get('exp');
    if (exp) {
      this.deadline.set(new Date(exp).getTime());
      this.startTicking();
    }
  }

  ngOnDestroy(): void {
    this.stopTicking();
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickTimer = setInterval(() => {
      this.now.set(Date.now());
      if (this.vnpayExpired()) {
        this.stopTicking();
      }
    }, 1000);
  }

  private stopTicking(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}
