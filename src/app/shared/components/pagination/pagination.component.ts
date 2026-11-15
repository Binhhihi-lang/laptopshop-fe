import { Component, input, output, computed } from '@angular/core';
import { buildPageSlots, type PageSlot } from '@shared/utils/page-window';

/**
 * Phân trang: ‹ số ›. Ẩn khi ≤ 1 trang. page 0-based.
 *
 * Ẩn tối đa 7 ô (kể cả dấu …) — trước đây sinh 1 nút/trang nên shop 50.000
 * sản phẩm (4167 trang) làm tràn ngang và treo UI.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages() > 1) {
      <div class="flex w-full max-w-full flex-col items-center gap-2">
        <nav
          class="flex w-full max-w-full flex-wrap items-center justify-center gap-1"
          aria-label="Phân trang"
        >
          <button
            type="button"
            class="w-9 h-9 shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            [disabled]="page() === 0"
            (click)="go(page() - 1)"
            aria-label="Trang trước"
          >
            ‹
          </button>

          @for (slot of slots(); track $index) {
            @if (slot === 'gap') {
              <span
                class="w-7 h-9 shrink-0 grid place-items-center text-sm text-slate-400 dark:text-slate-500 select-none"
                aria-hidden="true"
              >
                …
              </span>
            } @else {
              <button
                type="button"
                [class]="
                  slot === page()
                    ? 'w-9 h-9 shrink-0 rounded-lg text-sm font-medium flex items-center justify-center bg-primary-600 text-white'
                    : 'w-9 h-9 shrink-0 rounded-lg text-sm font-medium flex items-center justify-center border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                "
                [attr.aria-current]="slot === page() ? 'page' : null"
                [attr.aria-label]="'Trang ' + (slot + 1)"
                (click)="go(slot)"
              >
                {{ slot + 1 }}
              </button>
            }
          }

          <button
            type="button"
            class="w-9 h-9 shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            [disabled]="page() >= totalPages() - 1"
            (click)="go(page() + 1)"
            aria-label="Trang sau"
          >
            ›
          </button>
        </nav>

        <!-- Dãy số bị lược khi nhiều trang; dòng này cho biết đang ở đâu. -->
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Trang {{ page() + 1 }} / {{ totalPages() }}
        </p>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PaginationComponent {
  page = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();

  /**
   * Dãy ô hiển thị: luôn có trang đầu, trang cuối và lân cận trang hiện tại.
   * Vùng giữa bị lược thay bằng một dấu "…".
   */
  slots = computed<PageSlot[]>(() => buildPageSlots(this.totalPages(), this.page()));

  go(p: PageSlot): void {
    if (typeof p !== 'number' || p < 0 || p >= this.totalPages()) {
      return;
    }
    this.pageChange.emit(p);
  }
}
