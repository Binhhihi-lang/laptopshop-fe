import { Component, OnDestroy, OnInit, input, signal } from '@angular/core';

/**
 * Popup "đang chuẩn bị cửa hàng" cho lần tải đầu.
 *
 * Backend Render free ngủ sau 15 phút: đánh thức mất 20–50s, trong lúc đó khung
 * hero trống trông như web lỗi. Popup này phủ lên trang, đếm giây để khách biết
 * hệ thống vẫn đang chạy, và biến mất khi component cha báo xong.
 *
 * <p>
 * Chỉ hiện sau `delayMs` (mặc định 1,5s): mạng bình thường tải xong trước mốc
 * này nên khách không thấy popup, đồng thời LCP không bị đo vào lớp phủ.
 */
@Component({
  selector: 'app-loading-gate',
  standalone: true,
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 backdrop-blur-sm px-4"
        role="status"
        aria-live="polite"
      >
        <div
          class="w-full max-w-[400px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-7 text-center"
        >
          <div class="mx-auto mb-4 w-14 h-14 rounded-2xl grid place-items-center bg-primary-50 dark:bg-primary-900/30">
            <svg viewBox="0 0 48 48" class="w-8 h-8" aria-hidden="true">
              <rect x="6" y="10" width="36" height="24" rx="3" fill="none" stroke="#2563eb" stroke-width="2.5" />
              <path d="M3 38h42" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" />
            </svg>
          </div>

          <h2 class="text-lg font-bold text-slate-900 dark:text-white">
            Đang chuẩn bị cửa hàng cho bạn
          </h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Lần đầu mở sau một lúc nghỉ, hệ thống cần khoảng 20–30 giây để khởi động.
            Bạn không cần tải lại trang.
          </p>

          <div class="mt-5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              class="h-full rounded-full bg-primary-600 transition-[width] duration-300 ease-out"
              [style.width.%]="progress()"
            ></div>
          </div>

          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {{ elapsed() }}s · vui lòng chờ trong giây lát
          </p>

          @if (elapsed() >= 8) {
            <button
              type="button"
              class="mt-4 text-xs font-semibold text-primary-600 dark:text-primary-400 underline"
              (click)="dismiss()"
            >
              Bỏ qua, xem phần đã tải được
            </button>
          }
        </div>
      </div>
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
export class LoadingGateComponent implements OnInit, OnDestroy {
  /** Tự đóng sau ngần này giây dù dữ liệu chưa xong. */
  static readonly MAX_SECONDS = 45;
  /** Màn hình tối đa hiện bao lâu — ước lượng dựa trên 0 → 100%. */
  private static readonly ESTIMATED_SECONDS = 30;

  /** Trễ trước khi hiện: mạng nhanh hơn mốc này thì khách không thấy popup. */
  delayMs = input<number>(1500);

  readonly visible = signal(false);
  readonly elapsed = signal(0);
  readonly progress = signal(4);

  private timer: ReturnType<typeof setInterval> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.startTimer = setTimeout(() => {
      // Dữ liệu đã về trong lúc chờ thì không hiện popup nữa.
      if (this.dismissed) {
        return;
      }
      this.visible.set(true);
      this.timer = setInterval(() => {
        const next = this.elapsed() + 1;
        this.elapsed.set(next);
        // Tiến dần tới 92% rồi đứng — không giả vờ xong khi chưa có dữ liệu.
        const pct = Math.min(92, 4 + (next / LoadingGateComponent.ESTIMATED_SECONDS) * 88);
        this.progress.set(pct);
        if (next >= LoadingGateComponent.MAX_SECONDS) {
          this.dismiss();
        }
      }, 1000);
    }, this.delayMs());
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Đóng popup — gọi từ cha khi dữ liệu đã về, hoặc từ nút "Bỏ qua". */
  dismiss(): void {
    this.dismissed = true;
    this.progress.set(100);
    this.visible.set(false);
    this.stop();
  }

  private dismissed = false;

  private stop(): void {
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
