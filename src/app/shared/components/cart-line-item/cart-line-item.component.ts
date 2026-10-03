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
      class="grid grid-cols-[88px_1fr_auto] gap-4 items-center p-3.5 rounded-xl border bg-white dark:bg-slate-900"
      [class]="
        isFlash()
          ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-200 dark:ring-rose-900/40'
          : 'border-slate-200 dark:border-slate-700'
      "
    >
      <div class="relative">
        <img
          [src]="item().productImage"
          [alt]="item().productName"
          class="w-[88px] h-[88px] rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
        />
        @if (isFlash()) {
          <span
            class="absolute top-1 left-1 inline-flex items-center gap-0.5 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
          >
            <mat-icon class="!w-3 !h-3 !text-[12px] !leading-none">bolt</mat-icon>
            FLASH
          </span>
        }
      </div>

      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
          {{ item().productName }}
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ subtitle() }}</p>
        <div class="mt-1.5">
          @if (isFlash()) {
            <!-- Dòng flash: giá sốc + giá gốc gạch ngang, làm nổi bật trong giỏ -->
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {{ format(item().flashPrice!) }}
              </span>
              <span class="text-sm text-slate-400 line-through tabular-nums">
                {{ format(item().price) }}
              </span>
              <span
                class="rounded bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400"
              >
                -{{ flashPercent() }}%
              </span>
            </div>
            @if (item().flashPerUserLimit != null) {
              <p class="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                Tối đa {{ item().flashPerUserLimit }} máy/khách trong phiên
              </p>
            }
          } @else {
            <app-price [price]="item().price" [originalPrice]="item().originalPrice" />
          }
          @if (isLimitReached()) {
            <p class="mt-1.5 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none mt-0.5">info</mat-icon>
              <span>
                @if (item().flashPerUserLimit != null) {
                  Sản phẩm này chỉ được mua tối đa {{ item().flashPerUserLimit }} máy/khách với giá sốc —
                  dòng này tính giá thường.
                } @else {
                  Dòng này vượt suất giá sốc còn lại của phiên — tính giá thường.
                }
              </span>
            </p>
          }
        </div>
      </div>

      <div class="flex flex-col items-end gap-2.5">
        <span class="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {{ format(item().lineTotal) }}
        </span>
        <div class="flex items-center gap-2">
          <app-qty-stepper
            [value]="item().quantity"
            [max]="maxQty()"
            (changeValue)="onQtyChange($event)"
          />
          <!-- 36px cho cân với stepper 34px; mat-icon mặc định 24px + line-height 1.5 nên
               phải ép cả font-size lẫn line-height, chỉ ép w/h là glyph bị lệch trong nút. -->
          <button
            type="button"
            class="w-9 h-9 shrink-0 rounded-lg grid place-items-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 transition-colors"
            (click)="remove.emit()"
            aria-label="Xóa sản phẩm khỏi giỏ"
          >
            <mat-icon class="!w-6 !h-6 !text-xl !leading-none">delete_outline</mat-icon>
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
  /** Bấm + vượt trần phiên → cha hiện toast (component này không có service). */
  limitWarning = output<number>();

  /** Dòng này đang hưởng giá flash? (BE gắn `flashPrice` khi dòng trong phiên) */
  isFlash(): boolean {
    const p = this.item().flashPrice;
    return p != null && p > 0;
  }

  /** Có phiên nhưng khách đã dùng hết suất → dòng về giá thường (BE bật cờ). */
  isLimitReached(): boolean {
    return this.item().flashLimitReached === true;
  }

  /**
   * Trần số lượng cho nút +/-: nhỏ hơn giữa tồn kho và trần mỗi khách của phiên
   * flash. Vượt trần phiên thì BE chặn (4316), nên khoá nút ngay tại đây để khách
   * không bấm vào rồi mới nhận lỗi.
   */
  maxQty(): number {
    const stock = this.item().availableQuantity;
    const limit = this.item().flashPerUserLimit;
    return limit != null && limit > 0 ? Math.min(stock, limit) : stock;
  }

  /** Vượt trần phiên → báo ngay thay vì gửi request rồi nhận lỗi từ BE. */
  onQtyChange(qty: number): void {
    if (qty > this.maxQty()) {
      this.limitWarning.emit(this.item().flashPerUserLimit ?? this.maxQty());
      return;
    }
    this.quantityChange.emit(qty);
  }

  /** % giảm của dòng flash so với giá thường. */
  flashPercent(): number {
    const p = this.item();
    const base = p.price;
    if (!p.flashPrice || !base || base <= 0) {
      return 0;
    }
    return Math.max(0, Math.round((1 - p.flashPrice / base) * 100));
  }

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
