import {
  Component,
  input,
  output,
  computed,
  contentChildren,
  TemplateRef,
  signal,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ButtonComponent } from '../button/button.component';

export interface Column<T> {
  key: string;
  label: string;
  visible?: boolean;
  width?: string;
  sortable?: boolean;
  template?: TemplateRef<{ $implicit: T }>;
  align?: 'left' | 'center' | 'right';
}

export interface TableAction<T> {
  label: string;
  icon: string;
  handler: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: (row: T) => boolean;
  tooltip?: string;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, EmptyStateComponent, ButtonComponent],
  template: `
    <div
      class="table-container overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
      [class]="densityClass()"
    >
      @if (loading()) {
        <div class="p-4 sm:p-6" role="status" aria-live="polite">
          <p class="sr-only">{{ loadingText() }}</p>
          <div class="space-y-4">
            @for (row of [0, 1, 2, 3, 4]; track row) {
              <div class="flex items-center gap-4">
                @if (selectable()) {
                  <div class="w-12 shrink-0 flex justify-center">
                    <div class="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  </div>
                }
                <div
                  class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0"
                ></div>
                <div class="flex-1 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <div
                  class="flex-[2] h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                ></div>
                <div
                  class="hidden md:block flex-1 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                ></div>
                <div
                  class="hidden md:block w-24 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                ></div>
                @if (actions().length > 0) {
                  <div class="w-14 shrink-0"></div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (data().length === 0) {
        <app-empty-state
          [icon]="emptyIcon()"
          [title]="emptyTitle()"
          [description]="emptyDescription()"
          [actionLabel]="emptyActionLabel()"
          [actionIcon]="emptyActionIcon()"
          (actionClick)="emptyActionClick.emit()"
        />
      } @else {
        <table class="w-full min-w-[800px]" role="grid">
          <thead class="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
            <tr class="border-b border-slate-200 dark:border-slate-700">
              @if (selectable()) {
                <th class="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    [checked]="selectAll()"
                    [indeterminate]="selectedCount() > 0 && !selectAll()"
                    (change)="toggleSelectAll($event)"
                    class="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500/30 cursor-pointer"
                    [attr.aria-label]="'Chọn tất cả ' + (ariaLabelPrefix() || '')"
                  />
                </th>
              }
              @for (column of visibleColumns(); track column.key) {
                <th
                  class="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-pointer select-none"
                  [style.width]="column.width"
                  [style.text-align]="column.align"
                  (click)="column.sortable && onSort(column.key)"
                  [attr.aria-sort]="
                    sortColumn() === column.key
                      ? sortDirection() === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  "
                >
                  <div class="flex items-center gap-2">
                    <span>{{ column.label }}</span>
                    @if (column.sortable) {
                      @if (sortColumn() === column.key) {
                        <mat-icon class="w-4 h-4 text-primary-600 dark:text-primary-400">{{
                          sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward'
                        }}</mat-icon>
                      } @else {
                        <mat-icon class="w-4 h-4 text-slate-300 dark:text-slate-600"
                          >unfold_more</mat-icon
                        >
                      }
                    }
                  </div>
                </th>
              }
              @if (actions().length > 0) {
                <th
                  class="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-slate-600 dark:text-slate-300 w-14"
                >
                  <span class="sr-only">Thao tác</span>
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (row of data(); track trackByFn()(row); let rowIndex = $index) {
              <tr
                class="transition-colors"
                [class.hover:bg-slate-50]="!selectable()"
                [class.dark:hover:bg-slate-800/50]="!selectable()"
                [class.bg-primary-50/30]="selectable() && isSelected(row)"
                [class.dark:bg-primary-900/20]="selectable() && isSelected(row)"
              >
                @if (selectable()) {
                  <td class="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      [checked]="isSelected(row)"
                      (change)="toggleSelectRow(row, $event)"
                      class="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500/30 cursor-pointer"
                      [attr.aria-label]="'Chọn ' + (getRowLabel(row) || '')"
                    />
                  </td>
                }
                @for (column of visibleColumns(); track column.key) {
                  <td class="px-4 py-3" [style.text-align]="column.align">
                    @if (column.template) {
                      <ng-container
                        [ngTemplateOutlet]="column.template"
                        [ngTemplateOutletContext]="{ $implicit: row }"
                      />
                    } @else {
                      {{ getCellValue(row, column.key) }}
                    }
                  </td>
                }
                @if (actions().length > 0) {
                  <td class="px-4 py-3 text-right">
                    <div class="relative inline-block text-left">
                      <button
                        type="button"
                        [disabled]="isActionsDisabled(row)"
                        (click)="toggleRowMenu(row)"
                        [matTooltip]="'Thao tác'"
                        class="table-action-trigger action-btn p-2 rounded-lg transition-colors"
                        aria-label="Thao tác"
                        [attr.aria-expanded]="isRowMenuOpen(row)"
                      >
                        <mat-icon class="w-5 h-5">more_vert</mat-icon>
                        <span class="sr-only">Thao tác</span>
                      </button>

                      @if (isRowMenuOpen(row)) {
                        <div
                          #menuContainer
                          class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-[200] animate-scale-in"
                        >
                          @for (action of actions(); track action.label) {
                            <button
                              type="button"
                              [disabled]="action.disabled?.(row)"
                              (click)="runAction(action, row)"
                              class="flex items-center gap-2 px-4 py-2 text-sm w-full text-left transition-colors"
                              [class.text-danger-600]="action.variant === 'danger'"
                              [class.dark:text-danger-400]="action.variant === 'danger'"
                              [class.hover:bg-danger-50]="action.variant === 'danger'"
                              [class.dark:hover:bg-danger-900/20]="action.variant === 'danger'"
                              [class.text-slate-700]="action.variant !== 'danger'"
                              [class.dark:text-slate-200]="action.variant !== 'danger'"
                              [class.hover:bg-slate-100]="action.variant !== 'danger'"
                              [class.dark:hover:bg-slate-700]="action.variant !== 'danger'"
                              [class.opacity-50]="action.disabled?.(row)"
                              [class.cursor-not-allowed]="action.disabled?.(row)"
                            >
                              <mat-icon class="w-4 h-4 shrink-0">{{ action.icon }}</mat-icon>
                              <span class="truncate">{{ action.label }}</span>
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (!loading() && data().length > 0 && paginated() && showPagination()) {
      <div
        class="px-4 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div class="text-sm text-slate-600 dark:text-slate-400">
          Hiển thị <span class="font-medium">{{ (currentPage() - 1) * pageSize() + 1 }}</span> -
          <span class="font-medium">{{ Math.min(currentPage() * pageSize(), totalItems()) }}</span>
          của <span class="font-medium">{{ totalItems() }}</span> mục
        </div>
        <div class="flex items-center gap-2">
          <app-button
            variant="outline"
            size="sm"
            [disabled]="currentPage() === 1"
            (click)="prevPage.emit()"
            [icon]="'chevron_left'"
            ariaLabel="Trang trước"
          />
          <app-button
            variant="outline"
            size="sm"
            [disabled]="currentPage() === totalPages()"
            (click)="nextPage.emit()"
            [icon]="'chevron_right'"
            ariaLabel="Trang sau"
          />
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .action-btn {
        @apply text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800;
      }
    `,
  ],
})
export class TableComponent<T = any> {
  // Required inputs
  data = input.required<T[]>();
  columns = input.required<Column<T>[]>();
  trackByFn = input<(row: T) => any>((row) => (row as any).id);

  // Optional features
  loading = input<boolean>(false);
  loadingText = input<string>('Đang tải...');
  selectable = input<boolean>(false);
  selectedRows = input<T[]>([]);
  actions = input<TableAction<T>[]>([]);
  paginated = input<boolean>(false);
  currentPage = input<number>(1);
  pageSize = input<number>(10);
  totalItems = input<number>(0);
  sortColumn = input<string>('');
  sortDirection = input<'asc' | 'desc'>('asc');
  density = input<'comfortable' | 'compact' | 'spacious'>('comfortable');
  ariaLabelPrefix = input<string>('');

  // Empty state
  emptyIcon = input<string>('inventory_2');
  emptyTitle = input<string>('Không tìm thấy dữ liệu');
  emptyDescription = input<string>('Thử thay đổi bộ lọc hoặc thêm mới');
  emptyActionLabel = input<string>('');
  emptyActionIcon = input<string>('');

  // Selection state
  private _selectAll = signal(false);

  // Row actions (kebab) menu state
  openMenuRow = signal<T | null>(null);
  @ViewChild('menuContainer', { static: false }) menuContainer?: ElementRef<HTMLElement>;

  // Outputs
  selectionChange = output<T[]>();
  sortChange = output<{ column: string; direction: 'asc' | 'desc' }>();
  rowClick = output<T>();
  prevPage = output<void>();
  nextPage = output<void>();
  emptyActionClick = output<void>();

  // Computed
  visibleColumns = computed(() => this.columns().filter((c) => c.visible !== false));
  selectedCount = computed(() => this.selectedRows().length);
  selectAll = computed(() => {
    const data = this.data();
    return data.length > 0 && data.every((row) => this.isSelected(row));
  });

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  showPagination = computed(() => this.totalPages() > 1);

  densityClass = computed(() => {
    const classes: Record<string, string> = {
      comfortable: '',
      compact: 'table-compact',
      spacious: 'table-spacious',
    };
    return classes[this.density()];
  });

  isSelected = (row: T): boolean => {
    const trackBy = this.trackByFn();
    const selectedTrackIds = this.selectedRows().map((r) => trackBy(r));
    return selectedTrackIds.includes(trackBy(row));
  };

  getCellValue = (row: T, key: string): any => (row as any)[key];

  getRowLabel = (row: T): string => {
    const rowAny = row as any;
    return rowAny.name || rowAny.email || rowAny.code || rowAny.title || this.trackByFn()(row);
  };

  // Event handlers
  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this._selectAll.set(checked);
    if (checked) {
      this.selectionChange.emit([...this.data()]);
    } else {
      this.selectionChange.emit([]);
    }
  }

  toggleSelectRow(row: T, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = [...this.selectedRows()];
    if (checked) {
      this.selectionChange.emit([...current, row]);
    } else {
      this.selectionChange.emit(
        current.filter((r) => this.trackByFn()(r) !== this.trackByFn()(row)),
      );
    }
  }

  onSort(columnKey: string): void {
    const col = this.columns().find((c) => c.key === columnKey);
    if (!col?.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (this.sortColumn() === columnKey && this.sortDirection() === 'asc') {
      direction = 'desc';
    }
    this.sortChange.emit({ column: columnKey, direction });
  }

  // Row actions (kebab) menu
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const open = this.openMenuRow();
    if (open === null) return;
    const target = event.target as HTMLElement;
    const inMenu = this.menuContainer?.nativeElement?.contains(target) ?? false;
    const inTrigger = !!target.closest('.table-action-trigger');
    if (!inMenu && !inTrigger) {
      this.openMenuRow.set(null);
    }
  }

  isActionsDisabled = (row: T): boolean =>
    this.actions().filter((a) => !a.disabled?.(row)).length === 0;

  isRowMenuOpen = (row: T): boolean => {
    const open = this.openMenuRow();
    return open !== null && this.trackByFn()(open) === this.trackByFn()(row);
  };

  toggleRowMenu(row: T): void {
    const open = this.openMenuRow();
    const isSameRow = open !== null && this.trackByFn()(open) === this.trackByFn()(row);
    this.openMenuRow.set(isSameRow ? null : row);
  }

  runAction(action: TableAction<T>, row: T): void {
    this.openMenuRow.set(null);
    action.handler(row);
  }

  // For template
  Math = Math;
}
