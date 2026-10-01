import {
  Component,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '@core/services/user.service';
import { UserResponse } from '@core/models/user.model';

/**
 * Ô chọn khách hàng có tìm kiếm — dùng khi admin phát voucher đích danh.
 *
 * <p>
 * Gõ để lọc theo tên hoặc email (debounce 300ms, gọi `GET /admin/users/search`),
 * chọn được nhiều người. Người đã chọn hiện thành chip kèm nút bỏ.
 *
 * <p>
 * Là `ControlValueAccessor`: giá trị là `string[]` các `User.id`.
 */
@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UserPickerComponent), multi: true },
  ],
  template: `
    <div class="relative">
      @if (selected().length > 0) {
        <div class="flex flex-wrap gap-2 mb-2">
          @for (u of selected(); track u.id) {
            <span
              class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-sm"
            >
              {{ u.fullName || u.email }}
              <button
                type="button"
                class="grid place-items-center w-5 h-5 rounded hover:bg-primary-100 dark:hover:bg-primary-900/60"
                [attr.aria-label]="'Bỏ ' + (u.fullName || u.email)"
                (click)="remove(u.id)"
              >
                <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">close</mat-icon>
              </button>
            </span>
          }
        </div>
      }

      <div class="relative">
        <mat-icon
          class="absolute left-3 top-1/2 -translate-y-1/2 !w-4 !h-4 !text-[18px] !leading-none text-slate-400 pointer-events-none"
          >search</mat-icon
        >
        <input
          type="text"
          class="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Tìm khách theo tên hoặc email…"
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
              <p class="px-3 py-3 text-sm text-slate-500">Không tìm thấy khách nào</p>
            } @else {
              @for (u of results(); track u.id) {
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  (mousedown)="pick(u, $event)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm text-slate-900 dark:text-white">
                      {{ u.fullName || '(chưa đặt tên)' }}
                    </span>
                    <span class="block text-xs text-slate-500">{{ u.email }}</span>
                  </span>
                  @if (isSelected(u.id)) {
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
    </div>
  `,
})
export class UserPickerComponent implements ControlValueAccessor {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  ariaLabel = input('Chọn khách hàng');
  disabled = input(false);

  /** Giá trị đã chọn khi cha không gắn qua formControlName. */
  value = input<string[]>([]);
  valueChange = output<string[]>();

  readonly keyword = signal('');
  readonly results = signal<UserResponse[]>([]);
  readonly selected = signal<UserResponse[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly lastPage = signal(false);

  private page = 0;
  private readonly search$ = new Subject<string>();

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};
  private _disabled = false;

  constructor() {
    effect(() => {
      const incoming = this.value();
      untracked(() => {
        const current = this.selected().map((u) => u.id);
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
          return this.userService.searchForPicker(kw, 0).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.applyPage(page, false));
  }

  // ===== ControlValueAccessor =====

  writeValue(value: string[] | null): void {
    this.resolveLabels(value ?? []);
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

  pick(user: UserResponse, event: Event): void {
    event.preventDefault();
    if (!this.isSelected(user.id)) {
      this.selected.update((list) => [...list, user]);
    }
    this.keyword.set('');
    this.search$.next('');
    this.emit();
  }

  remove(id: string): void {
    this.selected.update((list) => list.filter((u) => u.id !== id));
    this.emit();
  }

  isSelected(id: string): boolean {
    return this.selected().some((u) => u.id === id);
  }

  loadMore(event: Event): void {
    event.preventDefault();
    this.loading.set(true);
    this.userService
      .searchForPicker(this.keyword(), this.page + 1)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.applyPage(page, true));
  }

  private applyPage(
    page: { content: UserResponse[]; last: boolean } | null,
    append: boolean,
  ): void {
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

  /** Tra tên khách từ id đã lưu để hiện chip; không tra được thì hiện chính id. */
  private resolveLabels(ids: string[]): void {
    if (ids.length === 0) {
      this.selected.set([]);
      return;
    }
    this.userService
      .searchForPicker('', 0, 100)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        const byId = new Map((page?.content ?? []).map((u) => [u.id, u]));
        this.selected.set(
          ids.map((id) => byId.get(id) ?? ({ id, email: id, fullName: '' } as UserResponse)),
        );
      });
  }

  private emit(): void {
    const ids = this.selected().map((u) => u.id);
    this.onChange(ids);
    this.valueChange.emit(ids);
    this.onTouched();
  }
}
