import {
  Component,
  DestroyRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';

/**
 * Ô chọn sản phẩm có tìm kiếm — thay cho `<select>` đổ hết danh mục.
 *
 * <p>
 * Gõ để lọc (debounce 300ms, gọi `GET /admin/products/search`), kết quả đổ ra
 * dropdown có phân trang. Chế độ `multiple` hiện sản phẩm đã chọn thành chip
 * kèm nút bỏ — dùng cho phạm vi khuyến mại; chế độ đơn dùng cho banner.
 *
 * <p>
 * Là `ControlValueAccessor` nên cắm thẳng vào `formControlName`: giá trị là
 * `string` (id sản phẩm) hoặc `string[]` tuỳ `multiple`.
 */
@Component({
  selector: 'app-product-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ProductPickerComponent), multi: true },
  ],
  template: `
    <div class="relative">
      <!-- Chip đã chọn (chế độ nhiều) -->
      @if (multiple() && selected().length > 0) {
        <div class="flex flex-wrap gap-2 mb-2">
          @for (p of selected(); track p.id) {
            <span
              class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-sm"
            >
              {{ p.name }}
              <button
                type="button"
                class="grid place-items-center w-5 h-5 rounded hover:bg-primary-100 dark:hover:bg-primary-900/60"
                [attr.aria-label]="'Bỏ ' + p.name"
                (click)="remove(p.id)"
              >
                <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">close</mat-icon>
              </button>
            </span>
          }
        </div>
      }

      <!-- Chế độ đơn: hiện sản phẩm đang chọn thay cho ô gõ -->
      @if (!multiple() && selected().length > 0) {
        <div
          class="flex items-center justify-between gap-2 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
        >
          <span class="truncate text-sm text-slate-900 dark:text-white">{{ selected()[0].name }}</span>
          <button
            type="button"
            class="grid place-items-center w-6 h-6 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Bỏ sản phẩm đã chọn"
            (click)="clear()"
          >
            <mat-icon class="!w-4 !h-4 !text-[18px] !leading-none">close</mat-icon>
          </button>
        </div>
      }

      @if (multiple() || selected().length === 0) {
        <div class="relative">
          <mat-icon
            class="absolute left-3 top-1/2 -translate-y-1/2 !w-4 !h-4 !text-[18px] !leading-none text-slate-400 pointer-events-none"
            >search</mat-icon
          >
          <input
            type="text"
            class="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            [placeholder]="placeholder()"
            [value]="keyword()"
            [disabled]="displayDisabled()"
            (input)="onInput($event)"
            (focus)="open.set(true)"
            (blur)="onBlur()"
            [attr.aria-label]="ariaLabel()"
          />

          @if (open() && !displayDisabled()) {
            <div
              class="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
            >
              @if (loading()) {
                <p class="px-3 py-3 text-sm text-slate-500">Đang tìm…</p>
              } @else if (results().length === 0) {
                <p class="px-3 py-3 text-sm text-slate-500">Không tìm thấy sản phẩm nào</p>
              } @else {
                @for (p of results(); track p.id) {
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    (mousedown)="pick(p, $event)"
                  >
                    <span class="min-w-0">
                      <span class="block truncate text-sm text-slate-900 dark:text-white">{{ p.name }}</span>
                      <span class="block text-xs text-slate-500">{{ p.code }}</span>
                    </span>
                    @if (isSelected(keyOf(p))) {
                      <mat-icon class="!w-4 !h-4 !text-[18px] !leading-none text-primary-600">check</mat-icon>
                    }
                  </button>
                }
                @if (!lastPage()) {
                  <button
                    type="button"
                    class="w-full px-3 py-2 text-sm text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-200 dark:border-slate-700"
                    (mousedown)="loadMore($event)"
                  >
                    Tải thêm…
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProductPickerComponent implements ControlValueAccessor {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  /** true = chọn nhiều (trả string[]); false = chọn 1 (trả string). */
  multiple = input(false);
  /**
   * true = trả về `code` sản phẩm thay vì `id`. Dùng cho banner: route khách là
   * `/products/:code`, lưu id sẽ dẫn tới 404.
   */
  emitCode = input(false);
  placeholder = input('Tìm sản phẩm theo tên hoặc mã…');
  ariaLabel = input('Chọn sản phẩm');
  disabled = input(false);

  /** Bắn ra khi danh sách chọn đổi — form cha dùng để validate ngay. */
  selectionChange = output<string[]>();

  readonly keyword = signal('');
  readonly results = signal<ProductResponse[]>([]);
  readonly selected = signal<ProductResponse[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly lastPage = signal(false);

  private page = 0;
  private readonly search$ = new Subject<string>();

  private onChange: (value: string | string[]) => void = () => {};
  private onTouched: () => void = () => {};
  private _disabled = false;

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((kw) => {
          this.loading.set(true);
          this.page = 0;
          return this.productService.searchForPicker(kw, 0).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.applyPage(page, false));
  }

  // ===== ControlValueAccessor =====

  writeValue(value: string | string[] | null): void {
    const keys = value == null ? [] : Array.isArray(value) ? value : [value];
    if (keys.length === 0) {
      this.selected.set([]);
      return;
    }
    // Chỉ có id/code (từ BE) — tra tên để hiện chip. Sai thì bỏ qua, không chặn form.
    this.productService
      .searchForPicker('', 0, 100)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        const found = keys
          .map((key) => page?.content.find((p) => this.keyOf(p) === key))
          .filter((p): p is ProductResponse => !!p);
        this.selected.set(found);
      });
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
  }

  displayDisabled(): boolean {
    return this._disabled || this.disabled();
  }

  // ===== Tương tác =====

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.keyword.set(value);
    this.open.set(true);
    this.search$.next(value);
  }

  onBlur(): void {
    // Trễ để cú click trong dropdown kịp chạy trước khi đóng.
    setTimeout(() => {
      this.open.set(false);
      this.onTouched();
    }, 150);
  }

  pick(product: ProductResponse, event: Event): void {
    event.preventDefault();
    if (this.multiple()) {
      if (!this.isSelected(this.keyOf(product))) {
        this.selected.update((list) => [...list, product]);
      }
      this.keyword.set('');
      this.search$.next('');
    } else {
      this.selected.set([product]);
      this.open.set(false);
    }
    this.emit();
  }

  remove(key: string): void {
    this.selected.update((list) => list.filter((p) => this.keyOf(p) !== key));
    this.emit();
  }

  clear(): void {
    this.selected.set([]);
    this.emit();
  }

  /** Khoá định danh theo `emitCode`: id (mặc định) hay code (dùng cho banner). */
  keyOf(product: ProductResponse): string {
    return this.emitCode() ? product.code : product.id;
  }

  isSelected(key: string): boolean {
    return this.selected().some((p) => this.keyOf(p) === key);
  }

  loadMore(event: Event): void {
    event.preventDefault();
    this.loading.set(true);
    this.productService
      .searchForPicker(this.keyword(), this.page + 1)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.applyPage(page, true));
  }

  private applyPage(page: { content: ProductResponse[]; last: boolean } | null, append: boolean): void {
    this.loading.set(false);
    if (!page) {
      if (!append) {
        this.results.set([]);
      }
      return;
    }
    this.page = append ? this.page + 1 : 0;
    this.lastPage.set(page.last);
    this.results.set(append ? [...this.results(), ...page.content] : page.content);
  }

  private emit(): void {
    const keys = this.selected().map((p) => this.keyOf(p));
    this.onChange(this.multiple() ? keys : (keys[0] ?? ''));
    this.selectionChange.emit(keys);
  }
}
