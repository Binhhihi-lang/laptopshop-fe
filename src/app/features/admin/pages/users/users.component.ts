import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { UserFormComponent } from '@features/admin/pages/user-form/user-form.component';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import { UserResponse } from '@core/models/user.model';
import { RoleResponse } from '@core/models/role.model';
import { UserService } from '@core/services/user.service';
import { RoleService } from '@core/services/role.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  roles: RoleResponse[] = [];

  // Filter states
  searchTerm = '';
  selectedRoleIds: string[] = [];
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  isLoading = false;
  isLoadingRoles = false;

  displayedColumns: string[] = ['avatar', 'fullName', 'email', 'phone', 'roles', 'status', 'actions'];

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.isLoadingRoles = true;

    forkJoin({
      users: this.userService.getUsers(),
      roles: this.roleService.getRoles(),
    }).subscribe({
      next: ({ users, roles }) => {
        this.users = users;
        this.roles = roles;
        this.applyFilter();
        this.isLoading = false;
        this.isLoadingRoles = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.snackBar.open('Failed to load data', 'Close', { duration: 3000 });
        this.isLoading = false;
        this.isLoadingRoles = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilter() {
    if (!this.users) {
      this.filteredUsers = [];
      return;
    }

    let filtered = this.users;

    // Search by name, email, phone
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (user) =>
          (user.fullName || '').toLowerCase().includes(term) ||
          (user.email || '').toLowerCase().includes(term) ||
          (user.phone || '').toLowerCase().includes(term),
      );
    }

    // Filter by role
    if (this.selectedRoleIds.length > 0) {
      filtered = filtered.filter((user) => {
        const userRoleIds = (user.roleNames || []).map((r) => r.id);
        return this.selectedRoleIds.some((id) => userRoleIds.includes(id));
      });
    }

    // Filter by status
    if (this.statusFilter !== 'all') {
      const isActive = (user: UserResponse) => !user.deletedAt;
      if (this.statusFilter === 'active') {
        filtered = filtered.filter(isActive);
      } else if (this.statusFilter === 'inactive') {
        filtered = filtered.filter((u) => !isActive(u));
      }
    }

    this.filteredUsers = filtered;
    this.cdr.detectChanges();
  }

  onSearchChange() {
    this.applyFilter();
  }

  onRoleChange() {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter !== status) {
      this.statusFilter = status;
      this.applyFilter();
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedRoleIds = [];
    this.statusFilter = 'all';
    this.applyFilter();
  }

  toggleUserStatus(user: UserResponse) {
    const newState = !user.deletedAt; // If currently active (deletedAt null), then deactivate; else activate
    const updateData: any = { deletedAt: newState ? new Date() : null };

    this.userService.updateUser(user.id, updateData).subscribe({
      next: () => {
        const action = newState ? 'deactivated' : 'activated';
        this.snackBar.open(`Người dùng đã được ${action}`, 'Close', { duration: 3000 });
        this.loadData(); // Refresh to update the status
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.snackBar.open('Không thể thay đổi trạng thái người dùng', 'Close', { duration: 3000 });
      },
    });
  }

  createUser() {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '500px',
      data: {
        title: 'Thêm mới người dùng',
        user: null,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.userService.createUser(result as any).subscribe({
          next: () => {
            this.snackBar.open('Thêm người dùng thành công', 'Close', { duration: 3000 });
            this.loadData();
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.snackBar.open('Thêm người dùng thất bại', 'Close', { duration: 3000 });
          },
        });
      }
    });
  }

  editUser(user: UserResponse) {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '500px',
      data: {
        title: 'Chỉnh sửa người dùng',
        user: user,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.userService.updateUser(user.id, result as any).subscribe({
          next: () => {
            this.snackBar.open('Cập nhật người dùng thành công', 'Close', { duration: 3000 });
            this.loadData();
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.snackBar.open('Cập nhật người dùng thất bại', 'Close', { duration: 3000 });
          },
        });
      }
    });
  }

  deleteUser(user: UserResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa người dùng ${user.username}? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa người dùng thành công', 'Close', { duration: 3000 });
            this.loadData();
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.snackBar.open('Xóa người dùng thất bại', 'Close', { duration: 3000 });
          },
        });
      }
    });
  }

  viewUserDetail(user: UserResponse) {
    // For now, we'll just log it. In a real app, we might navigate to a detail page.
    console.log('Viewing user:', user);
  }

  // Helper to check if a user is active
  isUserActive(user: UserResponse): boolean {
    return !user.deletedAt;
  }

  // Helper to get status badge color (if needed)
  getStatusColor(user: UserResponse): string {
    return this.isUserActive(user) ? 'success' : 'error';
  }
}
