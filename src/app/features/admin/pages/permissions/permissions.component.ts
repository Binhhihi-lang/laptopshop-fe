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
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { PermissionService } from '@core/services/permission.service';
import { PermissionResponse } from '@core/models/permission.model';
import { AuthService } from '@core/services/auth.service';
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import {
  PageHeaderComponent,
  ColumnPickerComponent,
  BulkToolbarComponent,
  BulkToolbarButton,
} from '@shared/components';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    TableComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    BadgeComponent,
    PageHeaderComponent,
    ColumnPickerComponent,
    BulkToolbarComponent,
  ],
  templateUrl: './permissions.html',
  styleUrl: './permissions.css',
})
export class PermissionsComponent implements OnInit, AfterViewInit {
  private readonly permissionService = inject(PermissionService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  permissions = signal<PermissionResponse[]>([]);
  filteredPermissions = signal<PermissionResponse[]>([]);
  isLoading = signal(false);

  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  selectedPermissionIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  columns = signal<Column<PermissionResponse>[]>([
    { key: 'name', label: 'Tên quyền', visible: true, sortable: true },
    { key: 'description', label: 'Mô tả', visible: true },
    { key: 'active', label: 'Trạng thái', visible: true, width: '140px', align: 'center' },
  ]);

  @ViewChild('nameColumn') nameColumn!: TemplateRef<any>;
  @ViewChild('statusColumn') statusColumn!: TemplateRef<any>;

  // Ẩn toàn bộ hành động với role thiếu MANAGE_ROLES_PERMISSIONS (module chỉ ADMIN quản lý)
  canManage = computed(() => this.authService.hasPermission('MANAGE_ROLES_PERMISSIONS'));

  // Chỉ giữ hành động Khóa/Kích hoạt (không tạo/sửa/xóa tên permission —
  // tên permission là hằng số do code sở hữu, tránh "quyền chết").
  actions = computed<TableAction<PermissionResponse>[]>(() => {
    if (!this.canManage()) return [];
    return [
      {
        label: 'Kích hoạt/Khóa',
        icon: 'block',
        handler: (row) => this.toggleStatus(row),
        variant: 'ghost',
        // Quyền hệ thống (tiền tố MANAGE_) không được khóa/xóa
        disabled: (row) => row.name.startsWith('MANAGE_'),
      },
    ];
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.permissionService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm().trim().toLowerCase();
    let filtered = this.permissions();

    if (term) {
      filtered = filtered.filter(
        (permission) =>
          (permission.name || '').toLowerCase().includes(term) ||
          (permission.description || '').toLowerCase().includes(term),
      );
    }

    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((permission) =>
        status === 'active' ? permission.active : !permission.active,
      );
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

    this.filteredPermissions.set(filtered);
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
          active: this.statusColumn,
        };
        if (templateMap[col.key]) {
          return { ...col, template: templateMap[col.key] };
        }
        return col;
      }),
    );
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

  trackByPermissionId(permission: PermissionResponse): string {
    return permission.id;
  }

  // === Chọn hàng loạt + Bulk Toolbar ===
  selectedPermissions = computed(() =>
    this.permissions().filter((p) => this.selectedPermissionIds().includes(p.id)),
  );
  selectedCount = computed(() => this.selectedPermissionIds().length);

  onSelectionChange(rows: PermissionResponse[]): void {
    this.selectedPermissionIds.set(rows.map((r) => r.id));
  }

  bulkButtons = computed<BulkToolbarButton[]>(() => {
    if (!this.canManage()) return [];
    // Chỉ giữ Khóa / Kích hoạt hàng loạt (không xóa)
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
    ];
  });

  bulkActivate(): void {
    if (this.selectedCount() === 0) return;
    this.updateBulkStatus(true);
  }

  bulkDeactivate(): void {
    if (this.selectedCount() === 0) return;
    this.updateBulkStatus(false);
  }

  private updateBulkStatus(active: boolean): void {
    const ids = [...this.selectedPermissionIds()];
    this.notification.info(
      `Đang ${active ? 'kích hoạt' : 'khóa'} ${ids.length} quyền hạn...`,
      2000,
    );
    this.permissionService.bulkUpdatePermissionStatus(ids, active).subscribe({
      next: () => {
        this.notification.success(`${active ? 'Kích hoạt' : 'Khóa'} quyền hạn thành công`);
        this.loadData();
        this.selectedPermissionIds.set([]);
      },
      error: (error) => {},
    });
  }

  toggleStatus(permission: PermissionResponse): void {
    const newActive = !permission.active;
    this.notification.info(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} quyền hạn ${permission.name}...`,
      2000,
    );
    this.permissionService.bulkUpdatePermissionStatus([permission.id], newActive).subscribe({
      next: () => {
        this.notification.success(`${newActive ? 'Kích hoạt' : 'Khóa'} quyền hạn thành công`);
        this.loadData();
      },
      error: (error) => {},
    });
  }

  getStatusBadge(permission: PermissionResponse): { label: string; variant: 'success' | 'danger' } {
    return permission.active
      ? { label: 'Đang hoạt động', variant: 'success' }
      : { label: 'Đã khóa', variant: 'danger' };
  }
}
