import { Component, input, computed } from '@angular/core';

export type PromoBadgeVariant = 'hot' | 'new' | 'sale' | 'sold-out' | 'flash';

/**
 * Nhãn nổi trên card sản phẩm: HOT / Mới / -x% / Hết hàng / FLASH SALE.
 * `sale` và `flash` tự tính % giảm (flash so với giá thường truyền vào).
 */
@Component({
  selector: 'app-promo-badge',
  standalone: true,
  template: `
    @if (label()) {
      <span
        class="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-xs font-semibold text-white"
        [class]="bgClass()"
      >
        {{ label() }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class PromoBadgeComponent {
  variant = input.required<PromoBadgeVariant>();
  price = input<number>(0);
  originalPrice = input<number>(0);

  bgClass = computed(() => {
    switch (this.variant()) {
      case 'hot':
        return 'bg-rose-500';
      case 'new':
        return 'bg-teal-500';
      case 'sale':
        return 'bg-rose-500';
      case 'flash':
        // Đậm hơn `sale` để phân biệt flash sale với giảm giá thường.
        return 'bg-rose-600';
      case 'sold-out':
        return 'bg-slate-500';
    }
  });

  label = computed(() => {
    switch (this.variant()) {
      case 'hot':
        return 'HOT';
      case 'new':
        return 'Mới';
      case 'sold-out':
        return 'Hết hàng';
      case 'sale': {
        const p = this.price();
        const o = this.originalPrice();
        if (o > p) {
          return `-${Math.round((1 - p / o) * 100)}%`;
        }
        return '';
      }
      case 'flash':
        return 'FLASH SALE';
    }
  });
}
