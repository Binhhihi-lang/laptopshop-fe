import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CouponService } from '@core/services/coupon.service';
import { CouponResponse } from '@core/models/coupon.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';

@Component({
  selector: 'app-coupon-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    DetailHeaderComponent,
    SkeletonComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './coupon-detail.component.html',
  styleUrl: './coupon-detail.component.css',
})
export class CouponDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly couponService = inject(CouponService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  coupon = signal<CouponResponse | null>(null);
  errorMessage = signal('');

  statusBadge = computed(() => {
    const c = this.coupon();
    if (!c) {
      return { label: '', variant: 'neutral' as const, icon: '' };
    }
    return {
      label: c.active ? 'Đang hoạt động' : 'Ngừng hoạt động',
      variant: (c.active ? 'success' : 'danger') as 'success' | 'danger',
      icon: c.active ? 'check_circle' : 'cancel',
    };
  });

  expiryBadge = computed(() => {
    const c = this.coupon();
    if (!c || !c.expiryDate) {
      return { label: 'Không giới hạn', variant: 'neutral' as const };
    }
    const expired = new Date(c.expiryDate).getTime() < Date.now();
    return expired
      ? { label: 'Hết hạn', variant: 'warning' as const }
      : { label: 'Còn hạn', variant: 'success' as const };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCoupon(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID mã giảm giá');
    }
  }

  loadCoupon(id: string): void {
    this.isLoading.set(true);
    this.couponService.getCouponById(id).subscribe({
      next: (coupon) => {
        this.coupon.set(coupon);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải thông tin mã giảm giá');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/coupons']);
  }

  goToEdit(): void {
    const c = this.coupon();
    if (c) {
      this.router.navigate(['/admin/coupons', c.id, 'edit']);
    }
  }

  deleteCoupon(): void {
    const c = this.coupon();
    if (!c) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa mã giảm giá "${c.code}"? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && c.id) {
        this.couponService.deleteCoupon(c.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa mã giảm giá thành công', 'Đóng', { duration: 3000 });
            this.router.navigate(['/admin/coupons']);
          },
          error: (error) => {
            this.snackBar.open(error.error?.message || 'Xóa mã giảm giá thất bại', 'Đóng', {
              duration: 5000,
            });
          },
        });
      }
    });
  }

  discountLabel(coupon: CouponResponse): string {
    if (coupon.discountAmount !== null && coupon.discountAmount !== undefined) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
        coupon.discountAmount,
      );
    }
    if (coupon.discountPercent !== null && coupon.discountPercent !== undefined) {
      return coupon.discountPercent + '%';
    }
    return '—';
  }

  discountTypeLabel(coupon: CouponResponse): string {
    if (coupon.discountPercent !== null) return 'Phần trăm';
    if (coupon.discountAmount !== null) return 'Số tiền cố định';
    return 'Không có';
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
