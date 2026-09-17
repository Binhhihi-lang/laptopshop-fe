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
          <app-price [price]="product().price" [originalPrice]="product().originalPrice" />
        </div>
        @if (showSoldCount()) {
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
  onSale = computed(
    () =>
      this.product().originalPrice != null && this.product().originalPrice! > this.product().price,
  );
}
