import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FlashSaleService } from '@core/services/flash-sale.service';
import { FlashSaleItemResponse, FlashSaleResponse } from '@core/models/flash-sale.model';
import {
  BreadcrumbComponent,
  EmptyStateComponent,
  LoadingComponent,
} from '@shared/components';

/**
 * Trang `/flash-sale` — phiên đang chạy + tab phiên sắp diễn ra (D31).
 * Public: khách chưa đăng nhập vẫn xem được giá sốc.
 */
@Component({
  selector: 'app-flash-sale',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, BreadcrumbComponent, EmptyStateComponent, LoadingComponent],
  templateUrl: './flash-sale.component.html',
})
export class FlashSalePageComponent implements OnInit {
  private readonly flashSaleService = inject(FlashSaleService);

  readonly isLoading = signal(true);
  readonly activeSale = signal<FlashSaleResponse | null>(null);
  readonly upcoming = signal<FlashSaleResponse[]>([]);
  readonly activeTab = signal<'running' | 'upcoming'>('running');

  readonly items = computed<FlashSaleItemResponse[]>(() => this.activeSale()?.items ?? []);

  ngOnInit(): void {
    // 2 API độc lập: 1 cái lỗi không được chặn cái còn lại (R20).
    this.flashSaleService.getActive().subscribe({
      next: (sale) => {
        this.activeSale.set(sale);
        this.isLoading.set(false);
      },
      error: () => {
        this.activeSale.set(null);
        this.isLoading.set(false);
      },
    });
    this.flashSaleService.getUpcoming(5).subscribe({
      next: (sales) => this.upcoming.set(sales),
      error: () => this.upcoming.set([]),
    });
  }

  setTab(tab: 'running' | 'upcoming'): void {
    this.activeTab.set(tab);
  }

  /** Tổng suất phiên của một item = còn lại (flashStock) + đã bán (soldInFlash). */
  flashTotal(item: FlashSaleItemResponse): number {
    return (item.flashStock ?? 0) + (item.soldInFlash ?? 0);
  }

  /** % đã bán của một item — vẽ thanh tiến độ. */
  soldPercent(item: FlashSaleItemResponse): number {
    const total = this.flashTotal(item);
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round(((item.soldInFlash ?? 0) / total) * 100));
  }

  /** % giảm so với giá thường. */
  discountPercent(item: FlashSaleItemResponse): number | null {
    if (!item.regularPrice || item.regularPrice <= 0 || !item.flashPrice) {
      return null;
    }
    return Math.round((1 - item.flashPrice / item.regularPrice) * 100);
  }

  /** Còn mua được không (kho phiên + suất mỗi khách). */
  isAvailable(item: FlashSaleItemResponse): boolean {
    return (item.remainingStock ?? 0) > 0;
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
