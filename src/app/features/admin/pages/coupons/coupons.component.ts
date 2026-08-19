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
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CouponService } from '@core/services/coupon.service';
import { CouponResponse } from '@core/models/coupon.model';
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import {
  PageHeaderComponent,
  ColumnPickerComponent,
  BulkToolbarComponent,
  BulkToolbarButton,
} from '@shared/components';
// ConfirmDialogComponent được mở qua MatDialog (không dùng trực tiếp trong template)

@Component({
  selector: 'app-coupons',
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
  ],
  templateUrl: './coupons.html',
  styleUrl: './coupons.css',
})
export class CouponsComponent implements OnInit, AfterViewInit {
  private readonly couponService = inject(CouponService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  coupons = signal<CouponResponse[]>([]);
  isLoading = signal(false);
  isBulkDeleting = signal(false);

  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  expiryFilter = signal<'all' | 'valid' | 'expired'>('all');

  selectedCouponIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  columns = signal<Column<CouponResponse>[]>([
    { key: 'image', label: 'Ảnh', visible: true, width: '70px', align: 'center' },
    { key: 'code', label: 'Mã giảm giá', visible: true, sortable: true },
    { key: 'discount', label: 'Giảm giá', visible: true, align: 'left' },
    { key: 'expiryDate', label: 'Hạn sử dụng', visible: true, sortable: true, align: 'left' },
    { key: 'usage', label: 'Đã dùng / Giới hạn', visible: true, align: 'left' },
    { key: 'status', label: 'Trạng thái', visible: true, width: '140px', align: 'center' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false, sortable: true, align: 'center' },
    { key: 'updatedAt', label: 'Ngày sửa', visible: false, sortable: true, align: 'center' },
  ]);

  filteredCoupons = signal<CouponResponse[]>([]);

  @ViewChild('imageColumn', { static: true }) imageColumn!: TemplateRef<any>;
  @ViewChild('codeColumn', { static: true }) codeColumn!: TemplateRef<any>;
  @ViewChild('discountColumn', { static: true }) discountColumn!: TemplateRef<any>;
  @ViewChild('expiryColumn', { static: true }) expiryColumn!: TemplateRef<any>;
  @ViewChild('usageColumn', { static: true }) usageColumn!: TemplateRef<any>;
  @ViewChild('statusColumn', { static: true }) statusColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn', { static: true }) createdAtColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn', { static: true }) updatedAtColumn!: TemplateRef<any>;

  actions: TableAction<CouponResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewCoupon(row),
      variant: 'ghost',
    },
    {
      label: 'Chỉnh sửa',
      icon: 'edit',
      handler: (row) => this.editCoupon(row),
      variant: 'ghost',
    },
    {
      label: 'Xóa',
      icon: 'delete',
      handler: (row) => this.deleteCoupon(row),
      variant: 'danger',
    },
    {
      label: 'Kích hoạt/Khóa',
      icon: 'block',
      handler: (row) => this.toggleStatus(row),
      variant: 'ghost',
    },
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.couponService.getCoupons().subscribe({
      next: (coupons) => {
        this.coupons.set(coupons);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Không thể tải danh sách mã giảm giá', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  applyFilter() {
    let filtered = this.coupons();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((c) => c.code.toLowerCase().includes(term));
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((c) => (status === 'active' ? c.active : !c.active));
    }

    const expiry = this.expiryFilter();
    if (expiry !== 'all') {
      filtered = filtered.filter((c) =>
        expiry === 'expired' ? this.isExpired(c) : !this.isExpired(c),
      );
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

    this.filteredCoupons.set(filtered);
  }

  onSearchChange() {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.applyFilter();
    }
  }

  setExpiryFilter(expiry: 'all' | 'valid' | 'expired') {
    if (this.expiryFilter() !== expiry) {
      this.expiryFilter.set(expiry);
      this.applyFilter();
    }
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.expiryFilter.set('all');
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.expiryFilter() !== 'all'
    );
  }

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          image: this.imageColumn,
          code: this.codeColumn,
          discount: this.discountColumn,
          expiryDate: this.expiryColumn,
          usage: this.usageColumn,
          status: this.statusColumn,
          createdAt: this.createdAtColumn,
          updatedAt: this.updatedAtColumn,
        };
        if (templateMap[col.key]) {
          return { ...col, template: templateMap[col.key] };
        }
        return col;
      }),
    );
  }

  viewCoupon(coupon: CouponResponse) {
    this.router.navigate(['/admin/coupons', coupon.id]);
  }

  editCoupon(coupon: CouponResponse) {
    this.router.navigate(['/admin/coupons', coupon.id, 'edit']);
  }

  createCoupon() {
    this.router.navigate(['/admin/coupons/create']);
  }

  deleteCoupon(coupon: CouponResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa mã giảm giá "${coupon.code}"? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.couponService.deleteCoupon(coupon.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa mã giảm giá thành công', 'Đóng', { duration: 3000 });
            this.loadData();
          },
          error: () => {
            this.snackBar.open('Xóa mã giảm giá thất bại', 'Đóng', { duration: 3000 });
          },
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

  selectedCoupons = computed(() =>
    this.coupons().filter((c) => this.selectedCouponIds().includes(c.id)),
  );
  selectedCount = computed(() => this.selectedCouponIds().length);

  onSelectionChange(rows: CouponResponse[]): void {
    this.selectedCouponIds.set(rows.map((r) => r.id));
  }

  bulkButtons = computed<BulkToolbarButton[]>(() => [
    {
      label: 'Kích hoạt',
      icon: 'check_circle',
      variant: 'success',
      handler: () => this.bulkActivate(),
    },
    {
      label: 'Khóa',
      icon: 'block',
      variant: 'secondary',
      handler: () => this.bulkDeactivate(),
    },
    {
      label: 'Xóa',
      icon: 'delete',
      variant: 'danger',
      handler: () => this.bulkDelete(),
      disabled: this.isBulkDeleting(),
    },
  ]);

  bulkDelete(): void {
    if (this.selectedCount() === 0) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${this.selectedCount()} mã giảm giá đã chọn? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;
      const ids = [...this.selectedCouponIds()];
      this.isBulkDeleting.set(true);
      this.couponService.bulkDeleteCoupons(ids).subscribe({
        next: () => {
          this.snackBar.open('Xóa mã giảm giá thành công', 'Đóng', { duration: 3000 });
          this.loadData();
          this.selectedCouponIds.set([]);
          this.isBulkDeleting.set(false);
        },
        error: () => {
          this.snackBar.open('Xóa mã giảm giá thất bại', 'Đóng', { duration: 3000 });
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
    const ids = [...this.selectedCouponIds()];
    this.snackBar.open(
      `Đang ${active ? 'kích hoạt' : 'khóa'} ${ids.length} mã giảm giá...`,
      'Đóng',
      {
        duration: 2000,
      },
    );
    this.couponService.bulkUpdateCouponStatus(ids, active).subscribe({
      next: () => {
        this.snackBar.open(`${active ? 'Kích hoạt' : 'Khóa'} mã giảm giá thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
        this.selectedCouponIds.set([]);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || `${active ? 'Kích hoạt' : 'Khóa'} mã giảm giá thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  toggleStatus(coupon: CouponResponse): void {
    const newActive = !coupon.active;
    this.snackBar.open(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} mã giảm giá ${coupon.code}...`,
      'Đóng',
      { duration: 2000 },
    );
    this.couponService.bulkUpdateCouponStatus([coupon.id], newActive).subscribe({
      next: () => {
        this.snackBar.open(`${newActive ? 'Kích hoạt' : 'Khóa'} mã giảm giá thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || `${newActive ? 'Kích hoạt' : 'Khóa'} mã giảm giá thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  isExpired(coupon: CouponResponse): boolean {
    return !!coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now();
  }

  discountLabel(coupon: CouponResponse): string {
    if (coupon.discountAmount !== null && coupon.discountAmount !== undefined) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
        coupon.discountAmount,
      );
    }
    if (coupon.discountPercent !== null && coupon.discountPercent !== undefined) {
      return coupon.discountPercent + '%';
    }
    return '-';
  }

  getStatusBadge(coupon: CouponResponse): { label: string; variant: 'success' | 'danger' } {
    return coupon.active
      ? { label: 'Đang hoạt động', variant: 'success' }
      : { label: 'Ngừng hoạt động', variant: 'danger' };
  }

  getExpiryBadge(coupon: CouponResponse): {
    label: string;
    variant: 'success' | 'warning' | 'neutral';
  } {
    if (!coupon.expiryDate) return { label: 'Không giới hạn', variant: 'neutral' };
    return this.isExpired(coupon)
      ? { label: 'Hết hạn', variant: 'warning' }
      : { label: 'Còn hạn', variant: 'success' };
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByCouponId(coupon: CouponResponse): string {
    return coupon.id;
  }
}
