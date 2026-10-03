import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FlashSaleItemResponse, FlashSaleResponse } from '@core/models/flash-sale.model';

/**
 * Dải flash sale trên trang chủ (§0.5): banner gradient rose→amber + tên phiên +
 * đồng hồ đếm ngược + link /flash-sale, kèm LƯỚI THẺ sản phẩm flash bên dưới
 * (ảnh, % giảm, giá sốc, thanh "Đã bán x/y") — khớp mockup promotion-client.
 *
 * <p>
 * Đồng hồ tick 1s, dọn ở `DestroyRef` để rời trang là hết leak. Qua `endAt`
 * thì phát {@code expired} để trang cha refetch (giá về thường), không tự ẩn
 * im lặng.
 */
@Component({
  selector: 'app-flash-sale-strip',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    @if (sale(); as s) {
      <section
        class="flash-strip relative overflow-hidden text-white"
        aria-label="Flash sale đang diễn ra"
      >
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <!-- Header: bolt + tên phiên + đếm ngược + link -->
          <div class="flex flex-wrap items-center gap-3.5">
            <span
              class="w-10 h-10 flex-none rounded-lg grid place-items-center bg-white/20 border border-white/35"
            >
              <mat-icon class="!w-6 !h-6 !text-[22px] !leading-none">bolt</mat-icon>
            </span>
            <div class="leading-tight">
              <div class="text-lg sm:text-xl font-extrabold tracking-tight">
                {{ s.name || 'Flash Sale' }}
              </div>
              <div class="text-xs text-white/90">Giá sốc — số lượng có hạn, nhanh tay kẻo lỡ</div>
            </div>

            <div class="flex items-center gap-2 sm:ml-auto" role="timer" aria-live="off">
              <span class="text-xs font-semibold text-white/90 whitespace-nowrap">Kết thúc sau</span>
              <div class="flex items-baseline gap-0.5 bg-black/25 rounded-md px-2.5 py-1">
                <b class="cd-num">{{ countdown().hours }}</b>
                <i class="cd-sep">:</i>
                <b class="cd-num">{{ countdown().minutes }}</b>
                <i class="cd-sep">:</i>
                <b class="cd-num">{{ countdown().seconds }}</b>
              </div>
            </div>

            <a
              routerLink="/flash-sale"
              class="inline-flex items-center gap-1.5 text-sm font-bold bg-white/15 hover:bg-white/25 border border-white/35 px-3.5 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              Xem tất cả
              <mat-icon class="!w-4 !h-4 !text-[16px] !leading-none">chevron_right</mat-icon>
            </a>
          </div>

          <!-- Lưới thẻ sản phẩm flash -->
          @if (items().length > 0) {
            <div
              class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              @for (item of items(); track item.id) {
                <a
                  [routerLink]="['/products', item.productCode]"
                  class="fcard group flex flex-col gap-2 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <div
                    class="relative aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 grid place-items-center"
                  >
                    @if (item.productImage) {
                      <img
                        [src]="item.productImage"
                        [alt]="item.productName"
                        loading="lazy"
                        class="w-full h-full object-cover"
                        [class.grayscale]="item.remainingStock <= 0"
                        [class.opacity-70]="item.remainingStock <= 0"
                      />
                    } @else {
                      <mat-icon class="!w-12 !h-12 !text-[48px] !leading-none text-slate-300 dark:text-slate-600"
                        >laptop_mac</mat-icon
                      >
                    }
                    @if (item.remainingStock > 0) {
                      <span
                        class="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                      >
                        -{{ discountPercent(item) }}%
                      </span>
                    } @else {
                      <span
                        class="absolute inset-x-0 bottom-0 bg-slate-900/80 text-white text-[10px] font-bold text-center py-1"
                      >
                        Hết suất flash
                      </span>
                    }
                  </div>

                  <div class="text-xs font-semibold leading-snug line-clamp-2 min-h-[2.6em]">
                    {{ item.productName }}
                  </div>

                  <div>
                    @if (item.remainingStock > 0) {
                      <div class="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {{ formatPrice(item.flashPrice) }}
                      </div>
                      <div class="text-xs text-slate-400 line-through tabular-nums">
                        {{ formatPrice(item.regularPrice) }}
                      </div>
                    } @else {
                      <div class="font-mono font-bold text-slate-500 tabular-nums">
                        {{ formatPrice(item.regularPrice) }}
                      </div>
                      <div class="text-xs text-slate-400">về giá thường</div>
                    }
                  </div>

                  <div>
                    <div class="h-1.5 rounded-full bg-rose-100 dark:bg-rose-950/50 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-rose-600 transition-all"
                        [style.width.%]="itemPercent(item)"
                      ></div>
                    </div>
                    <div class="text-[10px] font-semibold text-rose-600 dark:text-rose-400 text-center mt-0.5">
                      {{ item.remainingStock > 0 ? 'Đã bán ' + item.soldInFlash + '/' + flashTotal(item) : 'Đã bán hết' }}
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      /* Banner gradient rose → amber (khớp mockup --flash-grad) + vệt sáng góc phải */
      .flash-strip {
        background: linear-gradient(102deg, #e11d48 0%, #f43f5e 45%, #f59e0b 100%);
      }
      .flash-strip::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(70% 130% at 88% 0%, rgba(255, 255, 255, 0.22), transparent 62%);
      }
      .cd-num {
        font-family: ui-monospace, 'JetBrains Mono', monospace;
        font-size: 1.125rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .cd-sep {
        font-style: normal;
        font-size: 0.75rem;
        opacity: 0.75;
        font-family: ui-monospace, monospace;
      }
      /* Thẻ trắng nổi trên nền gradient — bỏ gạch chân mặc định của <a> */
      .fcard {
        text-decoration: none;
      }
    `,
  ],
})
export class FlashSaleStripComponent {
  sale = input.required<FlashSaleResponse | null>();
  /** Phát khi phiên kết thúc — trang cha nên refetch để giá về thường. */
  expired = output<void>();

  /** Tick mỗi giây; khởi tạo bằng giá trị hiện tại để không nháy 00:00:00. */
  private readonly now = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private firedExpired = false;

  constructor() {
    this.timer = setInterval(() => {
      this.now.set(Date.now());
      const s = this.sale();
      if (s && !this.firedExpired && this.now() >= new Date(s.endAt).getTime()) {
        this.firedExpired = true;
        this.expired.emit();
      }
    }, 1000);
    this.destroyRef.onDestroy(() => {
      if (this.timer !== null) {
        clearInterval(this.timer);
      }
    });
  }

  /** Sản phẩm trong phiên — BE trả kèm ở `items`. */
  items = computed<FlashSaleItemResponse[]>(() => this.sale()?.items ?? []);

  /** Đếm ngược tới `endAt`, sàn 0 — không hiện số âm. */
  countdown = computed(() => {
    const s = this.sale();
    const diff = s ? Math.max(0, new Date(s.endAt).getTime() - this.now()) : 0;
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    };
  });

  /** % giảm của một dòng so với giá thường. */
  discountPercent(item: FlashSaleItemResponse): number {
    const regular = item.regularPrice ?? 0;
    if (regular <= 0 || item.flashPrice == null) {
      return 0;
    }
    return Math.max(0, Math.round((1 - item.flashPrice / regular) * 100));
  }

  /** Tổng suất phiên của một dòng = còn lại + đã bán (để vẽ "Đã bán x/y"). */
  flashTotal(item: FlashSaleItemResponse): number {
    return (item.flashStock ?? 0) + (item.soldInFlash ?? 0);
  }

  /** % đã bán của một dòng cho thanh tiến độ. */
  itemPercent(item: FlashSaleItemResponse): number {
    const total = this.flashTotal(item);
    return total > 0 ? Math.min(100, Math.round((item.soldInFlash / total) * 100)) : 0;
  }

  formatPrice(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
