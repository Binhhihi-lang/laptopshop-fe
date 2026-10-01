import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { VoucherService } from '@core/services/voucher.service';
import { AuthService } from '@core/services/auth.service';
import { VoucherResponse, VoucherType } from '@core/models/voucher.model';
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  PageHeaderComponent,
  ColumnPickerComponent,
  BulkToolbarComponent,
  BulkToolbarButton,
  StatCardComponent,
  SelectComponent,
  SelectOption,
} from '@shared/components';
// ConfirmDialogComponent được mở qua MatDialog (không dùng trực tiếp trong template)

@Component({
  selector: 'app-vouchers',
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
    BulkToolbarComponent,
    StatCardComponent,
    SelectComponent,
    EmptyStateComponent,
  ],
  templateUrl: './vouchers.html',
  styleUrl: './vouchers.css',
})
export class VouchersComponent implements OnInit, AfterViewInit {
  private readonly voucherService = inject(VoucherService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  canDeleteVoucher = computed(() => this.authService.hasPermission('DELETE_VOUCHER'));

  vouchers = signal<VoucherResponse[]>([]);
  isLoading = signal(false);
  isBulkDeleting = signal(false);
  permissionDenied = signal<boolean>(false);

  searchTerm = signal('');
  statusFilter = signal<'all' | 'running' | 'soon' | 'ended' | 'paused'>('all');
  discountTypeFilter = signal<'all' | 'PERCENT' | 'AMOUNT'>('all');
  voucherTypeFilter = signal<'all' | VoucherType>('all');

  /** Lựa chọn cho 3 dropdown lọc — dùng app-select (có chevron tự vẽ). */
  readonly statusOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'running', label: 'Đang chạy' },
    { value: 'soon', label: 'Sắp chạy' },
    { value: 'ended', label: 'Đã kết thúc' },
    { value: 'paused', label: 'Tạm dừng' },
  ];
  readonly discountTypeOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'PERCENT', label: 'Phần trăm' },
    { value: 'AMOUNT', label: 'Số tiền' },
  ];
  readonly voucherTypeOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'PUBLIC', label: 'Công khai (PUBLIC)' },
    { value: 'ASSIGNED', label: 'Gán cho khách (ASSIGNED)' },
    { value: 'GIFT', label: 'Tặng kèm (GIFT)' },
  ];

  selectedVoucherIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  columns = signal<Column<VoucherResponse>[]>([
    { key: 'code', label: 'Voucher', visible: true, sortable: true },
    { key: 'discount', label: 'Mức giảm', visible: true, align: 'left' },
    { key: 'condition', label: 'Điều kiện', visible: true, align: 'left' },
    { key: 'period', label: 'Thời gian', visible: true, align: 'left' },
    { key: 'usage', label: 'Lượt dùng', visible: true, align: 'left' },
    { key: 'status', label: 'Trạng thái', visible: true, width: '140px', align: 'center' },
  ]);

  filteredVouchers = signal<VoucherResponse[]>([]);

  @ViewChild('codeColumn') codeColumn!: TemplateRef<any>;
  @ViewChild('discountColumn') discountColumn!: TemplateRef<any>;
  @ViewChild('conditionColumn') conditionColumn!: TemplateRef<any>;
  @ViewChild('periodColumn') periodColumn!: TemplateRef<any>;
  @ViewChild('usageColumn') usageColumn!: TemplateRef<any>;
  @ViewChild('statusColumn') statusColumn!: TemplateRef<any>;

  actions: TableAction<VoucherResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewVoucher(row),
      variant: 'ghost',
    },
    {
      label: 'Sửa voucher',
      icon: 'edit',
      handler: (row) => this.editVoucher(row),
      variant: 'ghost',
    },
    {
      label: 'Nhân bản mã',
      icon: 'content_copy',
      handler: (row) => this.duplicateVoucher(row),
      variant: 'ghost',
    },
    {
      label: 'Bật / Tạm dừng',
      icon: 'power_settings_new',
      handler: (row) => this.toggleStatus(row),
      variant: 'ghost',
    },
    {
      label: 'Khách đã nhận',
      icon: 'group',
      handler: (row) => this.viewVoucher(row),
      variant: 'ghost',
    },
    ...(this.authService.hasPermission('DELETE_VOUCHER')
      ? [
          {
            label: 'Xóa voucher',
            icon: 'delete',
            handler: (row) => this.deleteVoucher(row),
            variant: 'danger',
          } as TableAction<VoucherResponse>,
        ]
      : []),
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.voucherService.getVouchers().subscribe({
      next: (vouchers) => {
        this.vouchers.set(vouchers);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
        this.isLoading.set(false);
      },
    });
  }

  applyFilter() {
    let filtered = this.vouchers();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(term) ||
          (c.title ?? '').toLowerCase().includes(term),
      );
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((c) => this.statusKey(c) === status);
    }

    const dType = this.discountTypeFilter();
    if (dType !== 'all') {
      filtered = filtered.filter((c) => this.discountKind(c) === dType);
    }

    const vType = this.voucherTypeFilter();
    if (vType !== 'all') {
      filtered = filtered.filter((c) => this.voucherTypeOf(c) === vType);
    }

    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any = (a as any)[sortCol];
        let bVal: any = (b as any)[sortCol];
        if (sortCol === 'expiryDate') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortDir === 'asc' ? result : -result;
      });
    }

    this.filteredVouchers.set(filtered);
  }

  onSearchChange() {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'running' | 'soon' | 'ended' | 'paused') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.applyFilter();
    }
  }

  setDiscountTypeFilter(type: 'all' | 'PERCENT' | 'AMOUNT') {
    if (this.discountTypeFilter() !== type) {
      this.discountTypeFilter.set(type);
      this.applyFilter();
    }
  }

  setVoucherTypeFilter(type: 'all' | VoucherType) {
    if (this.voucherTypeFilter() !== type) {
      this.voucherTypeFilter.set(type);
      this.applyFilter();
    }
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.discountTypeFilter.set('all');
    this.voucherTypeFilter.set('all');
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.discountTypeFilter() !== 'all' ||
      this.voucherTypeFilter() !== 'all'
    );
  }

  // ===== KPI =====

  runningCount = computed(
    () => this.vouchers().filter((v) => this.statusKey(v) === 'running').length,
  );

  soonCount = computed(() => this.vouchers().filter((v) => this.statusKey(v) === 'soon').length);

  pausedCount = computed(
    () => this.vouchers().filter((v) => this.statusKey(v) === 'paused').length,
  );

  /** Tổng lượt đã dùng / tổng lượt phát — thanh meter ở thẻ KPI. */
  totalUsed = computed(() => this.vouchers().reduce((s, v) => s + (v.usedCount ?? 0), 0));

  totalLimit = computed(() => this.vouchers().reduce((s, v) => s + (v.usageLimit ?? 0), 0));

  usedPercent = computed(() => {
    const limit = this.totalLimit();
    return limit > 0 ? Math.min(100, Math.round((this.totalUsed() / limit) * 100)) : 0;
  });

  /** Phân bố kiểu phát hành, hiện ở dòng phụ thẻ "Tổng voucher". */
  /** % voucher đang chạy — chân thẻ KPI. */
  runningPercent = computed(() => {
    const total = this.vouchers().length;
    return total > 0 ? Math.round((this.runningCount() / total) * 100) : 0;
  });

  /** % voucher chưa bị tạm dừng — chân thẻ "Tổng N voucher". */
  notPausedPercent = computed(() => {
    const total = this.vouchers().length;
    return total > 0 ? Math.round(((total - this.pausedCount()) / total) * 100) : 0;
  });

  typeBreakdown = computed(() => {
    const publicCount = this.vouchers().filter((v) => this.voucherTypeOf(v) === 'PUBLIC').length;
    const assigned = this.vouchers().filter((v) => this.voucherTypeOf(v) === 'ASSIGNED').length;
    const parts: string[] = [`${publicCount} công khai`];
    if (assigned > 0) parts.push(`${assigned} gán`);
    return parts.join(' · ');
  });

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          code: this.codeColumn,
          discount: this.discountColumn,
          condition: this.conditionColumn,
          period: this.periodColumn,
          usage: this.usageColumn,
          status: this.statusColumn,
        };
        if (templateMap[col.key]) {
          return { ...col, template: templateMap[col.key] };
        }
        return col;
      }),
    );
  }

  viewVoucher(voucher: VoucherResponse) {
    this.router.navigate(['/admin/vouchers', voucher.id]);
  }

  editVoucher(voucher: VoucherResponse) {
    this.router.navigate(['/admin/vouchers', voucher.id, 'edit']);
  }

  createVoucher() {
    this.router.navigate(['/admin/vouchers/create']);
  }

  /** Nhân bản: sang form tạo mới với dữ liệu voucher cũ đã điền sẵn. */
  duplicateVoucher(voucher: VoucherResponse): void {
    this.router.navigate(['/admin/vouchers/create'], {
      state: { duplicateFrom: voucher },
    });
  }

  /** Xuất danh sách đang lọc ra CSV — mở bằng Excel. */
  exportCsv(): void {
    const rows = this.filteredVouchers();
    if (rows.length === 0) {
      this.notification.warn('Không có voucher nào để xuất');
      return;
    }
    const header = ['Mã', 'Tiêu đề', 'Mức giảm', 'Điều kiện', 'Bắt đầu', 'Hết hạn', 'Đã dùng', 'Tổng lượt', 'Trạng thái'];
    const lines = rows.map((v) => [
      v.code,
      v.title ?? '',
      this.discountLabel(v),
      this.conditionLabel(v),
      v.startDate ? this.formatDate(v.startDate) : 'Hiệu lực ngay',
      this.formatDate(v.expiryDate),
      String(v.usedCount ?? 0),
      v.usageLimit > 0 ? String(v.usageLimit) : 'Không giới hạn',
      this.getStatusBadge(v).label,
    ]);
    // Bọc trong dấu ngoặc kép + nhân đôi ngoặc kép bên trong để CSV không vỡ cột.
    const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
    const csv = [header, ...lines].map((line) => line.map(escape).join(',')).join('\r\n');
    // BOM để Excel đọc đúng tiếng Việt.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  deleteVoucher(voucher: VoucherResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa voucher "${voucher.code}"? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.voucherService.deleteVoucher(voucher.id).subscribe({
          next: () => {
            this.notification.success('Xóa voucher thành công');
            this.loadData();
          },
          error: () => {},
        });
      }
    });
  }

  toggleColumn(columnKey: string): void {
    this.columns.update((cols) =>
      cols.map((c) => (c.key === columnKey ? { ...c, visible: !c.visible } : c)),
    );
  }

  onSort(sortData: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(sortData.column);
    this.sortDirection.set(sortData.direction);
    this.applyFilter();
  }

  selectedVouchers = computed(() =>
    this.vouchers().filter((c) => this.selectedVoucherIds().includes(c.id)),
  );
  selectedCount = computed(() => this.selectedVoucherIds().length);

  onSelectionChange(rows: VoucherResponse[]): void {
    this.selectedVoucherIds.set(rows.map((r) => r.id));
  }

  bulkButtons = computed<BulkToolbarButton[]>(() => {
    const buttons: BulkToolbarButton[] = [
      {
        label: 'Kích hoạt',
        icon: 'check_circle',
        variant: 'success',
        handler: () => this.bulkActivate(),
      },
      { label: 'Khóa', icon: 'block', variant: 'secondary', handler: () => this.bulkDeactivate() },
    ];
    if (this.canDeleteVoucher()) {
      buttons.push({
        label: 'Xóa',
        icon: 'delete',
        variant: 'danger',
        handler: () => this.bulkDelete(),
        disabled: this.isBulkDeleting(),
      });
    }
    return buttons;
  });

  bulkDelete(): void {
    if (this.selectedCount() === 0) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${this.selectedCount()} voucher đã chọn? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;
      const ids = [...this.selectedVoucherIds()];
      this.isBulkDeleting.set(true);
      this.voucherService.bulkDeleteVouchers(ids).subscribe({
        next: () => {
          this.notification.success('Xóa voucher thành công');
          this.loadData();
          this.selectedVoucherIds.set([]);
          this.isBulkDeleting.set(false);
        },
        error: () => {
          this.isBulkDeleting.set(false);
        },
      });
    });
  }

  bulkActivate(): void {
    if (this.selectedCount() === 0) return;
    this.updateBulkStatus(true);
  }

  bulkDeactivate(): void {
    if (this.selectedCount() === 0) return;
    this.updateBulkStatus(false);
  }

  private updateBulkStatus(active: boolean): void {
    const ids = [...this.selectedVoucherIds()];
    this.notification.info(
      `Đang ${active ? 'kích hoạt' : 'khóa'} ${ids.length} voucher...`,
      2000,
    );
    this.voucherService.bulkUpdateVoucherStatus(ids, active).subscribe({
      next: () => {
        this.notification.success(`${active ? 'Kích hoạt' : 'Khóa'} voucher thành công`);
        this.loadData();
        this.selectedVoucherIds.set([]);
      },
      error: (error) => {},
    });
  }

  toggleStatus(voucher: VoucherResponse): void {
    const newActive = !voucher.active;
    this.notification.info(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} voucher ${voucher.code}...`,
      2000,
    );
    this.voucherService.bulkUpdateVoucherStatus([voucher.id], newActive).subscribe({
      next: () => {
        this.notification.success(`${newActive ? 'Kích hoạt' : 'Khóa'} voucher thành công`);
        this.loadData();
      },
      error: (error) => {},
    });
  }

  isExpired(voucher: VoucherResponse): boolean {
    return !!voucher.expiryDate && new Date(voucher.expiryDate).getTime() < Date.now();
  }

  /** Kiểu giảm: số tiền được ưu tiên trước (khớp thứ tự tính của BE). */
  discountKind(voucher: VoucherResponse): 'AMOUNT' | 'PERCENT' | 'NONE' {
    if (voucher.discountAmount !== null && voucher.discountAmount !== undefined) {
      return 'AMOUNT';
    }
    if (voucher.discountPercent !== null && voucher.discountPercent !== undefined) {
      return 'PERCENT';
    }
    return 'NONE';
  }

  voucherTypeOf(voucher: VoucherResponse): VoucherType {
    return voucher.voucherType ?? 'PUBLIC';
  }

  voucherTypeLabel(voucher: VoucherResponse): string {
    return this.voucherTypeOf(voucher) === 'ASSIGNED' ? 'Gán cho khách' : 'Công khai';
  }

  /** Mức giảm kèm trần — mockup: "10% (tối đa 2.000.000 ₫)". */
  discountLabel(voucher: VoucherResponse): string {
    const kind = this.discountKind(voucher);
    if (kind === 'AMOUNT') {
      return this.money(voucher.discountAmount);
    }
    if (kind === 'PERCENT') {
      const cap = voucher.maxDiscountAmount;
      const base = `${voucher.discountPercent}%`;
      return cap && cap > 0 ? `${base} (tối đa ${this.money(cap)})` : base;
    }
    return '—';
  }

  /** Điều kiện áp dụng — mockup `vCondLabel`. */
  conditionLabel(voucher: VoucherResponse): string {
    const parts: string[] = [];
    if (voucher.minOrderValue && voucher.minOrderValue > 0) {
      parts.push(`Đơn từ ${this.money(voucher.minOrderValue)}`);
    }
    if (voucher.scopeType && voucher.scopeType !== 'ALL') {
      parts.push(this.scopeLabel(voucher));
    }
    if (voucher.perUserLimit && voucher.perUserLimit > 0) {
      parts.push(`${voucher.perUserLimit} lần/khách`);
    }
    return parts.length ? parts.join(' · ') : 'Không điều kiện';
  }

  scopeLabel(voucher: VoucherResponse): string {
    const name = {
      ALL: 'Toàn bộ đơn',
      CATEGORY: 'Danh mục',
      BRAND: 'Thương hiệu',
      PRODUCT: 'Sản phẩm',
    }[voucher.scopeType ?? 'ALL'];
    const values = voucher.scopeValues ?? [];
    return values.length ? `${name}: ${values.join(', ')}` : name;
  }

  /**
   * Trạng thái 4 nhãn (mockup `P_ST`): Tạm dừng khi công tắc tắt; còn lại suy
   * theo mốc thời gian.
   */
  statusKey(voucher: VoucherResponse): 'running' | 'soon' | 'ended' | 'paused' {
    if (!voucher.active) {
      return 'paused';
    }
    const now = Date.now();
    if (voucher.startDate && new Date(voucher.startDate).getTime() > now) {
      return 'soon';
    }
    if (voucher.expiryDate && new Date(voucher.expiryDate).getTime() < now) {
      return 'ended';
    }
    return 'running';
  }

  getStatusBadge(voucher: VoucherResponse): {
    label: string;
    variant: 'success' | 'info' | 'neutral' | 'warning';
  } {
    switch (this.statusKey(voucher)) {
      case 'soon':
        return { label: 'Sắp chạy', variant: 'info' };
      case 'ended':
        return { label: 'Đã kết thúc', variant: 'neutral' };
      case 'paused':
        return { label: 'Tạm dừng', variant: 'warning' };
      default:
        return { label: 'Đang chạy', variant: 'success' };
    }
  }

  /** % lượt đã dùng của một voucher — thanh meter ở cột "Lượt dùng". */
  usagePercent(voucher: VoucherResponse): number {
    const limit = voucher.usageLimit ?? 0;
    return limit > 0 ? Math.min(100, Math.round(((voucher.usedCount ?? 0) / limit) * 100)) : 0;
  }

  usageMeterClass(voucher: VoucherResponse): string {
    const pct = this.usagePercent(voucher);
    if (pct >= 100) return 'bg-danger-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-success-500';
  }

  money(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByVoucherId(voucher: VoucherResponse): string {
    return voucher.id;
  }
}
