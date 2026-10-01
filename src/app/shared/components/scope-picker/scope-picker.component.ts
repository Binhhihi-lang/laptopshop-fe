import {
  Component,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  computed,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '@core/services/product.service';

export type ScopeKind = 'ALL' | 'CATEGORY' | 'BRAND' | 'PRODUCT';

interface PickOption {
  /** Giá trị lưu vào DB: Category.id | tên hãng | Product.id. */
  value: string;
  /** Nhãn chính hiện trên dòng. */
  label: string;
  /** Dòng phụ (mã sản phẩm…) — rỗng thì ẩn. */
  meta?: string;
}

/**
 * Chọn phạm vi áp dụng — tab loại + hộp tick cuộn được + chip đã chọn.
 *
 * <p>
 * Theo mockup `promotion-admin-preview.html`: tab ngang chọn loại phạm vi, bên
 * dưới là danh sách tick, dưới cùng là chip những gì đã chọn (bấm x để bỏ).
 *
 * <p>
 * Sản phẩm có thể lên tới hàng nghìn nên ô tìm kiếm gọi API phân trang thay vì
 * đổ hết ra một danh sách. Danh mục/hãng ít hơn nên lọc ngay tại client.
 *
 * <p>
 * Là `ControlValueAccessor`: giá trị là `string[]` các giá trị phạm vi.
 */
@Component({
  selector: 'app-scope-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ScopePickerComponent), multi: true },
  ],
  template: `
    <!-- Tab loại phạm vi -->
    <div class="flex flex-wrap gap-1.5 mb-3">
      @for (t of kinds; track t.value) {
        <button
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          [class]="
            kind() === t.value
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-primary-500 hover:text-primary-600'
          "
          [attr.aria-pressed]="kind() === t.value"
          (click)="setKind(t.value)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    @if (kind() === 'ALL') {
      <div
        class="py-6 text-center text-sm text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
      >
        Áp cho <b class="text-slate-700 dark:text-slate-200">mọi sản phẩm</b> — không cần chọn phạm vi.
      </div>
    } @else {
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {{ pickLabel() }}
      </label>

      <!-- Ô tìm kiếm -->
      <div class="relative mb-2">
        <mat-icon
          class="absolute left-3 top-1/2 -translate-y-1/2 !w-4 !h-4 !text-[18px] !leading-none text-slate-400 pointer-events-none"
          >search</mat-icon
        >
        <input
          type="text"
          class="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          [placeholder]="searchPlaceholder()"
          [value]="keyword()"
          (input)="onSearch($event)"
          [attr.aria-label]="pickLabel()"
        />
      </div>

      <!-- Hộp tick -->
      <div
        class="max-h-56 overflow-auto rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
      >
        @if (loading()) {
          <p class="px-3.5 py-3 text-sm text-slate-500">Đang tải…</p>
        } @else if (options().length === 0) {
          <p class="px-3.5 py-3 text-sm text-slate-500">Không có mục nào phù hợp</p>
        } @else {
          @for (o of options(); track o.value) {
            <label
              class="flex items-center gap-2.5 px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800 first:border-t-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                class="w-4 h-4 shrink-0 accent-primary-600"
                [checked]="isPicked(o.value)"
                (change)="toggle(o.value, $event)"
              />
              <span class="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-200 truncate">
                {{ o.label }}
              </span>
              @if (o.meta) {
                <span class="text-xs text-slate-400 font-mono shrink-0">{{ o.meta }}</span>
              }
            </label>
          }
          @if (!lastPage()) {
            <button
              type="button"
              class="w-full px-3.5 py-2.5 text-sm text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800"
              (click)="loadMore()"
            >
              Tải thêm…
            </button>
          }
        }
      </div>

      <!-- Chip đã chọn -->
      @if (picked().length > 0) {
        <div class="flex flex-wrap gap-1.5 mt-3">
          @for (o of picked(); track o.value) {
            <span
              class="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-xs font-semibold"
            >
              {{ o.label }}
              <button
                type="button"
                class="grid place-items-center w-4 h-4 rounded-full opacity-70 hover:opacity-100"
                [attr.aria-label]="'Bỏ ' + o.label"
                (click)="remove(o.value)"
              >
                <mat-icon class="!w-3 !h-3 !text-[12px] !leading-none">close</mat-icon>
              </button>
            </span>
          }
        </div>
      }
    }
  `,
})
export class ScopePickerComponent implements ControlValueAccessor {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  /** Danh mục có sẵn (id + tên) — cha truyền vào. */
  categories = input<{ id: string; name: string }[]>([]);
  /** Hãng có sẵn (factory của sản phẩm). */
  brands = input<string[]>([]);

  /** Loại phạm vi đang chọn — hai chiều với form cha. */
  kind = input<ScopeKind>('ALL');
  kindChange = output<ScopeKind>();

  /** Giá trị đã chọn (dùng khi cha không gắn qua formControlName). */
  value = input<string[]>([]);
  valueChange = output<string[]>();

  readonly kinds: { value: ScopeKind; label: string }[] = [
    { value: 'ALL', label: 'Toàn bộ đơn' },
    { value: 'CATEGORY', label: 'Theo danh mục' },
    { value: 'BRAND', label: 'Theo thương hiệu' },
    { value: 'PRODUCT', label: 'Theo sản phẩm' },
  ];

  readonly keyword = signal('');
  readonly picked = signal<PickOption[]>([]);
  /** Kết quả sản phẩm từ API (chỉ dùng khi kind = PRODUCT). */
  readonly productOptions = signal<PickOption[]>([]);
  readonly loading = signal(false);
  readonly lastPage = signal(true);

  private page = 0;
  private readonly search$ = new Subject<string>();

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};
  private _disabled = false;

  pickLabel = computed(() => {
    switch (this.kind()) {
      case 'CATEGORY':
        return 'Chọn danh mục áp dụng';
      case 'BRAND':
        return 'Chọn thương hiệu áp dụng';
      case 'PRODUCT':
        return 'Chọn sản phẩm áp dụng';
      default:
        return '';
    }
  });

  searchPlaceholder = computed(() => {
    switch (this.kind()) {
      case 'CATEGORY':
        return 'Tìm danh mục…';
      case 'BRAND':
        return 'Tìm thương hiệu…';
      default:
        return 'Tìm theo tên hoặc mã sản phẩm…';
    }
  });

  /** Danh sách hiện trên hộp tick: sản phẩm lấy từ API, còn lại lọc tại client. */
  options = computed<PickOption[]>(() => {
    const kw = this.keyword().trim().toLowerCase();
    switch (this.kind()) {
      case 'CATEGORY':
        return this.categories()
          .filter((c) => !kw || c.name.toLowerCase().includes(kw))
          .map((c) => ({ value: c.id, label: c.name }));
      case 'BRAND':
        return this.brands()
          .filter((b) => !kw || b.toLowerCase().includes(kw))
          .map((b) => ({ value: b, label: b }));
      case 'PRODUCT':
        return this.productOptions();
      default:
        return [];
    }
  });

  constructor() {
    // Cha truyền `value` (không qua formControlName) → nạp lại chip khi đổi.
    // Bỏ qua lần bắn do chính mình phát ra để không ghi đè lúc đang chọn.
    effect(() => {
      const incoming = this.value();
      untracked(() => {
        const current = this.picked().map((p) => p.value);
        if (incoming.length === current.length && incoming.every((v) => current.includes(v))) {
          return;
        }
        this.resolveLabels(incoming);
      });
    });

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
      .subscribe((page) => this.applyProducts(page, false));
  }

  // ===== ControlValueAccessor =====

  writeValue(value: string[] | null): void {
    const ids = value ?? [];
    if (ids.length === 0) {
      this.picked.set([]);
      return;
    }
    // Chỉ có giá trị thô từ BE — tra nhãn để hiện chip. Không tra được thì vẫn
    // hiện chính giá trị đó, tránh mất dữ liệu khi form load lại.
    this.resolveLabels(ids);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
  }

  // ===== Tương tác =====

  setKind(kind: ScopeKind): void {
    if (kind === this.kind()) {
      return;
    }
    // Đổi loại thì bỏ hết lựa chọn cũ — giá trị của loại này không có nghĩa với
    // loại kia (id danh mục khác id sản phẩm).
    this.picked.set([]);
    this.keyword.set('');
    this.kindChange.emit(kind);
    this.emit();
    if (kind === 'PRODUCT') {
      this.loadProducts('');
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.keyword.set(value);
    if (this.kind() === 'PRODUCT') {
      this.search$.next(value);
    }
  }

  toggle(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      const option = this.options().find((o) => o.value === value);
      if (option && !this.isPicked(value)) {
        this.picked.update((list) => [...list, option]);
      }
    } else {
      this.picked.update((list) => list.filter((p) => p.value !== value));
    }
    this.emit();
  }

  remove(value: string): void {
    this.picked.update((list) => list.filter((p) => p.value !== value));
    this.emit();
  }

  isPicked(value: string): boolean {
    return this.picked().some((p) => p.value === value);
  }

  loadMore(): void {
    this.loading.set(true);
    this.productService
      .searchForPicker(this.keyword(), this.page + 1)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.applyProducts(page, true));
  }

  private loadProducts(kw: string): void {
    this.loading.set(true);
    this.productService
      .searchForPicker(kw, 0)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.applyProducts(page, false));
  }

  private applyProducts(
    page: { content: { id: string; name: string; code: string }[]; last: boolean } | null,
    append: boolean,
  ): void {
    this.loading.set(false);
    if (!page) {
      if (!append) {
        this.productOptions.set([]);
      }
      return;
    }
    this.page = append ? this.page + 1 : 0;
    this.lastPage.set(page.last);
    const mapped = page.content.map((p) => ({ value: p.id, label: p.name, meta: p.code }));
    this.productOptions.set(append ? [...this.productOptions(), ...mapped] : mapped);
  }

  /**
   * Tra nhãn cho các giá trị đã lưu: sản phẩm hỏi API, danh mục/hãng tra từ
   * input của cha. Không tra được thì lấy chính giá trị làm nhãn.
   */
  private resolveLabels(values: string[]): void {
    const kind = this.kind();
    if (kind === 'CATEGORY') {
      const byId = new Map(this.categories().map((c) => [c.id, c.name]));
      this.picked.set(values.map((v) => ({ value: v, label: byId.get(v) ?? v })));
      return;
    }
    if (kind === 'BRAND') {
      this.picked.set(values.map((v) => ({ value: v, label: v })));
      return;
    }
    if (kind === 'PRODUCT') {
      this.productService
        .searchForPicker('', 0, 100)
        .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
        .subscribe((page) => {
          const byId = new Map(
            (page?.content ?? []).map((p) => [p.id, { label: p.name, meta: p.code }]),
          );
          this.picked.set(
            values.map((v) => {
              const hit = byId.get(v);
              return { value: v, label: hit?.label ?? v, meta: hit?.meta };
            }),
          );
        });
    }
  }

  private emit(): void {
    const values = this.picked().map((p) => p.value);
    this.onChange(values);
    this.valueChange.emit(values);
    this.onTouched();
  }
}
