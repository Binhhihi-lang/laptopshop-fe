import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoleService } from '@core/services/role.service';
import { RoleResponse } from '@core/models/role.model';
import { AuthService } from '@core/services/auth.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';
import { InfoItemComponent } from '@shared/components/info-item/info-item.component';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    DetailHeaderComponent,
    SkeletonComponent,
    SkeletonCardComponent,
    InfoItemComponent,
  ],
  templateUrl: './role-detail.component.html',
  styleUrl: './role-detail.component.css',
})
export class RoleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  role = signal<RoleResponse | null>(null);
  errorMessage = signal('');

  // Ẩn nút "Xóa" với role thiếu MANAGE_ROLES_PERMISSIONS
  canManage = computed(() => this.authService.hasPermission('MANAGE_ROLES_PERMISSIONS'));

  statusBadge = computed(() => {
    const r = this.role();
    if (!r) {
      return { label: '', variant: 'neutral' as const };
    }
    return {
      label: r.active ? 'Đang hoạt động' : 'Đã khóa',
      variant: (r.active ? 'success' : 'danger') as 'success' | 'danger',
    };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRole(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID vai trò');
    }
  }

  loadRole(id: string): void {
    this.isLoading.set(true);
    this.roleService.getRoleById(id).subscribe({
      next: (role) => {
        this.role.set(role);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải thông tin vai trò');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/roles']);
  }

  goToEdit(): void {
    const r = this.role();
    if (r) {
      this.router.navigate(['/admin/roles', r.id, 'edit']);
    }
  }

  deleteRole(): void {
    const r = this.role();
    if (!r) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muết xóa vai trò "${r.name}"? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && r.id) {
        this.roleService.deleteRole(r.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa vai trò thành công', 'Đóng', { duration: 3000 });
            this.router.navigate(['/admin/roles']);
          },
          error: (error) => {
            this.snackBar.open(error.error?.message || 'Xóa vai trò thất bại', 'Đóng', {
              duration: 5000,
            });
          },
        });
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
