import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionService } from '@core/services/permission.service';
import { PermissionResponse } from '@core/models/permission.model';
import { AuthService } from '@core/services/auth.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';
import { InfoItemComponent } from '@shared/components/info-item/info-item.component';

@Component({
  selector: 'app-permission-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    CardComponent,
    ButtonComponent,
    EmptyStateComponent,
    DetailHeaderComponent,
    SkeletonComponent,
    SkeletonCardComponent,
    InfoItemComponent,
  ],
  templateUrl: './permission-detail.component.html',
  styleUrl: './permission-detail.component.css',
})
export class PermissionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly permissionService = inject(PermissionService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  permission = signal<PermissionResponse | null>(null);
  errorMessage = signal('');

  // Ẩn nút "Xóa" với role thiếu MANAGE_ROLES_PERMISSIONS
  canManage = computed(() => this.authService.hasPermission('MANAGE_ROLES_PERMISSIONS'));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPermission(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID quyền hạn');
    }
  }

  loadPermission(id: string): void {
    this.isLoading.set(true);
    this.permissionService.getPermissionById(id).subscribe({
      next: (permission) => {
        this.permission.set(permission);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải thông tin quyền hạn');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/permissions']);
  }

  goToEdit(): void {
    const p = this.permission();
    if (p) {
      this.router.navigate(['/admin/permissions', p.id, 'edit']);
    }
  }

  deletePermission(): void {
    const p = this.permission();
    if (!p) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa quyền hạn "${p.name}"? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && p.id) {
        this.permissionService.deletePermission(p.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa quyền hạn thành công', 'Đóng', { duration: 3000 });
            this.router.navigate(['/admin/permissions']);
          },
          error: (error) => {
            this.snackBar.open(error.error?.message || 'Xóa quyền hạn thất bại', 'Đóng', {
              duration: 5000,
            });
          },
        });
      }
    });
  }
}
