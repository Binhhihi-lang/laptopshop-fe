import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { FlashSaleService } from '@core/services/flash-sale.service';
import { AuthService } from '@core/services/auth.service';
import { FlashSaleResponse } from '@core/models/flash-sale.model';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { InfoItemComponent } from '@shared/components/info-item/info-item.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';

/**
 * Chi tiết một phiên flash sale: KPI, bảng sản phẩm trong phiên, thông tin và
 * hiệu quả. Doanh thu/tiền giảm suy từ `soldInFlash` × giá — BE không lưu sẵn
 * vì mỗi dòng đã có đủ số liệu.
 */
@Component({
  selector: 'app-flash-sale-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    DetailHeaderComponent,
    StatCardComponent,
    InfoItemComponent,
    SkeletonComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './flash-sale-detail.component.html',
})
export class FlashSaleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly flashSaleService = inject(FlashSaleService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  canUpdate = computed(() => this.authService.hasPermission('UPDATE_FLASH_SALE'));

  isLoading = signal(false);
  flashSale = signal<FlashSaleResponse | null>(null);
  errorMessage = signal('');
  permissionDenied = signal<boolean>(false);

  /** Tổng kho phiên. */
  totalStock = computed(() =>
    (this.flashSale()?.items ?? []).reduce((sum, i) => sum + (i.flashStock ?? 0), 0),
  );

  totalSold = computed(() =>
    (this.flashSale()?.items ?? []).reduce((sum, i) => sum + (i.soldInFlash ?? 0), 0),
  );

  soldPercent = computed(() => {
    const stock = this.totalStock();
    return stock > 0 ? Math.min(100, Math.round((this.totalSold() / stock) * 100)) : 0;
  });

  /** Doanh thu phiên = Σ (giá flash × đã bán). */
  revenue = computed(() =>
    (this.flashSale()?.items ?? []).reduce(
      (sum, i) => sum + (i.flashPrice ?? 0) * (i.soldInFlash ?? 0),
      0,
    ),
  );

  /** Tổng tiền đã giảm = Σ ((giá thường − giá flash) × đã bán). */
  totalDiscount = computed(() =>
    (this.flashSale()?.items ?? []).reduce(
      (sum, i) => sum + Math.max(0, (i.regularPrice ?? 0) - (i.flashPrice ?? 0)) * (i.soldInFlash ?? 0),
      0,
    ),
  );

  avgDiscountPerUnit = computed(() => {
    const sold = this.totalSold();
    return sold > 0 ? Math.round(this.totalDiscount() / sold) : 0;
  });

  statusBadge = computed(() => {
    const s = this.flashSale();
    if (!s) {
      return { label: '', variant: 'neutral' as const };
    }
    return { label: this.stateLabel(s), variant: this.stateVariant(s) };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFlashSale(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID phiên flash sale');
    }
  }

  loadFlashSale(id: string): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.flashSaleService.getFlashSaleById(id).subscribe({
      next: (sale) => {
        this.flashSale.set(sale);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Không thể tải thông tin phiên flash sale');
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/flash-sales']);
  }

  goToEdit(): void {
    const s = this.flashSale();
    if (s) {
      this.router.navigate(['/admin/flash-sales', s.id, 'edit']);
    }
  }

  /** Bật/tắt công tắc phiên — "Tạm dừng" khi đang bật, "Mở lại" khi đang tắt. */
  toggleActive(): void {
    const s = this.flashSale();
    if (!s) return;
    this.flashSaleService.setActive(s.id, !s.active).subscribe({
      next: (updated) => {
        this.flashSale.set(updated);
        this.notification.success(updated.active ? 'Đã mở lại phiên' : 'Đã tạm dừng phiên');
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  /** Trạng thái hiển thị theo công tắc + thời gian (khớp màn danh sách). */
  stateLabel(s: FlashSaleResponse): string {
    if (!s.active) {
      return 'Đã tạm dừng';
    }
    const now = Date.now();
    if (now < new Date(s.startAt).getTime()) {
      return 'Sắp diễn ra';
    }
    if (now > new Date(s.endAt).getTime()) {
      return 'Đã kết thúc';
    }
    return 'Đang chạy';
  }

  stateVariant(s: FlashSaleResponse): 'success' | 'info' | 'neutral' | 'danger' {
    if (!s.active) {
      return 'danger';
    }
    const now = Date.now();
    if (now < new Date(s.startAt).getTime()) {
      return 'info';
    }
    if (now > new Date(s.endAt).getTime()) {
      return 'neutral';
    }
    return 'success';
  }

  /** Phần trăm đã bán của một dòng, cho thanh tiến độ. */
  itemPercent(item: { flashStock: number; soldInFlash: number }): number {
    return item.flashStock > 0
      ? Math.min(100, Math.round((item.soldInFlash / item.flashStock) * 100))
      : 0;
  }

  itemDiscount(item: { regularPrice: number; flashPrice: number }): number {
    return Math.max(0, (item.regularPrice ?? 0) - (item.flashPrice ?? 0));
  }

  itemRevenue(item: { flashPrice: number; soldInFlash: number }): number {
    return (item.flashPrice ?? 0) * (item.soldInFlash ?? 0);
  }

  format(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
