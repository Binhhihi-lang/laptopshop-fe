import {
  Component,
  OnInit,
  AfterViewInit,
  signal,
  computed,
  inject,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { PromotionService } from '@core/services/promotion.service';
import { AuthService } from '@core/services/auth.service';
import { PromotionResponse } from '@core/models/promotion.model';
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
    this.promotionService.getPromotions().subscribe({
      next: (promotions) => {
        this.promotions.set(promotions);
        this.applyFilter();
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
  }

  applyFilter(): void {
    let filtered = this.promotions();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(term) || p.title?.toLowerCase().includes(term),
      );
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((p) => (status === 'active' ? p.active : !p.active));
    }

    const time = this.timeFilter();
    if (time !== 'all') {
      filtered = filtered.filter((p) => this.timeState(p) === time);
    }

    const dType = this.discountTypeFilter();
    if (dType !== 'all') {
      filtered = filtered.filter((p) => p.discountType === dType);
    }

    const scope = this.scopeFilter();
    if (scope !== 'all') {
      filtered = filtered.filter((p) => (p.scopeType ?? 'ALL') === scope);
    }

    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = sortCol === 'period' ? new Date(a.startDate).getTime() : (a as never)[sortCol];
        const bVal = sortCol === 'period' ? new Date(b.startDate).getTime() : (b as never)[sortCol];
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortDir === 'asc' ? result : -result;
      });
    }

    this.filteredPromotions.set(filtered);
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.applyFilter();
  }

  setTimeFilter(time: 'all' | 'running' | 'upcoming' | 'ended'): void {
    this.timeFilter.set(time);
    this.applyFilter();
  }

  setDiscountTypeFilter(type: 'all' | PromotionDiscountType): void {
    this.discountTypeFilter.set(type);
    this.applyFilter();
  }

  setScopeFilter(scope: 'all' | ScopeType): void {
    this.scopeFilter.set(scope);
    this.applyFilter();
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(event.column);
    this.sortDirection.set(event.direction);
    this.applyFilter();
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
    this.applyFilter();
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

  // ===== KPI =====
  runningCount = computed(() => this.promotions().filter((p) => this.timeState(p) === 'running').length);

  /** Đếm theo công tắc `active`, KHÁC `runningCount` (đếm theo khung thời gian). */
  inactiveCount = computed(() => this.promotions().filter((p) => !p.active).length);

  /** Tổng lượt đã dùng / tổng ngân sách (bỏ chương trình không giới hạn). */
  budgetUsage = computed(() => {
    const limited = this.promotions().filter((p) => p.usageLimit && p.usageLimit > 0);
    const used = limited.reduce((s, p) => s + (p.usedCount ?? 0), 0);
    const limit = limited.reduce((s, p) => s + (p.usageLimit ?? 0), 0);
    return { used, limit, percent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0 };
  });

  // ===== Thẻ thống kê (chân thẻ theo mockup) =====

  /** % chương trình đang còn công tắc bật. */
  activePercent = computed(() => {
    const total = this.promotions().length;
    if (total === 0) return 0;
    return Math.round(((total - this.inactiveCount()) / total) * 100);
  });

  /** % chương trình đã bị tắt. */
  inactivePercent = computed(() => {
    const total = this.promotions().length;
    return total > 0 ? Math.round((this.inactiveCount() / total) * 100) : 0;
  });

  /** Số loại phạm vi đang được dùng — chân thẻ "N loại phạm vi". */
  scopeTypeCount = computed(
    () => new Set(this.promotions().map((p) => p.scopeType ?? 'ALL')).size,
  );

  upcomingCount = computed(
    () => this.promotions().filter((p) => this.timeState(p) === 'upcoming').length,
  );

  endedCount = computed(
    () => this.promotions().filter((p) => this.timeState(p) === 'ended').length,
  );

  runningPercent = computed(() => {
    const total = this.promotions().length;
    return total > 0 ? Math.round((this.runningCount() / total) * 100) : 0;
  });

  /** Số chương trình đã dùng hết ngân sách. */
  hitCapCount = computed(
    () =>
      this.promotions().filter((p) => p.usageLimit && p.usageLimit > 0 && p.usedCount >= p.usageLimit)
        .length,
  );

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
