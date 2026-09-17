import { Component, input, computed } from '@angular/core';

/**
 * Hiển thị giá sản phẩm: giá hiện tại + giá gạch (nếu có giảm). Dùng chung
 * cho mọi chỗ in tiền của storefront để không copy formatPrice.
 */
@Component({
  selector: 'app-price',
  standalone: true,
  template: `
    <span class="inline-flex items-baseline gap-1.5 font-mono tabular-nums">
      <span [class]="currentClass()">{{ format(price()) }}</span>
      @if (showOriginal()) {
        <span class="text-sm text-slate-400 line-through">{{ format(originalPrice()!) }}</span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class PriceComponent {
  price = input.required<number>();
  originalPrice = input<number>();
  // base = trên card sản phẩm; lg = trang chi tiết
  size = input<'base' | 'lg'>('base');

  showOriginal = computed(
    () => this.originalPrice() != null && this.originalPrice()! > this.price(),
  );

  currentClass = computed(() => {
    const sizeClass = this.size() === 'lg' ? 'text-lg' : 'text-base';
    return `${sizeClass} font-bold text-primary-600 dark:text-primary-400`;
  });

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
