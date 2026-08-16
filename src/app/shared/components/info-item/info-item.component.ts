import { Component, input, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type InfoItemFormat = 'text' | 'number' | 'money';

/**
 * InfoItem hiển thị một cặp label - value theo kiểu definition list.
 * Hỗ trợ format số/tiền với dấu phân cách hàng nghìn (vi-VN),
 * font mono cho mã (ID, mã sản phẩm...), và empty state khi value rỗng.
 */
@Component({
  selector: 'app-info-item',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div
      class="flex flex-col gap-1 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
    >
      <dt class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 shrink-0">
        @if (icon()) {
          <mat-icon class="w-4 h-4 shrink-0">{{ icon() }}</mat-icon>
        }
        {{ label() }}
      </dt>
      <dd
        class="text-sm font-medium text-slate-900 dark:text-white text-left sm:text-right break-words min-w-0"
        [class.font-mono]="mono()"
      >
        {{ displayValue() }}
      </dd>
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
export class InfoItemComponent {
  label = input.required<string>();
  value = input<string | number | null | undefined>('');
  icon = input<string>('');
  mono = input<boolean>(false);
  format = input<InfoItemFormat>('text');
  emptyText = input<string>('—');

  displayValue = computed(() => {
    const value = this.value();
    if (value === null || value === undefined || value === '') {
      return this.emptyText();
    }
    if (this.format() === 'number') {
      return new Intl.NumberFormat('vi-VN').format(Number(value));
    }
    if (this.format() === 'money') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(Number(value));
    }
    return String(value);
  });
}
