import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Thẻ KPI dùng cho Dashboard & Orders: icon + label + value + pill xu hướng
 * (tăng/giảm). Truyền `iconClass` để chọn màu nền icon (Tailwind),
 * `trendUp`/`trendText` để hiện pill xu hướng (bỏ qua khi rỗng).
 * Tùy chọn `unit` (hậu tố nhỏ sau số), `meter` (thanh tỉ lệ % 0–100)
 * và `caption` (text cạnh thanh). `clickable` biến thẻ thành nút lọc
 * (role=button + hover ring) — emit `cardClick`.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <article
      class="card-hover card-padded group min-h-[130px] overflow-hidden"
      [attr.data-trend]="trendUp() === false ? 'down' : 'up'"
      [class.clickable]="clickable()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? 0 : null"
      [attr.aria-label]="clickable() ? label() + ' — lọc nhanh' : null"
      (click)="onClick()"
      (keydown.enter)="onClick()"
      (keydown.space)="onClick()"
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
          <p
            class="text-heading-3 font-bold text-slate-900 dark:text-white tabular-nums break-words"
          >
            {{ value() }}
            @if (unit()) {
              <span class="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1">{{
                unit()
              }}</span>
            }
          </p>
        </div>
      </div>
      @if (meter() !== null) {
        <div class="mt-4 flex items-center gap-2.5">
          <div
            class="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            role="presentation"
          >
            <div
              class="h-full rounded-full transition-all duration-300"
              [style.width.%]="meter()"
              [class]="meterClass()"
            ></div>
          </div>
          @if (caption()) {
            <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{{
              caption()
            }}</span>
          }
        </div>
      } @else if (trendText()) {
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
      .clickable {
        cursor: pointer;
      }
      .clickable:hover,
      .clickable:focus-visible {
        border-color: rgb(59 130 246 / 0.6);
        box-shadow: var(
          --tw-shadow,
          0 4px 6px -1px rgb(15 23 42 / 0.1),
          0 2px 4px -2px rgb(15 23 42 / 0.1)
        );
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
  /** Hậu tố nhỏ sau số, vd "đơn". Rỗng => ẩn. */
  unit = input<string>('');
  /** Tỉ lệ % 0–100 cho thanh ngang dưới thẻ; null => không hiện thanh. */
  meter = input<number | null>(null);
  /** Class Tailwind màu thanh meter, vd "bg-amber-500". Mặc định primary. */
  meterClass = input<string>('bg-blue-500');
  /** Text nhỏ cạnh thanh meter, vd "2% tổng đơn". */
  caption = input<string>('');
  /** true => thẻ là nút (role=button, hover ring) — emit cardClick khi bấm. */
  clickable = input<boolean>(false);
  cardClick = output<void>();

  trendClass(): string {
    return this.trendUp()
      ? 'bg-success-light text-success dark:bg-success-light/30 dark:text-success'
      : 'bg-danger-light text-danger dark:bg-danger-light/30 dark:text-danger';
  }

  onClick(): void {
    if (this.clickable()) {
      this.cardClick.emit();
    }
  }
}
