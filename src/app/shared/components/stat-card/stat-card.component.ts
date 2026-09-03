import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Thẻ KPI dùng cho Dashboard: icon + label + value + pill xu hướng
 * (tăng/x giảm). Truyền `iconClass` để chọn màu nền icon (Tailwind),
 * `trendUp`/`trendText` để hiện pill xu hướng (bỏ qua khi rỗng).
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <article
      class="card-hover card-padded group min-h-[130px] overflow-hidden"
      [attr.data-trend]="trendUp() === false ? 'down' : 'up'"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="kpi-icon p-3 rounded-xl shrink-0"
          [class]="iconClass() + ' group-hover:scale-110 transition-transform duration-200'"
        >
          <mat-icon class="w-6 h-6">{{ icon() }}</mat-icon>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-caption text-slate-500 dark:text-slate-400">{{ label() }}</p>
          <p class="text-heading-3 font-bold text-slate-900 dark:text-white tabular-nums">
            {{ value() }}
          </p>
        </div>
      </div>
      @if (trendText()) {
        <div
          class="kpi-trend mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-colors w-max"
          [class]="trendClass()"
        >
          <mat-icon class="w-3.5 h-3.5">{{ trendUp() ? 'trending_up' : 'trending_down' }}</mat-icon>
          <span>{{ trendText() }}</span>
        </div>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        /* Cho phép thẻ co theo chiều rộng cột của grid (mặc định min-width:auto
           khiến grid item từ chối co nhỏ hơn min-content → tràn ngang). */
        min-width: 0;
      }
    `,
  ],
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string>();
  icon = input<string>('');
  /** Class Tailwind cho khối icon, vd "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400". */
  iconClass = input<string>('');
  /** true = mũi tên tăng (xanh), false = mũi tên giảm (đỏ). */
  trendUp = input<boolean>(true);
  /** Text pill xu hướng; rỗng => ẩn pill. */
  trendText = input<string>('');

  trendClass(): string {
    return this.trendUp()
      ? 'bg-success-light text-success dark:bg-success-light/30 dark:text-success'
      : 'bg-danger-light text-danger dark:bg-danger-light/30 dark:text-danger';
  }
}
