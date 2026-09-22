import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import {
  OrderSummary,
  OrderStatus,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from '@core/models/order.model';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  SHIPPING: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

/** Thẻ đơn hàng trong danh sách "Đơn hàng của tôi". */
@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div
      class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
    >
      <div class="flex items-center justify-between flex-wrap gap-2">
        <span class="font-mono font-semibold">#{{ order().orderCode }}</span>
        <span class="text-sm text-slate-500 dark:text-slate-400">{{
          order().orderDate | date: 'dd/MM/yyyy'
        }}</span>
        <app-badge [label]="statusLabel()" [variant]="statusVariant()" />
        @if (order().paymentMethod === 'VNPAY') {
          <app-badge [label]="payStatusLabel()" [variant]="payStatusVariant()" />
        }
      </div>

      <div class="flex items-center gap-3 mt-3">
        <img
          [src]="order().firstProductImage"
          [alt]="order().firstProductName"
          class="w-14 h-14 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ order().firstProductName }}</p>
          <p class="text-xs text-slate-500 mt-0.5">
            {{ order().distinctItemCount }} sản phẩm · {{ paymentLabel() }}
          </p>
        </div>
        <div class="text-right">
          <span class="text-xs text-slate-500 block">Tổng cộng</span>
          <span class="font-mono font-bold text-primary-600 dark:text-primary-400 tabular-nums">
            {{ format(order().totalPrice) }}
          </span>
        </div>
      </div>

      <div class="flex justify-end mt-3">
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          (click)="viewDetail.emit()"
        >
          Xem chi tiết
        </button>
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
export class OrderCardComponent {
  order = input.required<OrderSummary>();
  viewDetail = output<void>();

  statusLabel = computed(() => STATUS_LABEL[this.order().status]);
  statusVariant = computed(() => STATUS_VARIANT[this.order().status]);
  paymentLabel = computed(() =>
    this.order().paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'VNPay',
  );
  /** Đơn VNPay hiện thêm trạng thái trả tiền để khách biết còn nợ hay không. */
  payStatusLabel = computed(() => PAYMENT_STATUS_LABEL[this.order().paymentStatus]);
  payStatusVariant = computed(() => PAYMENT_STATUS_VARIANT[this.order().paymentStatus]);

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
