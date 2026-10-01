import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PriceComponent } from '../price/price.component';
import { PromoBadgeComponent } from '../promo-badge/promo-badge.component';
import { ProductResponse } from '@core/models/product.model';

/** Card sản phẩm — đơn vị lặp nhiều nhất storefront, CẤM copy markup. */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, PriceComponent, PromoBadgeComponent],
  template: `
    <a
      [routerLink]="['/products', product().code]"
      class="group block rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 overflow-hidden hover:shadow-md hover:border-primary-500 transition-all"
    >
      <div class="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
        @if (product().image) {
          <img
            [src]="product().image"
            [alt]="product().name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
            loading="lazy"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center text-slate-400">
            <span class="text-6xl">💻</span>
          </div>
        }
        @if (isSoldOut()) {
          <app-promo-badge variant="sold-out" />
          <div class="absolute inset-0 bg-white/60 dark:bg-slate-900/60"></div>
        } @else if (hasFlash()) {
          <!-- D25: flash thắng promotion — chỉ hiện MỘT badge giá -->
          <app-promo-badge variant="flash" [price]="product().flashPrice!" />
        } @else if (onSale()) {
          <app-promo-badge
            variant="sale"
            [price]="product().price"
            [originalPrice]="product().originalPrice!"
          />
        }
      </div>

      <div class="p-3">
        <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
          {{ product().factory || product().categoryName }}
        </p>
        <h3
          class="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[2.5rem]"
        >
          {{ product().name }}
        </h3>
        <div class="mt-2">
          @if (hasFlash()) {
            <!-- Giá flash đứng trước, giá thường gạch ngang phía sau (§0.5) -->
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {{ formatPrice(product().flashPrice!) }}
              </span>
              <span class="text-sm text-slate-400 line-through tabular-nums">
                {{ formatPrice(product().price) }}
              </span>
            </div>
          } @else {
            <app-price [price]="product().price" [originalPrice]="product().originalPrice" />
          }
        </div>

        <!-- Thanh tiến độ "Đã bán x/y" — chỉ khi có phiên flash -->
        @if (hasFlash() && flashPercent() !== null) {
          <div class="mt-2">
            <div class="h-1.5 w-full rounded-full bg-rose-100 dark:bg-rose-950/50 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                [class]="flashPercent()! >= 80 ? 'bg-rose-600' : 'bg-rose-400'"
                [style.width.%]="flashPercent()"
              ></div>
            </div>
            <p class="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
              Đã bán {{ product().flashSold ?? 0 }}/{{ product().flashStock ?? 0 }}
            </p>
          </div>
        }

        @if (showSoldCount() && !hasFlash()) {
          <p class="text-xs text-slate-500 mt-1">Đã bán {{ product().sold }}</p>
        }
      </div>
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProductCardComponent {
  product = input.required<ProductResponse>();
  showSoldCount = input<boolean>(false);

  isSoldOut = computed(() => (this.product().quantity ?? 0) <= 0);

  /**
   * P10: tương thích ngược — không có `flashPrice` thì card render y như cũ.
   * Hết kho phiên cũng coi như không có flash (BE cũng bỏ khỏi resolvePriceMap).
   */
  hasFlash = computed(() => {
    const p = this.product();
    return (
      p.flashPrice != null &&
      p.flashPrice > 0 &&
      (p.flashStock == null || (p.flashSold ?? 0) < p.flashStock)
    );
  });

  onSale = computed(
    () =>
      this.product().originalPrice != null && this.product().originalPrice! > this.product().price,
  );

  /** % đã bán của kho phiên; null nếu không có kho để tính. */
  flashPercent = computed(() => {
    const p = this.product();
    if (p.flashStock == null || p.flashStock <= 0) {
      return null;
    }
    return Math.min(100, Math.round(((p.flashSold ?? 0) / p.flashStock) * 100));
  });

  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
