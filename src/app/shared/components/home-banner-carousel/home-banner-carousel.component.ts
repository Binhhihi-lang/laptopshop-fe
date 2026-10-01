import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HomeBannerResponse } from '@core/models/home-banner.model';

/**
 * Carousel slide trang chủ (§0.6). Thay hero hardcode khi admin có banner.
 *
 * <p>
 * Không dùng thư viện ngoài: tự chạy autoplay bằng `setInterval`, dọn ở
 * `DestroyRef` để không leak khi rời trang. Tôn trọng
 * `prefers-reduced-motion` — người dùng đã tắt animation thì không tự chuyển
 * slide, chỉ chuyển khi bấm.
 */
@Component({
  selector: 'app-home-banner-carousel',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <section
      class="relative overflow-hidden bg-slate-900"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (focusin)="pause()"
      (focusout)="resume()"
      aria-roledescription="carousel"
      aria-label="Banner khuyến mại"
    >
      <!-- Track: trượt ngang bằng translateX -->
      <div
        class="flex transition-transform duration-500 ease-out"
        [style.transform]="'translateX(-' + currentIndex() * 100 + '%)'"
      >
        @for (banner of banners(); track banner.id; let i = $index) {
          <a
            [routerLink]="linkFor(banner)"
            [queryParams]="queryParamsFor(banner)"
            class="relative block w-full shrink-0"
            [attr.aria-hidden]="i !== currentIndex()"
            [attr.tabindex]="i === currentIndex() ? 0 : -1"
          >
            <div class="relative aspect-[16/6] sm:aspect-[16/5] lg:aspect-[16/4.5] w-full">
              @if (banner.image) {
                <img
                  [src]="banner.image"
                  [alt]="banner.title"
                  class="absolute inset-0 w-full h-full object-cover"
                  [attr.loading]="i === 0 ? 'eager' : 'lazy'"
                />
              }
              <!-- Scrim trái→phải để chữ đọc được trên mọi ảnh, cả 2 mode -->
              <div
                class="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-transparent"
              ></div>
              <div class="absolute inset-0 flex items-center">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div class="max-w-[52ch]">
                    @if (banner.kicker) {
                      <span
                        class="block text-[11px] font-extrabold uppercase tracking-widest text-slate-200 mb-2"
                      >
                        {{ banner.kicker }}
                      </span>
                    }
                    <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {{ banner.title }}
                    </h2>
                    @if (banner.subtitle) {
                      <p class="mt-3 text-sm sm:text-base text-slate-200">
                        {{ banner.subtitle }}
                      </p>
                    }
                    <span
                      class="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100"
                    >
                      Xem ngay
                      <mat-icon class="!w-4 !h-4 !text-[18px] !leading-none">arrow_forward</mat-icon>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </a>
        }
      </div>

      @if (banners().length > 1) {
        <!-- Prev / Next -->
        <button
          type="button"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-900 grid place-items-center shadow-md"
          aria-label="Banner trước"
          (click)="prev(); $event.preventDefault()"
        >
          <mat-icon class="!w-5 !h-5 !text-[20px] !leading-none">chevron_left</mat-icon>
        </button>
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-900 grid place-items-center shadow-md"
          aria-label="Banner sau"
          (click)="next(); $event.preventDefault()"
        >
          <mat-icon class="!w-5 !h-5 !text-[20px] !leading-none">chevron_right</mat-icon>
        </button>

        <!-- Dots -->
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          @for (banner of banners(); track banner.id; let i = $index) {
            <button
              type="button"
              class="h-1.5 rounded-full transition-all"
              [class]="i === currentIndex() ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'"
              [attr.aria-label]="'Tới banner ' + (i + 1)"
              [attr.aria-current]="i === currentIndex()"
              (click)="goTo(i)"
            ></button>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class HomeBannerCarouselComponent {
  banners = input.required<HomeBannerResponse[]>();

  readonly currentIndex = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  private static readonly AUTOPLAY_MS = 6000;

  constructor() {
    // Chỉ autoplay khi người dùng KHÔNG yêu cầu giảm chuyển động.
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      this.startTimer();
    }
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      // Không chạy khi tab bị ẩn — tránh nhảy slide hàng loạt lúc quay lại.
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      this.next();
    }, HomeBannerCarouselComponent.AUTOPLAY_MS);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  pause(): void {
    this.stopTimer();
  }

  resume(): void {
    if (this.timer === null) {
      this.startTimer();
    }
  }

  next(): void {
    const len = this.banners().length;
    if (len > 1) {
      this.currentIndex.update((i) => (i + 1) % len);
    }
  }

  prev(): void {
    const len = this.banners().length;
    if (len > 1) {
      this.currentIndex.update((i) => (i - 1 + len) % len);
    }
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  /**
   * D30: BE trả cặp targetType + targetValue, FE tự dựng routerLink — response
   * không chứa URL sẵn nên không có đường nào cho `javascript:` lọt qua.
   */
  linkFor(banner: HomeBannerResponse): string[] | string {
    switch (banner.targetType) {
      case 'PRODUCT':
        // targetValue là CODE sản phẩm — khớp route /products/:code.
        return ['/products', banner.targetValue];
      case 'FLASH_SALE':
        return ['/flash-sale'];
      case 'CATEGORY':
      case 'BRAND':
        // Lọc qua query param — trang /products đọc categoryId/factory.
        return ['/products'];
      default:
        // Chỉ còn 4 loại đích có thật ở BE; nhánh này không còn đường vào.
        return ['/'];
    }
  }

  /** CATEGORY/BRAND lọc bằng query param; các loại khác không cần. */
  queryParamsFor(banner: HomeBannerResponse): Record<string, string> | null {
    if (banner.targetType === 'CATEGORY') {
      return { categoryId: banner.targetValue };
    }
    if (banner.targetType === 'BRAND') {
      return { factory: banner.targetValue };
    }
    return null;
  }
}
