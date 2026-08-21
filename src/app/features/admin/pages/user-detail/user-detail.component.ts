import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '@core/services/user.service';
import { UserResponse } from '@core/models/user.model';
import { AuthService } from '@core/services/auth.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent, CardHeaderComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { InfoItemComponent } from '@shared/components/info-item/info-item.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    CardHeaderComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    AvatarComponent,
    InfoItemComponent,
    DetailHeaderComponent,
    SkeletonComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  user = signal<UserResponse | null>(null);
  isLoading = signal(false);
  userId: string | null = null;

  // Ẩn nút "Xóa" với role thiếu quyền DELETE_USER
  canDeleteUser = computed(() => this.authService.hasPermission('DELETE_USER'));

  // Computed helpers for badges
  statusBadge = computed(() => {
    const currentUser = this.user();
    if (!currentUser) {
      return { label: '', variant: 'neutral' as const, icon: '' };
    }
    return {
      label: (currentUser.active ?? true) ? 'Đang hoạt động' : 'Ngừng hoạt động',
      variant: ((currentUser.active ?? true) ? 'success' : 'danger') as 'success' | 'danger',
      icon: (currentUser.active ?? true) ? 'check_circle' : 'cancel',
    };
  });

  // Role badges computed
  roleBadges = computed(() => {
    const currentUser = this.user();
    if (!currentUser?.roleNames) return [];
    return currentUser.roleNames.map((roleName: string) => ({
      label: roleName,
      variant: this.getRoleVariant(roleName),
    }));
  });

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.loadUser(this.userId);
    } else {
      this.router.navigate(['/admin/users']);
    }
  }

  loadUser(id: string) {
    this.isLoading.set(true);
    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[UserDetail] Lỗi khi tải người dùng:', err);
        this.isLoading.set(false);
        this.snackBar.open('Không thể tải thông tin người dùng', 'Đóng', { duration: 3000 });
        this.router.navigate(['/admin/users']);
      },
    });
  }

  deleteUser() {
    const currentUser = this.user();
    if (!currentUser) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa người dùng "${currentUser.fullName || currentUser.email}"? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && this.userId) {
        this.userService.deleteUser(this.userId).subscribe({
          next: () => {
            this.snackBar.open('Xóa người dùng thành công', 'Đóng', { duration: 3000 });
            this.router.navigate(['/admin/users']);
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.snackBar.open('Xóa người dùng thất bại', 'Đóng', { duration: 3000 });
          },
        });
      }
    });
  }

  navigateToEdit() {
    if (this.userId) {
      this.router.navigate(['/admin/users', this.userId, 'edit']);
    }
  }

  goBack() {
    this.router.navigate(['/admin/users']);
  }

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

  private getRoleVariant(
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
}
