import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { PromotionService } from '@core/services/promotion.service';
import { ProductService } from '@core/services/product.service';
import { PromotionResponse } from '@core/models/promotion.model';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';

/** Xem chi tiết + thống kê lượt dùng của một chương trình khuyến mại (Sprint 4b). */
@Component({
  selector: 'app-promotion-detail',
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
    SkeletonComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './promotion-detail.component.html',
})
export class PromotionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly promotionService = inject(PromotionService);
  private readonly productService = inject(ProductService);
  private readonly notification = inject(NotificationService);

  isLoading = signal(false);
  promotion = signal<PromotionResponse | null>(null);
  errorMessage = signal('');
  permissionDenied = signal<boolean>(false);
  /** Tên sản phẩm loại trừ — BE chỉ trả id nên FE tra thêm để hiện chip. */
  excludeNames = signal<{ id: string; label: string }[]>([]);

  statusBadge = computed(() => {
    const p = this.promotion();
    if (!p) {
      return { label: '', variant: 'neutral' as const };
    }
    return p.active
      ? { label: 'Đang bật', variant: 'success' as const }
      : { label: 'Đã tắt', variant: 'danger' as const };
  });

  timeBadge = computed(() => {
    const p = this.promotion();
    if (!p) {
      return { label: '', variant: 'neutral' as const };
    }
    const state = this.timeState(p);
    if (state === 'upcoming') {
      return { label: 'Sắp diễn ra', variant: 'info' as const };
    }
    if (state === 'ended') {
      return { label: 'Đã kết thúc', variant: 'neutral' as const };
    }
    return { label: 'Đang chạy', variant: 'success' as const };
  });

  /** % ngân sách đã dùng — FE suy từ usedCount/usageLimit. */
  usagePercent = computed(() => {
    const p = this.promotion();
    if (!p || !p.usageLimit || p.usageLimit <= 0) {
      return null;
    }
    return Math.min(100, Math.round((p.usedCount / p.usageLimit) * 100));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPromotion(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID chương trình');
    }
  }

  loadPromotion(id: string): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.promotionService.getPromotionById(id).subscribe({
      next: (promotion) => {
        this.promotion.set(promotion);
        this.isLoading.set(false);
        this.loadExcludeNames(promotion.excludeProductIds ?? []);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set('Không thể tải thông tin chương trình');
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
      },
    });
  }

  /**
   * Tra tên sản phẩm loại trừ. Lỗi ở đây KHÔNG làm hỏng trang — chip chỉ là
   * thông tin phụ, cùng cách xử lý với bảng "Khách đã nhận" của voucher.
   */
  private loadExcludeNames(ids: string[]): void {
    if (ids.length === 0) {
      this.excludeNames.set([]);
      return;
    }
    this.productService.getProducts().subscribe({
      next: (products) => {
        const map = new Map((products ?? []).map((p) => [p.id, p]));
        this.excludeNames.set(
          ids.map((id) => {
            const p = map.get(id);
            return { id, label: p ? `${p.code} — ${p.name}` : id };
          }),
        );
      },
      error: () => this.excludeNames.set(ids.map((id) => ({ id, label: id }))),
    });
  }

  /** Số ngày còn lại tới khi kết thúc (âm = đã qua). */
  daysLeft = computed(() => {
    const p = this.promotion();
    if (!p) return 0;
    const diff = new Date(p.endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  });

  /** Số đơn còn lại trong ngân sách (null = không giới hạn). */
  budgetLeft = computed(() => {
    const p = this.promotion();
    if (!p || !p.usageLimit || p.usageLimit <= 0) return null;
    return Math.max(0, p.usageLimit - (p.usedCount ?? 0));
  });

  goBack(): void {
    this.router.navigate(['/admin/promotions']);
  }

  goToEdit(): void {
    const p = this.promotion();
    if (p) {
      this.router.navigate(['/admin/promotions', p.id, 'edit']);
    }
  }

  /** Bật/tắt chương trình ngay ở màn chi tiết. */
  toggleActive(): void {
    const p = this.promotion();
    if (!p) return;
    this.promotionService.bulkUpdateStatus([p.id], !p.active).subscribe({
      next: () => {
        this.notification.success(`Đã ${p.active ? 'tạm dừng' : 'bật'} "${p.name}"`);
        this.loadPromotion(p.id);
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  /** Nhân bản: mở form tạo mới với dữ liệu chương trình hiện tại. */
  duplicate(): void {
    const p = this.promotion();
    if (!p) return;
    this.router.navigate(['/admin/promotions/create'], { state: { duplicateFrom: p } });
  }

  timeState(p: PromotionResponse): 'running' | 'upcoming' | 'ended' {
    const now = Date.now();
    if (now < new Date(p.startDate).getTime()) return 'upcoming';
    if (now > new Date(p.endDate).getTime()) return 'ended';
    return 'running';
  }

  discountLabel(p: PromotionResponse): string {
    return p.discountType === 'PERCENT'
      ? `${p.discountValue}%`
      : `${this.format(p.discountValue)} / máy`;
  }

  discountTypeLabel(p: PromotionResponse): string {
    return p.discountType === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền / máy';
  }

  scopeLabel(p: PromotionResponse): string {
    switch (p.scopeType) {
      case 'ALL':
        return 'Toàn bộ đơn';
      case 'CATEGORY':
        return 'Theo danh mục';
      case 'BRAND':
        return 'Theo hãng';
      default:
        return 'Theo sản phẩm';
    }
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
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
