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
import { PermissionService } from '@core/services/permission.service';
import { PermissionResponse } from '@core/models/permission.model';
import { AuthService } from '@core/services/auth.service';
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { PageHeaderComponent, ColumnPickerComponent } from '@shared/components';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    TableComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    PageHeaderComponent,
    ColumnPickerComponent,
  ],
  templateUrl: './permissions.html',
  styleUrl: './permissions.css',
})
export class PermissionsComponent implements OnInit, AfterViewInit {
  private readonly permissionService = inject(PermissionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  permissions = signal<PermissionResponse[]>([]);
  filteredPermissions = signal<PermissionResponse[]>([]);
  isLoading = signal(false);

  searchTerm = signal('');
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  columns = signal<Column<PermissionResponse>[]>([
    { key: 'name', label: 'Tên quyền', visible: true, sortable: true },
    { key: 'description', label: 'Mô tả', visible: true },
  ]);

  @ViewChild('nameColumn', { static: true }) nameColumn!: TemplateRef<any>;

  // Ẩn toàn bộ hành động với role thiếu MANAGE_ROLES_PERMISSIONS (module chỉ ADMIN quản lý)
  canManage = computed(() => this.authService.hasPermission('MANAGE_ROLES_PERMISSIONS'));

  actions = computed<TableAction<PermissionResponse>[]>(() => {
    if (!this.canManage()) return [];
    const base: TableAction<PermissionResponse>[] = [
      {
        label: 'Xem chi tiết',
        icon: 'visibility',
        handler: (row) => this.viewPermission(row),
        variant: 'ghost',
      },
      {
        label: 'Chỉnh sửa',
        icon: 'edit',
        handler: (row) => this.editPermission(row),
        variant: 'ghost',
      },
      {
        label: 'Xóa',
        icon: 'delete',
        handler: (row) => this.deletePermission(row),
        variant: 'danger',
      },
    ];
    return base;
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
        this.snackBar.open('Không thể tải danh sách quyền hạn', 'Đóng', { duration: 3000 });
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

  clearFilters(): void {
    this.searchTerm.set('');
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return this.searchTerm().trim() !== '';
  }

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        if (col.key === 'name') {
          return { ...col, template: this.nameColumn };
        }
        return col;
      }),
    );
  }

  viewPermission(permission: PermissionResponse): void {
    this.router.navigate(['/admin/permissions', permission.id]);
  }

  editPermission(permission: PermissionResponse): void {
    this.router.navigate(['/admin/permissions', permission.id, 'edit']);
  }

  createPermission(): void {
    this.router.navigate(['/admin/permissions/create']);
  }

  deletePermission(permission: PermissionResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa quyền hạn "${permission.name}"? Hành động này không thể hoàn tác.`,
      },
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;
      this.permissionService.deletePermission(permission.id).subscribe({
        next: () => {
          this.snackBar.open('Xóa quyền hạn thành công', 'Đóng', { duration: 3000 });
          this.loadData();
        },
        error: () => {
          this.snackBar.open('Xóa quyền hạn thất bại', 'Đóng', { duration: 3000 });
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

  trackByPermissionId(permission: PermissionResponse): string {
    return permission.id;
  }
}
