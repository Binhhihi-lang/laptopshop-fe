import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FlashSaleResponse } from '@core/models/flash-sale.model';

/**
 * Banner flash sale trên trang chủ (§0.5): tên phiên + đồng hồ đếm ngược +
 * progress "Đã bán x/y" + link sang trang /flash-sale.
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
        class="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 overflow-hidden"
        aria-label="Flash sale đang diễn ra"
      >
        <div class="flex flex-col sm:flex-row items-stretch">
          <!-- Cột nhận diện -->
          <div
            class="shrink-0 flex items-center gap-3 px-4 py-3 bg-rose-600 text-white sm:w-[210px]"
          >
            <mat-icon class="!w-7 !h-7 !text-[28px] !leading-none">bolt</mat-icon>
            <div class="leading-tight">
              <b class="block text-sm font-bold uppercase tracking-wide">Flash Sale</b>
              <span class="text-xs text-rose-100 line-clamp-1">{{ s.name }}</span>
            </div>
          </div>

          <!-- Đồng hồ đếm ngược -->
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Kết thúc sau
            </span>
            <div class="flex items-center gap-1" role="timer" aria-live="off">
              <span class="countdown-box">{{ countdown().hours }}</span>
              <span class="text-rose-600 dark:text-rose-400 font-bold">:</span>
              <span class="countdown-box">{{ countdown().minutes }}</span>
              <span class="text-rose-600 dark:text-rose-400 font-bold">:</span>
              <span class="countdown-box">{{ countdown().seconds }}</span>
            </div>
          </div>

          <!-- Progress + link -->
          <div class="flex-1 flex items-center justify-between gap-4 px-4 py-3">
            <div class="flex-1 min-w-0 max-w-[320px]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-600 dark:text-slate-300">Đã bán</span>
                <span class="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                  {{ sold() }}/{{ totalStock() }}
                </span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-rose-200 dark:bg-rose-900/60 overflow-hidden">
                <div
                  class="h-full rounded-full bg-rose-600 transition-all"
                  [style.width.%]="soldPercent()"
                ></div>
              </div>
            </div>

            <a
              routerLink="/flash-sale"
              class="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:underline whitespace-nowrap"
            >
              Xem tất cả
              <mat-icon class="!w-4 !h-4 !text-[18px] !leading-none">arrow_forward</mat-icon>
            </a>
          </div>
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .countdown-box {
        min-width: 2ch;
        padding: 0.25rem 0.4rem;
        border-radius: 0.375rem;
        background: rgb(255 255 255);
        color: rgb(225 29 72);
        font-family: ui-monospace, monospace;
        font-weight: 700;
        font-size: 0.875rem;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      :host-context(.dark) .countdown-box {
        background: rgb(15 23 42);
        color: rgb(251 113 133);
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

  /** Tổng kho của cả phiên — cộng từ các item BE trả kèm. */
  totalStock = computed(() =>
    (this.sale()?.items ?? []).reduce((sum, i) => sum + (i.flashStock ?? 0), 0),
  );

  sold = computed(() =>
    (this.sale()?.items ?? []).reduce((sum, i) => sum + (i.soldInFlash ?? 0), 0),
  );

  soldPercent = computed(() => {
    const total = this.totalStock();
    return total <= 0 ? 0 : Math.min(100, Math.round((this.sold() / total) * 100));
  });
}
