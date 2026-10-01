import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { VoucherService } from '@core/services/voucher.service';
import { AuthService } from '@core/services/auth.service';
import {
  VoucherResponse,
  VoucherHolderResponse,
  UserVoucherSource,
  UserVoucherStatus,
} from '@core/models/voucher.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { InfoItemComponent } from '@shared/components/info-item/info-item.component';

@Component({
  selector: 'app-voucher-detail',
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
    StatCardComponent,
    InfoItemComponent,
  ],
  templateUrl: './voucher-detail.component.html',
  styleUrl: './voucher-detail.component.css',
})
export class VoucherDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly voucherService = inject(VoucherService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  canDeleteVoucher = computed(() => this.authService.hasPermission('DELETE_VOUCHER'));
  canUpdateVoucher = computed(() => this.authService.hasPermission('UPDATE_VOUCHER'));

  isLoading = signal(false);
  voucher = signal<VoucherResponse | null>(null);
  holders = signal<VoucherHolderResponse[]>([]);
  errorMessage = signal('');
  permissionDenied = signal<boolean>(false);

  statusBadge = computed(() => {
    const c = this.voucher();
    if (!c) {
      return { label: '', variant: 'neutral' as const, icon: '' };
    }
    return {
      label: c.active ? 'Đang hoạt động' : 'Tạm dừng',
      variant: (c.active ? 'success' : 'warning') as 'success' | 'warning',
      icon: c.active ? 'check_circle' : 'pause_circle',
    };
  });

  /** Nhãn kiểu phát hành trên header (mockup: pill "Công khai"). */
  issuanceBadge = computed(() => {
    const c = this.voucher();
    if (!c) return { label: '', variant: 'neutral' as const };
    return c.voucherType === 'ASSIGNED'
      ? { label: 'Gán cho khách', variant: 'info' as const }
      : { label: 'Công khai', variant: 'primary' as const };
  });

  // ===== Hiệu quả voucher =====

  /** Lượt đã dùng / tổng lượt phát. */
  usagePercent = computed(() => {
    const c = this.voucher();
    if (!c || !c.usageLimit || c.usageLimit <= 0) return 0;
    return Math.min(100, Math.round(((c.usedCount ?? 0) / c.usageLimit) * 100));
  });

  /** Số khách đã nhận voucher này (bảng holders). */
  claimCount = computed(() => this.holders().length);

  /** Số khách đã dùng voucher — đếm theo trạng thái ví. */
  usedHolderCount = computed(() => this.holders().filter((h) => h.status === 'USED').length);

  /** Tỉ lệ dùng / claim. */
  useRate = computed(() => {
    const claim = this.claimCount();
    return claim > 0 ? Math.round((this.usedHolderCount() / claim) * 1000) / 10 : 0;
  });

  remainingUses = computed(() => {
    const c = this.voucher();
    if (!c || !c.usageLimit || c.usageLimit <= 0) return null;
    return Math.max(0, c.usageLimit - (c.usedCount ?? 0));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadVoucher(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID voucher');
    }
  }

  loadVoucher(id: string): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.voucherService.getVoucherById(id).subscribe({
      next: (voucher) => {
        this.voucher.set(voucher);
        this.isLoading.set(false);
        this.loadHolders(id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Không thể tải thông tin voucher');
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
      },
    });
  }

  /**
   * Danh sách khách đã nhận voucher. Lỗi ở đây KHÔNG làm hỏng trang — bảng chỉ
   * là thông tin phụ, ẩn đi còn hơn chặn admin xem chi tiết.
   */
  private loadHolders(id: string): void {
    this.voucherService.getVoucherHolders(id).subscribe({
      next: (holders) => this.holders.set(holders ?? []),
      error: () => this.holders.set([]),
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/vouchers']);
  }

  goToEdit(): void {
    const c = this.voucher();
    if (c) {
      this.router.navigate(['/admin/vouchers', c.id, 'edit']);
    }
  }

  /** Nhân bản mã — sang form tạo mới với dữ liệu voucher này. */
  duplicateVoucher(): void {
    const c = this.voucher();
    if (c) {
      this.router.navigate(['/admin/vouchers/create'], { state: { duplicateFrom: c } });
    }
  }

  /** Bật/tắt voucher — "Tạm dừng" khi đang bật, "Mở lại" khi đang tắt. */
  toggleActive(): void {
    const c = this.voucher();
    if (!c) return;
    const next = !c.active;
    this.voucherService.bulkUpdateVoucherStatus([c.id], next).subscribe({
      next: () => {
        this.voucher.set({ ...c, active: next });
        this.notification.success(next ? 'Đã mở lại voucher' : 'Đã tạm dừng voucher');
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  deleteVoucher(): void {
    const c = this.voucher();
    if (!c) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa voucher "${c.code}"? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && c.id) {
        this.voucherService.deleteVoucher(c.id).subscribe({
          next: () => {
            this.notification.success('Xóa voucher thành công');
            this.router.navigate(['/admin/vouchers']);
          },
          error: (error) => {},
        });
      }
    });
  }

  discountLabel(voucher: VoucherResponse): string {
    if (voucher.discountAmount !== null && voucher.discountAmount !== undefined) {
      return this.formatCurrency(voucher.discountAmount);
    }
    if (voucher.discountPercent !== null && voucher.discountPercent !== undefined) {
      return voucher.discountPercent + '%';
    }
    return '—';
  }

  /** Mức giảm kèm trần — mockup: "10% (tối đa 2.000.000 ₫)". */
  discountLabelFull(voucher: VoucherResponse): string {
    if (voucher.discountPercent !== null && voucher.discountPercent !== undefined) {
      const cap = voucher.maxDiscountAmount;
      return cap && cap > 0
        ? `${voucher.discountPercent}% (tối đa ${this.formatCurrency(cap)})`
        : `${voucher.discountPercent}%`;
    }
    return this.discountLabel(voucher);
  }

  discountTypeLabel(voucher: VoucherResponse): string {
    if (voucher.discountPercent !== null) return 'Phần trăm (%)';
    if (voucher.discountAmount !== null) return 'Số tiền (₫)';
    return 'Không có';
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  /** Nhãn nguồn voucher vào ví — khớp UserVoucherSource của BE. */
  sourceLabel(source: UserVoucherSource): string {
    switch (source) {
      case 'CLAIMED':
        return 'Tự nhận';
      case 'GIFTED':
        return 'Được tặng';
      case 'WELCOME':
        return 'Khách mới';
      case 'BIRTHDAY':
        return 'Sinh nhật';
      default:
        return source;
    }
  }

  /** Nhãn + màu trạng thái voucher trong ví khách. */
  holderStatus(status: UserVoucherStatus): {
    label: string;
    variant: 'success' | 'warning' | 'neutral';
  } {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Chưa dùng', variant: 'success' };
      case 'USED':
        return { label: 'Đã dùng', variant: 'neutral' };
      case 'EXPIRED':
        return { label: 'Hết hạn', variant: 'warning' };
      default:
        return { label: status, variant: 'neutral' };
    }
  }

  /** Nguồn phát hành của mẫu voucher. */
  issuanceLabel(voucher: VoucherResponse): string {
    return voucher.voucherType === 'ASSIGNED' ? 'Gán cho khách' : 'Công khai';
  }

  /** Voucher còn dùng được không (đang bật + chưa hết hạn + chưa hết lượt). */
  isUsable(voucher: VoucherResponse): boolean {
    if (!voucher.active) return false;
    if (voucher.expiryDate && new Date(voucher.expiryDate).getTime() < Date.now()) return false;
    if (voucher.usageLimit > 0 && (voucher.usedCount ?? 0) >= voucher.usageLimit) return false;
    return true;
  }
}
