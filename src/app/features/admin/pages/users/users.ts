import { Component, OnInit } from '@angular/core';
import { UserResponse, UserService } from './user.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserFormComponent } from './user-form/user-form.component';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  searchTerm = '';
  isLoading = false;
  displayedColumns: string[] = ['username', 'email', 'fullName', 'roles', 'deletedAt', 'actions'];

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  applyFilter() {
    if (!this.searchTerm) {
      this.filteredUsers = this.users;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.fullName.toLowerCase().includes(term)
    );
  }

  createUser() {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '500px',
      data: {
        title: 'Thêm mới người dùng',
        user: null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.createUser(result).subscribe({
          next: () => {
            this.snackBar.open('Thêm người dùng thành công', 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.snackBar.open('Thêm người dùng thất bại', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  editUser(user: UserResponse) {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '500px',
      data: {
        title: 'Chỉnh sửa người dùng',
        user: user
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.updateUser(user.id, result).subscribe({
          next: () => {
            this.snackBar.open('Cập nhật người dùng thành công', 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.snackBar.open('Cập nhật người dùng thất bại', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  deleteUser(user: UserResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa người dùng ${user.username}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa người dùng thành công', 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.snackBar.open('Xóa người dùng thất bại', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  viewUserDetail(user: UserResponse) {
    // Navigate to user detail page or show in dialog
    // For now, we'll just log it
    console.log('Viewing user:', user);
  }
}
