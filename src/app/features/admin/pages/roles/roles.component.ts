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
import { RoleService } from '@core/services/role.service';
import { RoleResponse } from '@core/models/role.model';
import { AuthService } from '@core/services/auth.service';
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
    EmptyStateComponent,
  ],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesComponent implements OnInit, AfterViewInit {
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  roles = signal<RoleResponse[]>([]);
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);

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

  @ViewChild('nameColumn') nameColumn!: TemplateRef<any>;
  @ViewChild('permissionColumn') permissionColumn!: TemplateRef<any>;
  @ViewChild('statusColumn') statusColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn') createdAtColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn') updatedAtColumn!: TemplateRef<any>;

  // Ẩn toàn bộ hành động với role thiếu MANAGE_ROLES_PERMISSIONS (module chỉ ADMIN quản lý)
  canManage = computed(() => this.authService.hasPermission('MANAGE_ROLES_PERMISSIONS'));

  actions = computed<TableAction<RoleResponse>[]>(() => {
    if (!this.canManage()) return [];
    const base: TableAction<RoleResponse>[] = [
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
    return base;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
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
          this.notification.success('Xóa vai trò thành công');
          this.loadData();
        },
        error: () => {},
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

  bulkButtons = computed<BulkToolbarButton[]>(() => {
    if (!this.canManage()) return [];
    return [
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
    ];
  });

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
          this.notification.success('Xóa vai trò thành công');
          this.loadData();
          this.selectedRoleIds.set([]);
        },
        error: () => {},
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
    this.notification.info(`Đang ${active ? 'kích hoạt' : 'khóa'} ${ids.length} vai trò...`, 2000);
    this.roleService.bulkUpdateRoleStatus(ids, active).subscribe({
      next: () => {
        this.notification.success(`${active ? 'Kích hoạt' : 'Khóa'} vai trò thành công`);
        this.loadData();
        this.selectedRoleIds.set([]);
      },
      error: (error) => {},
    });
  }

  toggleStatus(role: RoleResponse): void {
    const newActive = !role.active;
    this.notification.info(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} vai trò ${role.name}...`,
      2000,
    );
    this.roleService.bulkUpdateRoleStatus([role.id], newActive).subscribe({
      next: () => {
        this.notification.success(`${newActive ? 'Kích hoạt' : 'Khóa'} vai trò thành công`);
        this.loadData();
      },
      error: (error) => {},
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
