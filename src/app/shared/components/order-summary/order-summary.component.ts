import { Component, input } from '@angular/core';

/**
 * Tóm tắt tiền thanh toán: Tạm tính / Giảm giá / Phí ship / Tổng.
 * Dùng ở giỏ hàng, checkout và chi tiết đơn.
 */
@Component({
  selector: 'app-order-summary',
  standalone: true,
  template: `
    <div class="space-y-3">
      <div class="flex justify-between text-sm">
        <span class="text-slate-500 dark:text-slate-400">Tạm tính</span>
        <span class="font-mono tabular-nums">{{ format(subtotal()) }}</span>
      </div>
      @if (discount() > 0) {
        <div class="flex justify-between text-sm">
          <span class="text-slate-500 dark:text-slate-400">Giảm giá</span>
          <span class="font-mono tabular-nums text-green-600 dark:text-green-400"
            >- {{ format(discount()) }}</span
          >
        </div>
      }
      <div class="flex justify-between text-sm">
        <span class="text-slate-500 dark:text-slate-400">Phí vận chuyển</span>
        <span class="font-mono tabular-nums">
          @if (subtotal() === 0) {
            —
          } @else if (shippingFee() === 0) {
            <span class="text-green-600 dark:text-green-400">Miễn phí</span>
          } @else {
            {{ format(shippingFee()) }}
          }
        </span>
      </div>
      <div
        class="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700"
      >
        <span class="font-medium">Tổng cộng</span>
        <span
          class="font-mono font-bold text-lg text-primary-600 dark:text-primary-400 tabular-nums"
        >
          {{ format(total()) }}
        </span>
      </div>
      <ng-content />
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
export class OrderSummaryComponent {
  subtotal = input.required<number>();
  discount = input<number>(0);
  shippingFee = input.required<number>();
  total = input.required<number>();

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
