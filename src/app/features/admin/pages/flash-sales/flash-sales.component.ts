import {
  Component,
  OnInit,
  AfterViewInit,
  DestroyRef,
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
import { FlashSaleService } from '@core/services/flash-sale.service';
import { AuthService } from '@core/services/auth.service';
import { FlashSaleResponse, FlashSaleSummary } from '@core/models/flash-sale.model';
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent, ColumnPickerComponent, StatCardComponent } from '@shared/components';

/**
 * Danh sách phiên flash sale (Sprint 4c).
 * BE không có bulk delete/status → không dùng BulkToolbar.
 */
@Component({
  selector: 'app-flash-sales',
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
    StatCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './flash-sales.html',
})
export class FlashSalesComponent implements OnInit, AfterViewInit {
  private readonly flashSaleService = inject(FlashSaleService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  canDelete = computed(() => this.authService.hasPermission('DELETE_FLASH_SALE'));
  canUpdate = computed(() => this.authService.hasPermission('UPDATE_FLASH_SALE'));

  /** Một trang dữ liệu lấy từ server — không còn tải toàn bộ danh sách. */
  flashSales = signal<FlashSaleResponse[]>([]);
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);

  // ===== Phân trang phía server =====
  readonly pageSize = 20;
  readonly currentPage = signal(0);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  // ===== KPI lấy từ endpoint summary (đếm toàn bộ, không phải trang hiện tại) =====
  readonly summary = signal<FlashSaleSummary>({
    total: 0,
    running: 0,
    upcoming: 0,
    totalItems: 0,
    totalStock: 0,
    totalSold: 0,
    sessionsWithItems: 0,
  });

  searchTerm = signal('');
  stateFilter = signal<'all' | 'running' | 'upcoming' | 'ended'>('all');
  activeFilter = signal<'all' | 'on' | 'off'>('all');
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  /** Cột bảng -> tên property của BE, dùng cho tham số `sort`. */
  private static readonly SORT_FIELDS: Record<string, string> = {
    name: 'name',
    period: 'startAt',
    updatedAt: 'updatedAt',
  };

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  columns = signal<Column<FlashSaleResponse>[]>([
    { key: 'name', label: 'Phiên', visible: true, sortable: true },
    { key: 'period', label: 'Thời gian', visible: true, sortable: true, align: 'left' },
    { key: 'items', label: 'Sản phẩm', visible: true, align: 'center' },
    { key: 'sold', label: 'Tiến độ bán', visible: true, align: 'left' },
    { key: 'state', label: 'Trạng thái', visible: true, width: '150px', align: 'center' },
    { key: 'updatedAt', label: 'Ngày sửa', visible: false, sortable: true, align: 'center' },
  ]);

  /** Server đã lọc theo trạng thái thời gian nên chỉ cần đọc thẳng danh sách. */
  visibleSales = computed(() => this.flashSales());

  @ViewChild('nameColumn') nameColumn!: TemplateRef<any>;
  @ViewChild('periodColumn') periodColumn!: TemplateRef<any>;
  @ViewChild('itemsColumn') itemsColumn!: TemplateRef<any>;
  @ViewChild('soldColumn') soldColumn!: TemplateRef<any>;
  @ViewChild('stateColumn') stateColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn') updatedAtColumn!: TemplateRef<any>;

  actions: TableAction<FlashSaleResponse>[] = [
    {
      label: 'Xem chi tiết phiên',
      icon: 'visibility',
      handler: (row) => this.viewFlashSale(row),
      variant: 'ghost',
    },
    {
      label: 'Sửa phiên',
      icon: 'edit',
      handler: (row) => this.router.navigate(['/admin/flash-sales', row.id, 'edit']),
      variant: 'ghost',
      disabled: () => !this.canUpdate(),
    },
    {
      label: 'Tạm dừng / Mở lại',
      icon: 'power_settings_new',
      handler: (row) => this.toggleActive(row),
      variant: 'ghost',
      disabled: () => !this.canUpdate(),
    },
    {
      label: 'Xóa',
      icon: 'delete',
      handler: (row) => this.remove(row),
      variant: 'danger',
      disabled: () => !this.canDelete(),
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Gắn template vào cột SAU khi view khởi tạo — @ViewChild chỉ có giá trị ở
   * ngAfterViewInit. Thiếu bước này thì bảng in giá trị thô
   * (`[object Object]` cho mảng items) thay vì nội dung đã định dạng.
   */
  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          name: this.nameColumn,
          period: this.periodColumn,
          items: this.itemsColumn,
          sold: this.soldColumn,
          state: this.stateColumn,
          updatedAt: this.updatedAtColumn,
        };
        return templateMap[col.key] ? { ...col, template: templateMap[col.key] } : col;
      }),
    );
  }

  loadData(): void {
    this.loadPage();
    this.loadSummary();
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    // UI dùng 'all' cho "không lọc"; API chỉ nhận giá trị thật.
    const st = this.stateFilter();
    const stateParam = st === 'all' ? undefined : st;
    this.flashSaleService
      .getFlashSalePage({
        keyword: this.searchTerm().trim() || undefined,
        active: this.activeFilter() === 'all' ? undefined : this.activeFilter() === 'on',
        state: stateParam,
        page: this.currentPage(),
        size: this.pageSize,
        sort: this.sortParam(),
      })
      .subscribe({
        next: (page) => {
          this.flashSales.set(page.content ?? []);
          this.totalElements.set(page.totalElements);
          this.totalPages.set(page.totalPages);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.flashSales.set([]);
          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.permissionDenied.set(true);
          } else {
            this.notification.error(this.notification.extractError(error));
          }
          this.isLoading.set(false);
        },
      });
  }

  /** KPI đếm trên toàn bộ dữ liệu, không phải trang đang xem. */
  private loadSummary(): void {
    this.flashSaleService.getSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      // Lỗi summary không chặn bảng — KPI giữ số cũ.
      error: () => undefined,
    });
  }

  private sortParam(): string | undefined {
    const column = this.sortColumn();
    if (!column) {
      return undefined;
    }
    const field = FlashSalesComponent.SORT_FIELDS[column];
    return field ? `${field},${this.sortDirection()}` : undefined;
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.reloadFromFirstPage();
    }, 300);
  }

  onPrevPage(): void {
    if (this.currentPage() <= 0) {
      return;
    }
    this.currentPage.update((p) => p - 1);
    this.loadPage();
  }

  onNextPage(): void {
    if (this.currentPage() >= this.totalPages() - 1) {
      return;
    }
    this.currentPage.update((p) => p + 1);
    this.loadPage();
  }

  /** app-table phát số trang 1-based; state nội bộ 0-based. */
  onPageChange(page: number): void {
    if (page - 1 === this.currentPage()) {
      return;
    }
    this.currentPage.set(page - 1);
    this.loadPage();
  }

  private reloadFromFirstPage(): void {
    this.currentPage.set(0);
    this.loadPage();
  }

  setStateFilter(state: 'all' | 'running' | 'upcoming' | 'ended'): void {
    this.stateFilter.set(state);
    this.reloadFromFirstPage();
  }

  setActiveFilter(active: 'all' | 'on' | 'off'): void {
    this.activeFilter.set(active);
    this.reloadFromFirstPage();
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(event.column);
    this.sortDirection.set(event.direction);
    this.reloadFromFirstPage();
  }

  toggleColumn(columnKey: string): void {
    this.columns.set(
      this.columns().map((c) => (c.key === columnKey ? { ...c, visible: !c.visible } : c)),
    );
  }

  clearFilters(): void {
    clearTimeout(this.searchTimer);
    this.searchTerm.set('');
    this.stateFilter.set('all');
    this.activeFilter.set('all');
    this.reloadFromFirstPage();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.stateFilter() !== 'all' ||
      this.activeFilter() !== 'all'
    );
  }

  createFlashSale(): void {
    this.router.navigate(['/admin/flash-sales/create']);
  }

  /** Bấm vào dòng → xem chi tiết phiên (khớp promotion/voucher). */
  viewFlashSale(s: FlashSaleResponse): void {
    this.router.navigate(['/admin/flash-sales', s.id]);
  }

  /** Đảo công tắc phiên — dùng từ menu kebab. */
  toggleActive(s: FlashSaleResponse): void {
    if (!this.canUpdate()) {
      return;
    }
    this.flashSaleService.setActive(s.id, !s.active).subscribe({
      next: (updated) => {
        this.notification.success(updated.active ? 'Đã mở lại phiên' : 'Đã tạm dừng phiên');
        this.loadData();
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  // ===== KPI (số liệu toàn hệ thống từ /summary) =====

  runningCount = computed(() => this.summary().running);

  totalItemCount = computed(() => this.summary().totalItems);

  totalStockAll = computed(() => this.summary().totalStock);

  totalSoldAll = computed(() => this.summary().totalSold);

  soldPercentAll = computed(() => {
    const stock = this.totalStockAll();
    return stock > 0 ? Math.min(100, Math.round((this.totalSoldAll() / stock) * 100)) : 0;
  });

  // ===== Thẻ thống kê (chân thẻ theo mockup) =====

  upcomingCount = computed(() => this.summary().upcoming);

  /** % số phiên đang chạy so với tổng. */
  runningPercent = computed(() => {
    const total = this.summary().total;
    return total > 0 ? Math.round((this.runningCount() / total) * 100) : 0;
  });

  /** Số phiên có chứa sản phẩm — chân thẻ "Trải trên N phiên". */
  sessionsWithItems = computed(() => this.summary().sessionsWithItems);

  /**
   * Giờ kết thúc của phiên đang chạy, để chân thẻ "Kết thúc HH:MM".
   * Chỉ tìm trong TRANG HIỆN TẠI — /summary không trả mốc giờ.
   */
  runningEndTime = computed(() => {
    const running = this.flashSales().find((s) => this.state(s) === 'running');
    if (!running) {
      return '';
    }
    return new Date(running.endAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  /** Số suất còn lại — chân thẻ "còn X suất". flashStock đã là số còn lại. */
  remainingStock = computed(() => this.totalStockAll());

  /** % phiên chưa kết thúc trên toàn hệ thống (ended = total - running - upcoming). */
  sessionsPercent = computed(() => {
    const total = this.summary().total;
    if (total === 0) return 0;
    const ended = Math.max(0, total - this.summary().running - this.summary().upcoming);
    return Math.round(((total - ended) / total) * 100);
  });

  /** % phiên có chứa sản phẩm. */
  sessionsWithItemsPercent = computed(() => {
    const total = this.summary().total;
    return total > 0 ? Math.round((this.sessionsWithItems() / total) * 100) : 0;
  });

  soldPercent(s: FlashSaleResponse): number {
    const stock = this.totalStock(s);
    return stock > 0 ? Math.min(100, Math.round((this.totalSold(s) / stock) * 100)) : 0;
  }

  /** Đổi màu thanh tiến độ theo ngưỡng: cạn hàng / gần cạn / còn nhiều. */
  soldMeterClass(s: FlashSaleResponse): string {
    const pct = this.soldPercent(s);
    if (pct >= 100) return 'bg-danger-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-success-500';
  }

  /**
   * Trạng thái theo thời gian. BE có `running` nhưng đó là tính tại lúc trả
   * response — FE tự suy để bảng không hiện "Đang chạy" cho phiên đã hết.
   */
  state(s: FlashSaleResponse): 'running' | 'upcoming' | 'ended' {
    if (!s.active) {
      return 'ended';
    }
    const now = Date.now();
    if (now < new Date(s.startAt).getTime()) {
      return 'upcoming';
    }
    if (now > new Date(s.endAt).getTime()) {
      return 'ended';
    }
    return 'running';
  }

  stateLabel(s: FlashSaleResponse): string {
    if (!s.active) {
      return 'Đã tắt';
    }
    switch (this.state(s)) {
      case 'upcoming':
        return 'Sắp diễn ra';
      case 'ended':
        return 'Đã kết thúc';
      default:
        return 'Đang chạy';
    }
  }

  stateVariant(s: FlashSaleResponse): 'success' | 'info' | 'neutral' | 'danger' {
    if (!s.active) {
      return 'danger';
    }
    switch (this.state(s)) {
      case 'upcoming':
        return 'info';
      case 'ended':
        return 'neutral';
      default:
        return 'success';
    }
  }

  /** Tổng suất phiên = còn lại (flashStock) + đã bán (soldInFlash). */
  totalStock(s: FlashSaleResponse): number {
    return (s.items ?? []).reduce((sum, i) => sum + (i.flashStock ?? 0) + (i.soldInFlash ?? 0), 0);
  }

  totalSold(s: FlashSaleResponse): number {
    return (s.items ?? []).reduce((sum, i) => sum + (i.soldInFlash ?? 0), 0);
  }

  remove(s: FlashSaleResponse): void {
    if (!this.canDelete()) {
      return;
    }
    this.flashSaleService.deleteFlashSale(s.id).subscribe({
      next: () => {
        this.notification.success(`Đã xóa phiên "${s.name}"`);
        this.loadData();
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  trackBySaleId(s: FlashSaleResponse): string {
    return s.id;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
