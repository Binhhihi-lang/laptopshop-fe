import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '@core/services/order.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import {
  AdminOrder,
  AdminOrderFilter,
  OrderStats,
  OrderStatus,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
} from '@core/models/order.model';

// Shared components
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { PageHeaderComponent, BulkToolbarComponent, BulkToolbarButton } from '@shared/components';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    TableComponent,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    EmptyStateComponent,
    StatCardComponent,
    PaginationComponent,
    PageHeaderComponent,
    BulkToolbarComponent,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);
  protected readonly router = inject(Router);

  canUpdateOrder = computed(() => this.authService.hasPermission('UPDATE_ORDER'));

  // Expose hằng số cho template (Angular template chỉ gọi được thành viên lớp)
  readonly PAYMENT_STATUS_LABEL = PAYMENT_STATUS_LABEL;

  // Data signals
  orders = signal<AdminOrder[]>([]);
  stats = signal<OrderStats | null>(null);
  totalElements = signal(0);
  totalPages = signal(0);

  // Loading states
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);

  // Filter signals (server-side — mỗi lần đổi là gọi lại API)
  keyword = signal('');
  statusFilter = signal<OrderStatus | ''>('');
  paymentStatusFilter = signal<'' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'>('');
  fromDate = signal('');
  toDate = signal('');
  page = signal(0);
  pageSize = 10;
  sort = signal('orderDate,desc');

  // UI state
  selectedOrderIds = signal<string[]>([]);

  // Column definitions
  columns = signal<Column<AdminOrder>[]>([
    { key: 'product', label: 'Sản phẩm', visible: true },
    { key: 'orderCode', label: 'Mã đơn', visible: true, width: '130px', align: 'left' },
    {
      key: 'orderDate',
      label: 'Ngày đặt',
      visible: true,
      width: '150px',
      sortable: true,
      align: 'left',
    },
    { key: 'customer', label: 'Khách hàng', visible: true, width: '180px', align: 'left' },
    {
      key: 'totalPrice',
      label: 'Tổng tiền',
      visible: true,
      width: '130px',
      align: 'right',
      sortable: true,
    },
    { key: 'status', label: 'Trạng thái', visible: true, width: '130px', align: 'center' },
    { key: 'payment', label: 'Thanh toán', visible: true, width: '150px', align: 'center' },
  ]);

  // Dropdown options
  statusOptions = computed<SelectOption[]>(() =>
    ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] })),
  );
  paymentStatusOptions = computed<SelectOption[]>(() =>
    PAYMENT_STATUSES.map((p) => ({ value: p, label: PAYMENT_STATUS_LABEL[p] })),
  );

  actions: TableAction<AdminOrder>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewOrder(row),
      variant: 'ghost',
    },
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.permissionDenied.set(false);

    forkJoin({
      stats: this.orderService.getOrderStats(),
      page: this.orderService.getOrders(this.buildFilter()),
    }).subscribe({
      next: ({ stats, page }) => {
        this.stats.set(stats);
        this.orders.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
      },
    });
  }

  private buildFilter(): AdminOrderFilter {
    return {
      status: this.statusFilter() || undefined,
      paymentStatus: this.paymentStatusFilter() || undefined,
      keyword: this.keyword().trim() || undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      page: this.page(),
      size: this.pageSize,
      sort: this.sort(),
    };
  }

  applyFilters() {
    this.page.set(0);
    this.loadData();
  }

  onStatusFilterChange(value: string) {
    this.statusFilter.set((value || '') as OrderStatus | '');
    this.applyFilters();
  }

  onPaymentFilterChange(value: string) {
    this.paymentStatusFilter.set((value || '') as '' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED');
    this.applyFilters();
  }

  clearFilters() {
    this.keyword.set('');
    this.statusFilter.set('');
    this.paymentStatusFilter.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      this.keyword().trim() !== '' ||
      this.statusFilter() !== '' ||
      this.paymentStatusFilter() !== '' ||
      this.fromDate() !== '' ||
      this.toDate() !== ''
    );
  }

  goPage(p: number) {
    if (p >= 0 && p < this.totalPages()) {
      this.page.set(p);
      this.loadData();
    }
  }

  // Template không hỗ trợ `as` union → tách ra computed
  sortColumn = computed(() => {
    const s = this.sort();
    return s.includes(',') ? s.split(',')[0] : '';
  });
  sortDirection = computed<'asc' | 'desc'>(() => {
    const s = this.sort();
    return s.includes(',') && s.split(',')[1] === 'asc' ? 'asc' : 'desc';
  });

  onSort(sortData: { column: string; direction: 'asc' | 'desc' }): void {
    this.sort.set(`${sortData.column},${sortData.direction}`);
    this.page.set(0);
    this.loadData();
  }

  viewOrder(order: AdminOrder) {
    this.router.navigate(['/admin/orders', order.id]);
  }

  // Selection + bulk status (chỉ hiện các bước chuyển mà TẤT CẢ đơn đã chọn đều cho phép)
  selectedOrders = computed(() =>
    this.orders().filter((o) => this.selectedOrderIds().includes(o.id)),
  );
  selectedCount = computed(() => this.selectedOrderIds().length);

  onSelectionChange(rows: AdminOrder[]): void {
    this.selectedOrderIds.set(rows.map((r) => r.id));
  }

  bulkStatusButtons = computed<BulkToolbarButton[]>(() => {
    if (this.selectedCount() === 0 || !this.canUpdateOrder()) {
      return [];
    }
    const sels = this.selectedOrders();
    const common = ORDER_STATUSES.filter((s) =>
      sels.every((o) => o.allowedNextStatuses?.includes(s)),
    );
    return common.map((s) => ({
      label: ORDER_STATUS_LABEL[s],
      icon: 'compare_arrows',
      variant: s === 'CANCELLED' ? 'danger' : 'primary',
      handler: () => this.bulkUpdate(s),
    }));
  });

  bulkUpdate(status: OrderStatus): void {
    const ids = [...this.selectedOrderIds()];
    this.notification.info(
      `Đang chuyển ${ids.length} đơn sang "${ORDER_STATUS_LABEL[status]}"...`,
      2000,
    );
    this.orderService.bulkUpdateStatus(ids, status).subscribe({
      next: (updated) => {
        this.notification.success(`Đã cập nhật ${updated}/${ids.length} đơn hàng`);
        this.loadData();
        this.selectedOrderIds.set([]);
      },
      error: (error) => {
        console.error('Error bulk updating orders:', error);
      },
    });
  }

  // Template helpers
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      price || 0,
    );
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusLabel(order: AdminOrder): string {
    return ORDER_STATUS_LABEL[order.status] || order.status;
  }

  getStatusVariant(
    order: AdminOrder,
  ): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' {
    return ORDER_STATUS_VARIANT[order.status] || 'neutral';
  }

  getPaymentStatusLabel(order: AdminOrder): string {
    return PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus;
  }

  getPaymentStatusVariant(
    order: AdminOrder,
  ): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' {
    switch (order.paymentStatus) {
      case 'PAID':
        return 'success';
      case 'REFUNDED':
        return 'info';
      case 'FAILED':
        return 'danger';
      default:
        return 'warning';
    }
  }

  getCustomerName(order: AdminOrder): string {
    return order.customerName || order.receiverFullName || '—';
  }

  getCustomerPhone(order: AdminOrder): string {
    return order.customerPhone || order.receiverPhone || '';
  }

  trackByOrderId(order: AdminOrder): string {
    return order.id;
  }
}
