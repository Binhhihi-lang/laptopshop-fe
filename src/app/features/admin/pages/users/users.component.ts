import { Component, OnInit, signal, computed, effect, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@shared/material.module';
import { UserService } from '@core/services/user.service';
import { RoleService } from '@core/services/role.service';
import { UserResponse } from '@core/models/user.model';
import { RoleResponse } from '@core/models/role.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { UserDetailComponent, UserDetailDialogData } from '../user-detail/user-detail.component';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

interface FilterPreset {
  name: string;
  searchTerm: string;
  roleId: string; // Single role ID
  status: 'all' | 'active' | 'inactive';
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Data signals
  users = signal<UserResponse[]>([]);
  filteredUsers = signal<UserResponse[]>([]);
  roles = signal<RoleResponse[]>([]);

  // Loading states
  isLoading = signal(false);
  isLoadingRoles = signal(false);

  // Filter signals
  searchTerm = signal('');
  roleFilter = signal<string>(''); // Single role filter instead of multi-select
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // UI state signals
  showColumnPicker = signal(false);
  showFilterPresets = signal(false);
  density = signal<'comfortable' | 'compact' | 'spacious'>('comfortable');
  selectedUserIds = signal<string[]>([]);
  selectAll = signal(false);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  actionMenuOpen = signal<string | null>(null); // Stores user.id of open menu

  // Column definitions
  columns = signal<Column[]>([
    { key: 'avatar', label: 'Avatar', visible: true, width: '60px' },
    { key: 'fullName', label: 'Họ tên', visible: true },
    { key: 'email', label: 'Email', visible: true },
    { key: 'phone', label: 'Điện thoại', visible: true },
    { key: 'roles', label: 'Vai trò', visible: true },
    { key: 'status', label: 'Trạng thái', visible: true, width: '120px' },
    { key: 'lastLogin', label: 'Đăng nhập cuối', visible: false },
    { key: 'createdAt', label: 'Ngày tạo', visible: false },
    { key: 'actions', label: 'Thao tác', visible: true, width: '120px' },
  ]);

  // Filter presets
  filterPresets = signal<FilterPreset[]>([
    { name: 'Tất cả Admin', searchTerm: '', roleId: 'ADMIN', status: 'all' },
    { name: 'Nhân viên hoạt động', searchTerm: '', roleId: 'STAFF', status: 'active' },
    { name: 'Người dùng mới', searchTerm: '', roleId: 'USER', status: 'active' },
    { name: 'Tài khoản bị khóa', searchTerm: '', roleId: '', status: 'inactive' },
  ]);

  // Visible columns computed
  visibleColumns = computed(() => this.columns().filter(c => c.visible).map(c => c.key));

  // Selected count
  selectedCount = computed(() => this.selectedUserIds().length);

  // All visible users IDs
  visibleUserIds = computed(() => this.filteredUsers().map(u => u.id));

  // Sorting
  sortedUsers = computed(() => {
    const users = [...this.filteredUsers()];
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return users;

    return users.sort((a, b) => {
      const aVal = (a as any)[column];
      const bVal = (b as any)[column];
      if (aVal === bVal) return 0;
      const result = aVal > bVal ? 1 : -1;
      return direction === 'asc' ? result : -result;
    });
  });

  constructor() {
    // Persist filter presets to localStorage
    effect(() => {
      localStorage.setItem('userFilterPresets', JSON.stringify(this.filterPresets()));
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.loadPresets();
  }

  loadData(): void {
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
        this.filterPresets.set([...this.filterPresets(), ...JSON.parse(stored)].slice(0, 10));
      } catch {
        // ignore
      }
    }
  }

  applyFilter(): void {
    let filtered = this.users();

    // Search filter
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(user =>
        (user.fullName || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.phone || '').toLowerCase().includes(term),
      );
    }

    // Role filter (single select)
    const roleId = this.roleFilter();
    if (roleId) {
      filtered = filtered.filter(user => {
        const userRoleIds = user.roleNames || [];
        return userRoleIds.includes(roleId);
      });
    }

    // Status filter
    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter(user => {
        if (status === 'active') return (user.isActive ?? true);
        return !(user.isActive ?? true);
      });
    }

    this.filteredUsers.set(filtered);
    this.updateSelectAll();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  onRoleChange(): void {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.applyFilter();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.roleFilter.set('');
    this.statusFilter.set('all');
    this.applyFilter();
  }

  // Column picker
  toggleColumnPicker(): void {
    this.showColumnPicker.set(!this.showColumnPicker());
  }

  toggleColumn(columnKey: string): void {
    this.columns.update(cols =>
      cols.map(c => c.key === columnKey ? { ...c, visible: !c.visible } : c)
    );
  }

  // Sorting
  onSort(columnKey: string): void {
    if (this.sortColumn() === columnKey) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columnKey);
      this.sortDirection.set('asc');
    }
  }

  // Selection
  toggleSelectAll(): void {
    const allSelected = this.selectAll();
    const ids = this.visibleUserIds();
    if (!allSelected) {
      this.selectedUserIds.set([...ids]);
    } else {
      this.selectedUserIds.set([]);
    }
    this.selectAll.set(!allSelected);
  }

  toggleSelectUser(userId: string): void {
    this.selectedUserIds.update(ids =>
      ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId]
    );
    this.updateSelectAll();
  }

  isSelected(userId: string): boolean {
    return this.selectedUserIds().includes(userId);
  }

  updateSelectAll(): void {
    const visibleIds = this.visibleUserIds();
    this.selectAll.set(visibleIds.length > 0 && visibleIds.every(id => this.selectedUserIds().includes(id)));
  }

  // Bulk actions
  bulkDelete(): void {
    if (this.selectedCount() === 0) return;

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedCount()} người dùng đã chọn?`)) {
      this.snackBar.open('Đang xóa...', 'Đóng', { duration: 2000 });
      // In real app, call bulk delete API
      this.snackBar.open('Chức năng xóa hàng loạt sẽ được triển khai', 'Đóng', { duration: 3000 });
      this.selectedUserIds.set([]);
      this.selectAll.set(false);
    }
  }

  bulkActivate(): void {
    if (this.selectedCount() === 0) return;
    this.snackBar.open('Chức năng kích hoạt hàng loạt sẽ được triển khai', 'Đóng', { duration: 3000 });
  }

  bulkDeactivate(): void {
    if (this.selectedCount() === 0) return;
    this.snackBar.open('Chức năng khóa hàng loạt sẽ được triển khai', 'Đóng', { duration: 3000 });
  }

  // Filter presets
  applyPreset(preset: FilterPreset): void {
    this.searchTerm.set(preset.searchTerm);
    this.roleFilter.set(preset.roleId);
    this.statusFilter.set(preset.status);
    this.applyFilter();
    this.showFilterPresets.set(false);
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
      this.filterPresets.update(presets => [preset, ...presets].slice(0, 10));
    }
  }

  deletePreset(index: number): void {
    this.filterPresets.update(presets => presets.filter((_, i) => i !== index));
  }

  toggleFilterPresets(): void {
    this.showFilterPresets.set(!this.showFilterPresets());
  }

  // Density
  setDensity(density: 'comfortable' | 'compact' | 'spacious'): void {
    this.density.set(density);
  }

  // Navigation
  createUser(): void {
    this.router.navigate(['/admin/users/create']);
  }

  editUser(user: UserResponse): void {
    this.router.navigate(['/admin/users', user.id, 'edit']);
  }

  viewUser(user: UserResponse): void {
    const dialogRef = this.dialog.open(UserDetailComponent, {
      data: { user } as UserDetailDialogData,
      width: '580px',
      maxWidth: '90vw',
      panelClass: 'custom-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'edit') {
        this.editUser(user);
      }
    });
  }

  deleteUser(user: UserResponse): void {
    if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.email}? Hành động này không thể hoàn tác.`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.snackBar.open('Xóa người dùng thành công', 'Đóng', { duration: 3000 });
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.snackBar.open('Xóa người dùng thất bại', 'Đóng', { duration: 3000 });
        },
      });
    }
  }

  toggleUserStatus(user: UserResponse): void {
    this.snackBar.open('Chức năng thay đổi trạng thái sẽ được triển khai', 'Đóng', { duration: 3000 });
  }

  // Action menu
  toggleActionMenu(user: UserResponse): void {
    this.actionMenuOpen.update(current => current === user.id ? null : user.id);
  }

  closeActionMenu(): void {
    this.actionMenuOpen.set(null);
  }

  closeAllDropdowns(): void {
    this.showColumnPicker.set(false);
    this.showFilterPresets.set(false);
    this.closeActionMenu();
  }

  // Helpers
  getRoleNames(user: UserResponse): string {
    return (user.roleNames || []).join(', ');
  }

  getStatusBadgeClass(user: UserResponse): string {
    const active = user.isActive ?? true;
    return active ? 'badge-success' : 'badge-danger';
  }

  getStatusText(user: UserResponse): string {
    return (user.isActive ?? true) ? 'Hoạt động' : 'Ngừng hoạt động';
  }

  getInitials(fullName: string): string {
    if (!fullName) return 'NA';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Track by functions
  trackByUserId(index: number, user: UserResponse): string {
    return user.id;
  }

  trackByRoleId(index: number, role: RoleResponse): string {
    return role.id;
  }

  trackByColumn(index: number, column: Column): string {
    return column.key;
  }
}