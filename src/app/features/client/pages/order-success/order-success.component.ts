import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

/** Trang xác nhận đặt hàng thành công — đọc mã đơn từ query param. */
@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      <div
        class="w-21 h-21 mx-auto mb-5 w-[84px] h-[84px] rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/30"
      >
        <span class="text-4xl text-green-600 dark:text-green-400">✓</span>
      </div>

      <h1 class="text-2xl font-bold mb-2">Đặt hàng thành công!</h1>
      @if (orderCode()) {
        <p class="font-mono text-lg text-primary-600 dark:text-primary-400 mb-3">
          #{{ orderCode() }}
        </p>
      }
      <p class="text-slate-500 dark:text-slate-400 mb-8">
        Cảm ơn bạn đã mua sắm tại LaptopShop. Chúng tôi sẽ liên hệ xác nhận đơn trong thời gian sớm
        nhất.
      </p>

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
export class OrderSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly orderCode = signal('');
  readonly orderId = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.orderCode.set(params.get('code') ?? '');
    this.orderId.set(params.get('id') ?? '');
  }
}
