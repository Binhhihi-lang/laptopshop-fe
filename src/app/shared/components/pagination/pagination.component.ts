import { Component, input, output, computed } from '@angular/core';

/** Phân trang: ‹ số ›. Ẩn khi ≤ 1 trang. page 0-based. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages() > 1) {
      <nav class="flex items-center gap-1 justify-center" aria-label="Phân trang">
        <button
          type="button"
          class="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          [disabled]="page() === 0"
          (click)="go(page() - 1)"
          aria-label="Trang trước"
        >
          ‹
        </button>

        @for (p of pages(); track p) {
          <button
            type="button"
            class="w-9 h-9 rounded-lg text-sm font-medium"
            [class]="
              p === page()
                ? 'bg-primary-600 text-white'
                : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
            "
            (click)="go(p)"
          >
            {{ p + 1 }}
          </button>
        }

        <button
          type="button"
          class="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          [disabled]="page() >= totalPages() - 1"
          (click)="go(page() + 1)"
          aria-label="Trang sau"
        >
          ›
        </button>
      </nav>
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

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  go(p: number): void {
    if (p < 0 || p >= this.totalPages()) {
      return;
    }
    this.pageChange.emit(p);
  }
}
