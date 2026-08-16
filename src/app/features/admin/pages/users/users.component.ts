import {
  Component,
  OnInit,
  signal,
  computed,
  effect,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '@core/services/user.service';
import { RoleService } from '@core/services/role.service';
import { UserResponse } from '@core/models/user.model';
import { RoleResponse } from '@core/models/role.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import {
  PageHeaderComponent,
  AvatarComponent,
  ColumnPickerComponent,
  FilterPresetsComponent,
  FilterPreset,
  BulkToolbarComponent,
  BulkToolbarButton,
} from '@shared/components';

@Component({
  selector: 'app-users',
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
    PageHeaderComponent,
    AvatarComponent,
    ColumnPickerComponent,
    FilterPresetsComponent,
    BulkToolbarComponent,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit, AfterViewInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Data signals
  users = signal<UserResponse[]>([]);
  roles = signal<RoleResponse[]>([]);

  // Loading states
  isLoading = signal(false);
  isLoadingRoles = signal(false);

  // Filter signals
  searchTerm = signal('');
  roleFilter = signal<string>(''); // Single role filter instead of multi-select
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // UI state signals
  density = signal<'comfortable' | 'compact' | 'spacious'>('comfortable');
  selectedUserIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  deletingUserId = signal<string | null>(null);

  // Column definitions for shared table
  columns = signal<Column<UserResponse>[]>([
    { key: 'avatar', label: 'Avatar', visible: true, width: '60px', align: 'center' },
    { key: 'fullName', label: 'Họ tên', visible: true, sortable: true },
    { key: 'email', label: 'Email', visible: true, sortable: true },
    { key: 'phone', label: 'Điện thoại', visible: true },
    { key: 'roles', label: 'Vai trò', visible: true, width: '180px', align: 'left' },
    { key: 'status', label: 'Trạng thái', visible: true, width: '170px', align: 'center' },
    { key: 'lastLogin', label: 'Đăng nhập cuối', visible: false, sortable: true, align: 'center' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false, sortable: true, align: 'center' },
  ]);

  // Role options for select
  roleOptions = computed<SelectOption[]>(() =>
    this.roles().map((r) => ({ value: r.name, label: r.name })),
  );

  // Status options for select
  statusOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'inactive', label: 'Ngừng hoạt động' },
  ];

  // Filtered users
  filteredUsers = signal<UserResponse[]>([]);

  // Table column templates
  @ViewChild('avatarColumn', { static: true }) avatarColumn!: TemplateRef<any>;
  @ViewChild('nameColumn', { static: true }) nameColumn!: TemplateRef<any>;
  @ViewChild('emailColumn', { static: true }) emailColumn!: TemplateRef<any>;
  @ViewChild('phoneColumn', { static: true }) phoneColumn!: TemplateRef<any>;
  @ViewChild('rolesColumn', { static: true }) rolesColumn!: TemplateRef<any>;
  @ViewChild('statusColumn', { static: true }) statusColumn!: TemplateRef<any>;
  @ViewChild('lastLoginColumn', { static: true }) lastLoginColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn', { static: true }) createdAtColumn!: TemplateRef<any>;

  // Table actions (using icon buttons)
  actions: TableAction<UserResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewUser(row),
      variant: 'ghost',
    },
    {
      label: 'Chỉnh sửa',
      icon: 'edit',
      handler: (row) => this.editUser(row),
      variant: 'ghost',
    },
    {
      label: 'Xóa',
      icon: 'delete',
      handler: (row) => this.deleteUser(row),
      variant: 'danger',
    },
    {
      label: 'Khóa/Kích hoạt',
      icon: 'block',
      handler: (row) => this.toggleUserStatus(row),
      variant: 'ghost',
    },
  ];

  // Selected users for bulk actions
  selectedUsers = computed(() => this.users().filter((u) => this.selectedUserIds().includes(u.id)));

  ngOnInit() {
    this.loadData();
    this.loadPresets();
  }

  ngAfterViewInit(): void {
    // Assign templates to columns after view init
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          avatar: this.avatarColumn,
          fullName: this.nameColumn,
          email: this.emailColumn,
          phone: this.phoneColumn,
          roles: this.rolesColumn,
          status: this.statusColumn,
          lastLogin: this.lastLoginColumn,
          createdAt: this.createdAtColumn,
        };
        if (templateMap[col.key]) {
          return { ...col, template: templateMap[col.key] };
        }
        return col;
      }),
    );
  }

  loadData() {
    this.isLoading.set(true);
    this.isLoadingRoles.set(true);

    forkJoin({
      users: this.userService.getUsers(),
      roles: this.roleService.getRoles(),
    }).subscribe({
      next: ({ users, roles }) => {
        this.users.set(users);
        this.roles.set(roles);
        this.applyFilter();
        this.isLoading.set(false);
        this.isLoadingRoles.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.snackBar.open('Không thể tải dữ liệu người dùng', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
        this.isLoadingRoles.set(false);
      },
    });
  }

  loadPresets(): void {
    const stored = localStorage.getItem('userFilterPresets');
    if (stored) {
      try {
        this.filterPresets.update((presets) => [...presets, ...JSON.parse(stored)].slice(0, 10));
      } catch {
        // ignore
      }
    }
  }

  applyFilter() {
    let filtered = this.users();

    // Search by name, email, phone
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (user) =>
          (user.fullName || '').toLowerCase().includes(term) ||
          (user.email || '').toLowerCase().includes(term) ||
          (user.phone || '').toLowerCase().includes(term),
      );
    }

    // Filter by role
    const roleId = this.roleFilter();
    if (roleId) {
      filtered = filtered.filter((user) => {
        const userRoleNames = user.roleNames || [];
        return userRoleNames.includes(roleId);
      });
    }

    // Filter by status
    if (this.statusFilter() !== 'all') {
      if (this.statusFilter() === 'active') {
        filtered = filtered.filter((user) => user.active ?? true);
      } else if (this.statusFilter() === 'inactive') {
        filtered = filtered.filter((user) => !(user.active ?? true));
      }
    }

    // Apply sorting
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = (a as any)[sortCol];
        const bVal = (b as any)[sortCol];
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortDir === 'asc' ? result : -result;
      });
    }

    this.filteredUsers.set(filtered);
  }

  onSearchChange() {
    this.applyFilter();
  }

  onRoleChange() {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.applyFilter();
    }
  }

  clearFilters() {
    this.searchTerm.set('');
    this.roleFilter.set('');
    this.statusFilter.set('all');
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' || this.roleFilter() !== '' || this.statusFilter() !== 'all'
    );
  }

  // Column picker
  toggleColumn(columnKey: string): void {
    this.columns.update((cols) =>
      cols.map((c) => (c.key === columnKey ? { ...c, visible: !c.visible } : c)),
    );
  }

  // Sorting
  onSort(sortData: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(sortData.column);
    this.sortDirection.set(sortData.direction);
    this.applyFilter();
  }

  // Selection
  selectedCount = computed(() => this.selectedUserIds().length);

  onSelectionChange(rows: UserResponse[]): void {
    this.selectedUserIds.set(rows.map((r) => r.id));
  }

  // Bulk toolbar buttons
  bulkUserButtons = computed<BulkToolbarButton[]>(() => [
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
      disabled: this.deletingUserId() !== null,
    },
  ]);

  // Bulk actions (real via API)
  bulkDelete(): void {
    if (this.selectedCount() === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${this.selectedCount()} người dùng đã chọn? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;

      const idsToDelete = [...this.selectedUserIds()];
      this.deletingUserId.set(idsToDelete[0] ?? null);
      this.userService.bulkDeleteUsers(idsToDelete).subscribe({
        next: () => {
          this.snackBar.open('Xóa người dùng thành công', 'Đóng', { duration: 3000 });
          this.loadData();
          this.selectedUserIds.set([]);
          this.deletingUserId.set(null);
        },
        error: (error) => {
          console.error('Error bulk deleting users:', error);
          this.snackBar.open('Xóa người dùng thất bại', 'Đóng', { duration: 3000 });
          this.deletingUserId.set(null);
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
    const ids = [...this.selectedUserIds()];
    const verb = active ? 'kích hoạt' : 'khóa';
    this.snackBar.open(`Đang ${verb} ${ids.length} người dùng...`, 'Đóng', { duration: 2000 });
    this.userService.bulkUpdateUserStatus(ids, active).subscribe({
      next: () => {
        this.snackBar.open(`${active ? 'Kích hoạt' : 'Khóa'} người dùng thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
        this.selectedUserIds.set([]);
      },
      error: (error) => {
        console.error(`Error bulk ${verb} users:`, error);
        this.snackBar.open(
          error.error?.message || `${active ? 'Kích hoạt' : 'Khóa'} người dùng thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  // Filter presets
  filterPresets = signal<FilterPreset[]>([
    { name: 'Tất cả Admin', searchTerm: '', roleId: 'ADMIN', status: 'all' },
    { name: 'Nhân viên hoạt động', searchTerm: '', roleId: 'STAFF', status: 'active' },
    { name: 'Người dùng mới', searchTerm: '', roleId: 'USER', status: 'active' },
    { name: 'Tài khoản bị khóa', searchTerm: '', roleId: '', status: 'inactive' },
  ]);

  applyPreset(preset: FilterPreset): void {
    this.searchTerm.set(preset['searchTerm']);
    this.roleFilter.set(preset['roleId']);
    this.statusFilter.set(preset['status']);
    this.applyFilter();
  }

  saveCurrentPreset(): void {
    const name = prompt('Nhập tên bộ lọc:');
    if (name) {
      const preset: FilterPreset = {
        name,
        searchTerm: this.searchTerm(),
        roleId: this.roleFilter(),
        status: this.statusFilter(),
      };
      this.filterPresets.update((presets) => [preset, ...presets].slice(0, 10));
    }
  }

  deletePreset(index: number): void {
    this.filterPresets.update((presets) => presets.filter((_, i) => i !== index));
  }

  // Navigation
  createUser(): void {
    this.router.navigate(['/admin/users/create']);
  }

  editUser(user: UserResponse): void {
    this.router.navigate(['/admin/users', user.id, 'edit']);
  }

  viewUser(user: UserResponse): void {
    this.router.navigate(['/admin/users', user.id]);
  }

  deleteUser(user: UserResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa người dùng ${user.email}? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.deletingUserId.set(user.id);
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa người dùng thành công', 'Đóng', { duration: 3000 });
            this.loadData();
            this.deletingUserId.set(null);
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.snackBar.open('Xóa người dùng thất bại', 'Đóng', { duration: 3000 });
            this.deletingUserId.set(null);
          },
        });
      }
    });
  }

  toggleUserStatus(user: UserResponse): void {
    const newActive = !(user.active ?? true);
    this.snackBar.open(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} tài khoản ${user.email}...`,
      'Đóng',
      { duration: 2000 },
    );

    this.userService.bulkUpdateUserStatus([user.id], newActive).subscribe({
      next: () => {
        this.snackBar.open(`${newActive ? 'Kích hoạt' : 'Khóa'} tài khoản thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.snackBar.open(
          error.error?.message || `${newActive ? 'Kích hoạt' : 'Khóa'} tài khoản thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  // Helpers
  getInitials(fullName: string): string {
    if (!fullName) return 'NA';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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

  getRoleVariant(
    roleName: string,
  ): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const roleVariants: Record<
      string,
      'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    > = {
      ADMIN: 'danger',
      STAFF: 'warning',
      USER: 'primary',
      MANAGER: 'info',
      SUPER_ADMIN: 'danger',
    };
    return roleVariants[roleName] || 'neutral';
  }

  trackByUserId(user: UserResponse): string {
    return user.id;
  }

  getStatusText(user: UserResponse): string {
    return (user.active ?? true) ? 'Đang hoạt động' : 'Ngừng hoạt động';
  }
}
