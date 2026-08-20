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
import { RoleService } from '@core/services/role.service';
import { RoleResponse } from '@core/models/role.model';
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

@Component({
  selector: 'app-roles',
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
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesComponent implements OnInit, AfterViewInit {
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  roles = signal<RoleResponse[]>([]);
  isLoading = signal(false);

  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  selectedRoleIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  columns = signal<Column<RoleResponse>[]>([
    { key: 'name', label: 'Tên vai trò', visible: true, sortable: true },
    { key: 'description', label: 'Mô tả', visible: true },
    { key: 'permissionNames', label: 'Quyền hạn', visible: true },
    { key: 'active', label: 'Trạng thái', visible: true, width: '140px', align: 'center' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false, sortable: true, align: 'center' },
    { key: 'updatedAt', label: 'Ngày sửa', visible: false, sortable: true, align: 'center' },
  ]);

  filteredRoles = signal<RoleResponse[]>([]);

  @ViewChild('nameColumn', { static: true }) nameColumn!: TemplateRef<any>;
  @ViewChild('permissionColumn', { static: true }) permissionColumn!: TemplateRef<any>;
  @ViewChild('statusColumn', { static: true }) statusColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn', { static: true }) createdAtColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn', { static: true }) updatedAtColumn!: TemplateRef<any>;

  actions: TableAction<RoleResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewRole(row),
      variant: 'ghost',
    },
    {
      label: 'Chỉnh sửa',
      icon: 'edit',
      handler: (row) => this.editRole(row),
      variant: 'ghost',
    },
    {
      label: 'Xóa',
      icon: 'delete',
      handler: (row) => this.deleteRole(row),
      variant: 'danger',
    },
    {
      label: 'Kích hoạt/Khóa',
      icon: 'block',
      handler: (row) => this.toggleStatus(row),
      variant: 'ghost',
      disabled: (row) => row.name === 'ADMIN' && row.active,
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Không thể tải danh sách vai trò', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  applyFilter(): void {
    let filtered = this.roles();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (role) =>
          (role.name || '').toLowerCase().includes(term) ||
          (role.description || '').toLowerCase().includes(term) ||
          (role.permissionNames || []).some((p) => p.toLowerCase().includes(term)),
      );
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((role) => (status === 'active' ? role.active : !role.active));
    }

    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol) {
      filtered = [...filtered].sort((a, b) => {
        const aVal: any = (a as any)[sortCol];
        const bVal: any = (b as any)[sortCol];
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortDir === 'asc' ? result : -result;
      });
    }

    this.filteredRoles.set(filtered);
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.applyFilter();
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return this.searchTerm().trim() !== '' || this.statusFilter() !== 'all';
  }

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          name: this.nameColumn,
          permissionNames: this.permissionColumn,
          active: this.statusColumn,
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

  viewRole(role: RoleResponse): void {
    this.router.navigate(['/admin/roles', role.id]);
  }

  editRole(role: RoleResponse): void {
    this.router.navigate(['/admin/roles', role.id, 'edit']);
  }

  createRole(): void {
    this.router.navigate(['/admin/roles/create']);
  }

  deleteRole(role: RoleResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa vai trò "${role.name}"? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;
      this.roleService.deleteRole(role.id).subscribe({
        next: () => {
          this.snackBar.open('Xóa vai trò thành công', 'Đóng', { duration: 3000 });
          this.loadData();
        },
        error: () => {
          this.snackBar.open('Xóa vai trò thất bại', 'Đóng', { duration: 3000 });
        },
      });
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

  selectedRoles = computed(() => this.roles().filter((r) => this.selectedRoleIds().includes(r.id)));
  selectedCount = computed(() => this.selectedRoleIds().length);

  onSelectionChange(rows: RoleResponse[]): void {
    this.selectedRoleIds.set(rows.map((r) => r.id));
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
    },
  ]);

  bulkDelete(): void {
    if (this.selectedCount() === 0) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${this.selectedCount()} vai trò đã chọn? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;
      const ids = [...this.selectedRoleIds()];
      this.roleService.bulkDeleteRoles(ids).subscribe({
        next: () => {
          this.snackBar.open('Xóa vai trò thành công', 'Đóng', { duration: 3000 });
          this.loadData();
          this.selectedRoleIds.set([]);
        },
        error: () => {
          this.snackBar.open('Xóa vai trò thất bại', 'Đóng', { duration: 3000 });
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
    const ids = [...this.selectedRoleIds()];
    this.snackBar.open(`Đang ${active ? 'kích hoạt' : 'khóa'} ${ids.length} vai trò...`, 'Đóng', {
      duration: 2000,
    });
    this.roleService.bulkUpdateRoleStatus(ids, active).subscribe({
      next: () => {
        this.snackBar.open(`${active ? 'Kích hoạt' : 'Khóa'} vai trò thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
        this.selectedRoleIds.set([]);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || `${active ? 'Kích hoạt' : 'Khóa'} vai trò thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  toggleStatus(role: RoleResponse): void {
    const newActive = !role.active;
    this.snackBar.open(`Đang ${newActive ? 'kích hoạt' : 'khóa'} vai trò ${role.name}...`, 'Đóng', {
      duration: 2000,
    });
    this.roleService.bulkUpdateRoleStatus([role.id], newActive).subscribe({
      next: () => {
        this.snackBar.open(`${newActive ? 'Kích hoạt' : 'Khóa'} vai trò thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || `${newActive ? 'Kích hoạt' : 'Khóa'} vai trò thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  getStatusBadge(role: RoleResponse): { label: string; variant: 'success' | 'danger' } {
    return role.active
      ? { label: 'Đang hoạt động', variant: 'success' }
      : { label: 'Đã khóa', variant: 'danger' };
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

  trackByRoleId(role: RoleResponse): string {
    return role.id;
  }
}
