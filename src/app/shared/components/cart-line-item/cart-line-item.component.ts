import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PriceComponent } from '../price/price.component';
import { QtyStepperComponent } from '../qty-stepper/qty-stepper.component';
import { CartItem } from '@core/models/cart.model';

/** 1 dòng sản phẩm trong giỏ: ảnh + tên + stepper + thành tiền + xóa. */
@Component({
  selector: 'app-cart-line-item',
  standalone: true,
  imports: [CommonModule, MatIconModule, PriceComponent, QtyStepperComponent],
  template: `
    <!-- items-center: cột phải luôn cân giữa theo chiều cao cột trái, tên dài
         2 dòng không còn làm thành tiền/stepper lệch nhau -->
    <article
      class="grid grid-cols-[88px_1fr_auto] gap-4 items-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    >
      <img
        [src]="item().productImage"
        [alt]="item().productName"
        class="w-[88px] h-[88px] rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
      />

      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
          {{ item().productName }}
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ subtitle() }}</p>
        <div class="mt-1.5">
          <app-price [price]="item().price" [originalPrice]="item().originalPrice" />
        </div>
      </div>

      <div class="flex flex-col items-end gap-2.5">
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
            class="w-[34px] h-[34px] rounded-lg grid place-items-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 transition-colors"
            (click)="remove.emit()"
            aria-label="Xóa sản phẩm khỏi giỏ"
          >
            <mat-icon class="w-4 h-4 text-base leading-none">delete_outline</mat-icon>
          </button>
        </div>
      </div>
    </article>
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

  /** Dòng phụ dưới tên: "hãng · danh mục" (thiếu vế nào thì bỏ vế đó). */
  subtitle(): string {
    return [this.item().factory, this.item().category].filter(Boolean).join(' · ');
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
