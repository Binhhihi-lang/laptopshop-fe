import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClientVoucherService } from '@core/services/client-voucher.service';
import { NotificationService } from '@core/services/notification.service';
import { VoucherResponse } from '@core/models/voucher.model';
import { UserVoucherResponse, UserVoucherStatus } from '@core/models/voucher.model';
import {
  BreadcrumbComponent,
  ButtonComponent,
  EmptyStateComponent,
  LoadingComponent,
} from '@shared/components';

type WalletTab = 'AVAILABLE' | 'USED' | 'EXPIRED' | 'CLAIM';

/**
 * Ví voucher của khách (§3.4) — tab khả dụng / dùng rồi / hết hạn + kho voucher
 * để claim (D16).
 */
@Component({
  selector: 'app-voucher-wallet',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    BreadcrumbComponent,
    ButtonComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  templateUrl: './voucher-wallet.component.html',
})
export class VoucherWalletComponent implements OnInit {
  private readonly voucherService = inject(ClientVoucherService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly vouchers = signal<UserVoucherResponse[]>([]);
  readonly claimable = signal<VoucherResponse[]>([]);
  readonly claimingId = signal<string | null>(null);
  readonly activeTab = signal<WalletTab>('AVAILABLE');

  /** Lọc tại FE vì 1 lần gọi trả cả ví — đổi tab không cần gọi lại API. */
  readonly availableVouchers = computed(() =>
    this.vouchers().filter((v) => v.status === 'AVAILABLE'),
  );
  readonly usedVouchers = computed(() => this.vouchers().filter((v) => v.status === 'USED'));
  readonly expiredVouchers = computed(() => this.vouchers().filter((v) => v.status === 'EXPIRED'));

  readonly currentList = computed<UserVoucherResponse[]>(() => {
    switch (this.activeTab()) {
      case 'USED':
        return this.usedVouchers();
      case 'EXPIRED':
        return this.expiredVouchers();
      case 'AVAILABLE':
        return this.availableVouchers();
      default:
        return [];
    }
  });

  ngOnInit(): void {
    this.loadWallet();
    this.loadClaimable();
  }

  loadWallet(): void {
    this.isLoading.set(true);
    this.voucherService.getMyVouchers().subscribe({
      next: (vouchers) => {
        this.vouchers.set(vouchers);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isLoading.set(false);
      },
    });
  }

  loadClaimable(): void {
    this.voucherService.getClaimableVouchers().subscribe({
      next: (vouchers) => this.claimable.set(vouchers),
      error: () => this.claimable.set([]),
    });
  }

  setTab(tab: WalletTab): void {
    this.activeTab.set(tab);
  }

  /** Đã có trong ví thì không cho claim lại (BE cũng chặn — R17). */
  isClaimed(voucher: VoucherResponse): boolean {
    return this.vouchers().some((v) => v.voucherId === voucher.id);
  }

  claim(voucher: VoucherResponse): void {
    if (this.isClaimed(voucher)) {
      return;
    }
    this.claimingId.set(voucher.id);
    this.voucherService.claim(voucher.id).subscribe({
      next: () => {
        this.notification.success(`Đã lưu mã ${voucher.code} vào ví`);
        this.claimingId.set(null);
        this.loadWallet();
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.claimingId.set(null);
      },
    });
  }

  /**
   * Nhãn ngắn trên "vé": % hoặc số tiền. Nhận cả voucher trong ví lẫn mẫu
   * voucher vì hai kiểu chỉ khác nhau ở các field thừa, phần mức giảm giống hệt.
   */
  voucherLabel(v: UserVoucherResponse | VoucherResponse): string {
    if (v.discountPercent) {
      return `${v.discountPercent}%`;
    }
    return this.format(v.discountAmount ?? 0);
  }

  conditionText(v: { minOrderValue: number | null; maxDiscountAmount: number | null }): string {
    const parts: string[] = [];
    if (v.minOrderValue) {
      parts.push(`Đơn từ ${this.format(v.minOrderValue)}`);
    }
    if (v.maxDiscountAmount) {
      parts.push(`Giảm tối đa ${this.format(v.maxDiscountAmount)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Không điều kiện';
  }

  formatDate(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('vi-VN') : 'Không hết hạn';
  }

  statusLabel(status: UserVoucherStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Khả dụng';
      case 'USED':
        return 'Đã dùng';
      default:
        return 'Hết hạn';
    }
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
