import {
  Component,
  OnInit,
  AfterViewInit,
  signal,
  computed,
  inject,
  ViewChild,
  TemplateRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { PromotionService } from '@core/services/promotion.service';
import { AuthService } from '@core/services/auth.service';
import { PromotionResponse, PromotionSummary } from '@core/models/promotion.model';
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  PageHeaderComponent,
  ColumnPickerComponent,
  StatCardComponent,
  BulkToolbarComponent,
  BulkToolbarButton,
} from '@shared/components';
import { PromotionDiscountType, ScopeType } from '@core/models/promotion.model';

/**
 * Danh sách chương trình khuyến mại (Sprint 4b).
 *
 * <p>
 * Bulk: BE có `PATCH /bulk-status` (bật/tắt) và `/bulk-deactivate` (ngừng áp).
 * Không có xoá cứng — chương trình đã áp lên đơn phải giữ để tra cứu.
 */
@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    TableComponent,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    InputComponent,
    PageHeaderComponent,
    ColumnPickerComponent,
    EmptyStateComponent,
    StatCardComponent,
    BulkToolbarComponent,
  ],
  templateUrl: './promotions.html',
})
export class PromotionsComponent implements OnInit, AfterViewInit {
  private readonly promotionService = inject(PromotionService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** BE dùng UPDATE_PROMOTION cho nút ngừng áp dụng (không có DELETE_PROMOTION). */
  canDeactivate = computed(() => this.authService.hasPermission('UPDATE_PROMOTION'));

  promotions = signal<PromotionResponse[]>([]);
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);
  isBulkRunning = signal(false);

  // Phân trang phía server: danh sách chỉ còn 1 trang dữ liệu trong bộ nhớ.
  readonly pageSize = 20;
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  /** Số liệu toàn bảng cho 4 thẻ KPI — trang không còn giữ toàn bộ chương trình. */
  summary = signal<PromotionSummary | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  /** Gõ tìm kiếm liên tục không nên bắn 1 request/ký tự. */
  private readonly searchInput$ = new Subject<void>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadData();
      });
  }

  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  timeFilter = signal<'all' | 'running' | 'upcoming' | 'ended'>('all');
  discountTypeFilter = signal<'all' | PromotionDiscountType>('all');
  scopeFilter = signal<'all' | ScopeType>('all');
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  selectedIds = signal<string[]>([]);

  columns = signal<Column<PromotionResponse>[]>([
    { key: 'name', label: 'Chương trình', visible: true, sortable: true },
    { key: 'discount', label: 'Mức giảm', visible: true, align: 'left' },
    { key: 'scope', label: 'Phạm vi', visible: true, align: 'left' },
    { key: 'period', label: 'Thời gian', visible: true, sortable: true, align: 'left' },
    { key: 'budget', label: 'Ngân sách', visible: true, align: 'left' },
    { key: 'status', label: 'Trạng thái', visible: true, width: '150px', align: 'center' },
  ]);

  filteredPromotions = signal<PromotionResponse[]>([]);

  @ViewChild('nameColumn') nameColumn!: TemplateRef<any>;
  @ViewChild('discountColumn') discountColumn!: TemplateRef<any>;
  @ViewChild('scopeColumn') scopeColumn!: TemplateRef<any>;
  @ViewChild('periodColumn') periodColumn!: TemplateRef<any>;
  @ViewChild('budgetColumn') budgetColumn!: TemplateRef<any>;
  @ViewChild('statusColumn') statusColumn!: TemplateRef<any>;

  actions: TableAction<PromotionResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.router.navigate(['/admin/promotions', row.id]),
      variant: 'ghost',
    },
    {
      label: 'Sửa chương trình',
      icon: 'edit',
      handler: (row) => this.router.navigate(['/admin/promotions', row.id, 'edit']),
      variant: 'ghost',
    },
    {
      label: 'Nhân bản',
      icon: 'content_copy',
      handler: (row) => this.duplicate(row),
      variant: 'ghost',
    },
    {
      label: 'Tạm dừng / Bật lại',
      icon: 'power_settings_new',
      handler: (row) => this.toggleActive(row),
      variant: 'ghost',
      disabled: () => !this.canDeactivate(),
    },
    {
      label: 'Ngừng áp dụng',
      icon: 'block',
      handler: (row) => this.deactivate(row),
      variant: 'danger',
      disabled: () => !this.canDeactivate(),
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Gắn template vào cột SAU khi view khởi tạo — @ViewChild chỉ có giá trị ở
   * ngAfterViewInit. Thiếu bước này thì cột không có template và bảng in giá trị
   * thô (`row.discount` không tồn tại → ô trống).
   */
  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          name: this.nameColumn,
          discount: this.discountColumn,
          scope: this.scopeColumn,
          period: this.periodColumn,
          budget: this.budgetColumn,
          status: this.statusColumn,
        };
        return templateMap[col.key] ? { ...col, template: templateMap[col.key] } : col;
      }),
    );
  }

  loadData(): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    // UI dùng 'all' cho "không lọc"; API chỉ nhận giá trị thật.
    const time = this.timeFilter();
    const timeParam = time === 'all' ? undefined : time;
    const dType = this.discountTypeFilter();
    const discountParam = dType === 'all' ? undefined : dType;
    const scope = this.scopeFilter();
    const scopeParam = scope === 'all' ? undefined : scope;
    this.promotionService
      .getPromotionPage({
        keyword: this.searchTerm().trim() || undefined,
        active: this.activeParam(),
        timeState: timeParam,
        discountType: discountParam,
        scopeType: scopeParam,
        page: this.currentPage(),
        size: this.pageSize,
        sort: this.buildSortParam(),
      })
      .subscribe({
        next: (page) => {
          this.promotions.set(page.content);
          this.totalElements.set(page.totalElements);
          this.totalPages.set(page.totalPages);
          this.currentPage.set(page.number);
          // Server đã lọc; chỉ đồng bộ để template đọc chung một nguồn.
          this.filteredPromotions.set(page.content);
          this.isLoading.set(false);
        },
        error: (error) => {
          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.permissionDenied.set(true);
          } else {
            this.notification.error(this.notification.extractError(error));
          }
          this.isLoading.set(false);
        },
      });
    this.loadSummary();
  }

  /** Bộ lọc "Đang bật / Đã tắt" map thẳng sang cờ active của BE. */
  private activeParam(): boolean | undefined {
    const status = this.statusFilter();
    if (status === 'active') {
      return true;
    }
    if (status === 'inactive') {
      return false;
    }
    return undefined;
  }

  /** KPI tính trên toàn bảng nên gọi riêng, không phụ thuộc trang hiện tại. */
  private loadSummary(): void {
    this.promotionService.getPromotionSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => {},
    });
  }

  /** Cột bảng -> field entity để BE sắp xếp; cột không map được dùng mặc định. */
  private buildSortParam(): string {
    const sortFieldMap: Record<string, string> = { name: 'name', period: 'startDate' };
    const field = sortFieldMap[this.sortColumn()];
    return field ? `${field},${this.sortDirection()}` : 'createdAt,desc';
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadData();
  }

  /** app-table phát số trang 1-based; goToPage nhận 0-based. */
  onPageChange(page: number): void {
    this.goToPage(page - 1);
  }

  /** Đổi bộ lọc → quay về trang đầu và nạp lại từ server. */
  private reloadFromFirstPage(): void {
    this.currentPage.set(0);
    this.loadData();
  }

  onSearchChange(): void {
    this.searchInput$.next();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    if (this.statusFilter() === status) {
      return;
    }
    this.statusFilter.set(status);
    this.currentPage.set(0);
    this.loadData();
  }

  setTimeFilter(time: 'all' | 'running' | 'upcoming' | 'ended'): void {
    this.timeFilter.set(time);
    this.reloadFromFirstPage();
  }

  setDiscountTypeFilter(type: 'all' | PromotionDiscountType): void {
    this.discountTypeFilter.set(type);
    this.reloadFromFirstPage();
  }

  setScopeFilter(scope: 'all' | ScopeType): void {
    this.scopeFilter.set(scope);
    this.reloadFromFirstPage();
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(event.column);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadData();
  }

  onColumnsChange(columns: Column<PromotionResponse>[]): void {
    this.columns.set(columns);
  }

  toggleColumn(columnKey: string): void {
    this.columns.set(
      this.columns().map((c) => (c.key === columnKey ? { ...c, visible: !c.visible } : c)),
    );
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.timeFilter.set('all');
    this.discountTypeFilter.set('all');
    this.scopeFilter.set('all');
    // Từ khóa + trạng thái lọc ở server nên phải tải lại trang đầu.
    this.currentPage.set(0);
    this.loadData();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.timeFilter() !== 'all' ||
      this.discountTypeFilter() !== 'all' ||
      this.scopeFilter() !== 'all'
    );
  }

  /** Nhãn các bộ lọc đang bật — hiện thành chip "Đang lọc". */
  activeFilterChips = computed<{ label: string; clear: () => void }[]>(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (this.statusFilter() !== 'all') {
      chips.push({
        label: `Trạng thái: ${this.statusFilter() === 'active' ? 'Đang bật' : 'Đã tắt'}`,
        clear: () => this.setStatusFilter('all'),
      });
    }
    if (this.timeFilter() !== 'all') {
      chips.push({
        label: `Thời gian: ${this.timeFilterLabel(this.timeFilter())}`,
        clear: () => this.setTimeFilter('all'),
      });
    }
    if (this.discountTypeFilter() !== 'all') {
      chips.push({
        label: `Loại giảm: ${this.discountTypeFilter() === 'PERCENT' ? 'Phần trăm' : 'Số tiền / máy'}`,
        clear: () => this.setDiscountTypeFilter('all'),
      });
    }
    if (this.scopeFilter() !== 'all') {
      chips.push({
        label: `Phạm vi: ${this.scopeTypeLabel(this.scopeFilter() as ScopeType)}`,
        clear: () => this.setScopeFilter('all'),
      });
    }
    return chips;
  });

  // ===== KPI (tính trên toàn bảng qua /summary) =====

  summaryTotal = computed(() => this.summary()?.total ?? 0);

  runningCount = computed(() => this.summary()?.running ?? 0);

  /** Đếm theo công tắc `active`, KHÁC `runningCount` (đếm theo khung thời gian). */
  inactiveCount = computed(() => this.summary()?.inactive ?? 0);

  /** Tổng lượt đã dùng / tổng ngân sách (bỏ chương trình không giới hạn). */
  budgetUsage = computed(() => {
    const used = this.summary()?.budgetUsed ?? 0;
    const limit = this.summary()?.budgetLimit ?? 0;
    return { used, limit, percent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0 };
  });

  /** % chương trình đang còn công tắc bật. */
  activePercent = computed(() => {
    const total = this.summaryTotal();
    if (total === 0) return 0;
    return Math.round(((total - this.inactiveCount()) / total) * 100);
  });

  /** % chương trình đã bị tắt. */
  inactivePercent = computed(() => {
    const total = this.summaryTotal();
    return total > 0 ? Math.round((this.inactiveCount() / total) * 100) : 0;
  });

  /** Số loại phạm vi đang được dùng — chân thẻ "N loại phạm vi". */
  scopeTypeCount = computed(() => this.summary()?.scopeTypeCount ?? 0);

  upcomingCount = computed(() => this.summary()?.upcoming ?? 0);

  endedCount = computed(() => this.summary()?.ended ?? 0);

  runningPercent = computed(() => {
    const total = this.summaryTotal();
    return total > 0 ? Math.round((this.runningCount() / total) * 100) : 0;
  });

  /** Số chương trình đã dùng hết ngân sách. */
  hitCapCount = computed(() => this.summary()?.hitCap ?? 0);

  // ===== Bulk =====
  selectedCount = computed(() => this.selectedIds().length);

  /** Dòng đang chọn — app-table so theo object nên phải trả về chính object trong list. */
  selectedPromotions = computed(() =>
    this.promotions().filter((p) => this.selectedIds().includes(p.id)),
  );

  onSelectionChange(rows: PromotionResponse[]): void {
    this.selectedIds.set(rows.map((r) => r.id));
  }

  bulkButtons = computed<BulkToolbarButton[]>(() => [
    {
      label: 'Bật',
      icon: 'check_circle',
      variant: 'success',
      handler: () => this.bulkStatus(true),
      disabled: this.isBulkRunning(),
    },
    {
      label: 'Tạm dừng',
      icon: 'pause',
      variant: 'secondary',
      handler: () => this.bulkStatus(false),
      disabled: this.isBulkRunning(),
    },
    {
      label: 'Ngừng áp dụng',
      icon: 'block',
      variant: 'danger',
      handler: () => this.bulkDeactivate(),
      disabled: this.isBulkRunning() || !this.canDeactivate(),
    },
  ]);

  private bulkStatus(active: boolean): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    this.isBulkRunning.set(true);
    this.promotionService.bulkUpdateStatus(ids, active).subscribe({
      next: () => {
        this.notification.success(`Đã ${active ? 'bật' : 'tạm dừng'} ${ids.length} chương trình`);
        this.selectedIds.set([]);
        this.isBulkRunning.set(false);
        this.loadData();
      },
      error: (error) => {
        this.notification.error(this.notification.extractError(error));
        this.isBulkRunning.set(false);
      },
    });
  }

  private bulkDeactivate(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    this.isBulkRunning.set(true);
    this.promotionService.bulkDeactivate(ids).subscribe({
      next: () => {
        this.notification.success(`Đã ngừng áp dụng ${ids.length} chương trình`);
        this.selectedIds.set([]);
        this.isBulkRunning.set(false);
        this.loadData();
      },
      error: (error) => {
        this.notification.error(this.notification.extractError(error));
        this.isBulkRunning.set(false);
      },
    });
  }

  createPromotion(): void {
    this.router.navigate(['/admin/promotions/create']);
  }

  viewPromotion(p: PromotionResponse): void {
    this.router.navigate(['/admin/promotions', p.id]);
  }

  /** Nhân bản: mở form tạo mới với dữ liệu chương trình hiện tại (chưa lưu). */
  duplicate(p: PromotionResponse): void {
    this.router.navigate(['/admin/promotions/create'], { state: { duplicateFrom: p } });
  }

  /** Đảo công tắc chương trình — dùng từ menu kebab. */
  toggleActive(p: PromotionResponse): void {
    if (!this.canDeactivate()) return;
    this.promotionService.bulkUpdateStatus([p.id], !p.active).subscribe({
      next: () => {
        this.notification.success(`Đã ${p.active ? 'tạm dừng' : 'bật'} "${p.name}"`);
        this.loadData();
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  trackByPromotionId(p: PromotionResponse): string {
    return p.id;
  }

  /** Badge màu theo trạng thái thời gian. */
  timeBadgeVariant(p: PromotionResponse): 'success' | 'info' | 'neutral' {
    switch (this.timeState(p)) {
      case 'running':
        return 'success';
      case 'upcoming':
        return 'info';
      default:
        return 'neutral';
    }
  }

  /** Trạng thái theo thời gian — BE không trả field này nên FE tự suy từ start/end. */
  timeState(p: PromotionResponse): 'running' | 'upcoming' | 'ended' {
    const now = Date.now();
    if (now < new Date(p.startDate).getTime()) {
      return 'upcoming';
    }
    if (now > new Date(p.endDate).getTime()) {
      return 'ended';
    }
    return 'running';
  }

  timeStateLabel(p: PromotionResponse): string {
    switch (this.timeState(p)) {
      case 'upcoming':
        return 'Sắp diễn ra';
      case 'ended':
        return 'Đã kết thúc';
      default:
        return 'Đang chạy';
    }
  }

  /** Mức giảm hiển thị: % hoặc số tiền kèm đơn vị "/ máy" (AMOUNT giảm mỗi máy). */
  discountLabel(p: PromotionResponse): string {
    return p.discountType === 'PERCENT'
      ? `${p.discountValue}%`
      : `${this.format(p.discountValue ?? 0)} / máy`;
  }

  discountTypeLabel(p: PromotionResponse): string {
    return p.discountType === 'PERCENT' ? 'Phần trăm' : 'Số tiền / máy';
  }

  /** Nhãn ngắn của loại phạm vi — dùng cho pill ở cột Phạm vi. */
  scopeTypeLabel(scope: ScopeType): string {
    switch (scope) {
      case 'ALL':
        return 'Toàn bộ đơn';
      case 'CATEGORY':
        return 'Danh mục';
      case 'BRAND':
        return 'Thương hiệu';
      default:
        return 'Sản phẩm';
    }
  }

  timeFilterLabel(state: 'running' | 'upcoming' | 'ended' | 'all'): string {
    switch (state) {
      case 'running':
        return 'Đang chạy';
      case 'upcoming':
        return 'Sắp chạy';
      case 'ended':
        return 'Đã kết thúc';
      default:
        return 'Tất cả';
    }
  }

  /** Phần trăm ngân sách đã dùng của một chương trình (null = không giới hạn). */
  budgetPercent(p: PromotionResponse): number | null {
    if (!p.usageLimit || p.usageLimit <= 0) return null;
    return Math.min(100, Math.round(((p.usedCount ?? 0) / p.usageLimit) * 100));
  }

  /** Màu thanh ngân sách theo ngưỡng: chạm trần / gần trần / còn nhiều. */
  budgetMeterClass(p: PromotionResponse): string {
    const pct = this.budgetPercent(p);
    if (pct === null) return 'bg-slate-300 dark:bg-slate-600';
    if (pct >= 100) return 'bg-danger-500';
    if (pct >= 75) return 'bg-warning-500';
    return 'bg-success-500';
  }

  /** Phạm vi hiển thị dạng chuỗi giá trị (cho dòng phụ dưới pill). */
  scopeValueText(p: PromotionResponse): string {
    const values = p.scopeValues ?? [];
    if (values.length === 0) return '';
    return values.join(', ');
  }

  scopeLabel(p: PromotionResponse): string {
    switch (p.scopeType) {
      case 'ALL':
        return 'Toàn bộ đơn';
      case 'CATEGORY':
        return `Danh mục (${p.scopeValues?.length ?? 0})`;
      case 'BRAND':
        return `Hãng: ${(p.scopeValues ?? []).join(', ')}`;
      default:
        return `Sản phẩm (${p.scopeValues?.length ?? 0})`;
    }
  }

  deactivate(p: PromotionResponse): void {
    this.promotionService.deactivate(p.id).subscribe({
      next: () => {
        this.notification.success(`Đã ngừng áp dụng "${p.name}"`);
        this.loadData();
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN');
  }
}
