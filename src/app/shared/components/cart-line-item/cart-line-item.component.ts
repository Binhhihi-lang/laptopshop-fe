import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriceComponent } from '../price/price.component';
import { QtyStepperComponent } from '../qty-stepper/qty-stepper.component';
import { CartItem } from '@core/models/cart.model';

/** 1 dòng sản phẩm trong giỏ: ảnh + tên + stepper + thành tiền + xóa. */
@Component({
  selector: 'app-cart-line-item',
  standalone: true,
  imports: [CommonModule, PriceComponent, QtyStepperComponent],
  template: `
    <div class="flex gap-4 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      <img
        [src]="item().productImage"
        [alt]="item().productName"
        class="w-[88px] h-[88px] rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
      />

      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">
          {{ item().productName }}
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ item().factory }}</p>
        <div class="mt-2">
          <app-price [price]="item().price" [originalPrice]="item().originalPrice" />
        </div>
      </div>

      <div class="flex flex-col items-end justify-between">
        <span class="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {{ format(item().lineTotal) }}
        </span>
        <div class="flex items-center gap-2">
          <app-qty-stepper
            [value]="item().quantity"
            [max]="item().availableQuantity"
            (changeValue)="quantityChange.emit($event)"
          />
          <button
            type="button"
            class="text-slate-400 hover:text-rose-500 p-1"
            (click)="remove.emit()"
            aria-label="Xóa sản phẩm"
          >
            🗑
          </button>
        </div>
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
export class CartLineItemComponent {
  item = input.required<CartItem>();
  quantityChange = output<number>();
  remove = output<void>();

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
