import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationService } from '@core/services/notification.service';
import { HomeBannerService } from '@core/services/home-banner.service';
import { AuthService } from '@core/services/auth.service';
import { HomeBannerResponse } from '@core/models/home-banner.model';
import { CardComponent } from '@shared/components/card/card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components';

/**
 * Danh sách banner trang chủ (Sprint 4c) — lưới card như mockup: mỗi thẻ là
 * slide thật + switch bật/tắt + menu thao tác. BE chặn tối đa 5 slide đang bật.
 */
@Component({
  selector: 'app-home-banners',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatMenuModule,
    CardComponent,
    ButtonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './home-banners.html',
})
export class HomeBannersComponent implements OnInit {
  private readonly bannerService = inject(HomeBannerService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  canDelete = computed(() => this.authService.hasPermission('DELETE_HOME_BANNER'));
  canUpdate = computed(() => this.authService.hasPermission('UPDATE_HOME_BANNER'));

  banners = signal<HomeBannerResponse[]>([]);
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);
  /** Id slide đang chờ phản hồi đổi trạng thái — khoá switch cho khỏi bấm dồn. */
  togglingId = signal<string>('');

  activeCount = computed(() => this.banners().filter((b) => b.active).length);

  /** Bảng giải thích 4 loại liên kết — mockup có ở cuối màn danh sách. */
  readonly linkGuide: { type: string; value: string; result: string }[] = [
    { type: 'PRODUCT', value: 'ROG-G16', result: 'Mở trang chi tiết sản phẩm' },
    { type: 'CATEGORY', value: 'Laptop Gaming', result: 'Mở danh sách đã lọc theo danh mục' },
    { type: 'BRAND', value: 'ASUS', result: 'Mở danh sách đã lọc theo thương hiệu' },
    { type: 'FLASH_SALE', value: 'fs-1200', result: 'Mở trang Flash Sale của phiên đó' },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.bannerService.getBanners().subscribe({
      next: (banners) => {
        this.banners.set(banners);
        this.isLoading.set(false);
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        } else {
          this.notification.error(this.notification.extractError(error));
        }
        this.isLoading.set(false);
      },
    });
  }

  createBanner(): void {
    this.router.navigate(['/admin/home-banners/create']);
  }

  editBanner(b: HomeBannerResponse): void {
    this.router.navigate(['/admin/home-banners', b.id, 'edit']);
  }

  /** Nhân bản: mở form tạo mới với nội dung slide đã điền sẵn. */
  duplicateBanner(b: HomeBannerResponse): void {
    this.router.navigate(['/admin/home-banners/create'], {
      state: { duplicateFrom: b },
    });
  }

  /**
   * Đổi trạng thái slide. Lỗi (vd vượt trần 5 slide) thì báo rõ và nạp lại
   * danh sách để switch trở về đúng trạng thái thật.
   */
  toggleActive(b: HomeBannerResponse, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next = input.checked;
    if (!this.canUpdate() || this.togglingId()) {
      input.checked = !next;
      return;
    }
    this.togglingId.set(b.id);
    this.bannerService.setActive(b.id, next).subscribe({
      next: (updated) => {
        this.banners.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.notification.success(updated.active ? 'Đã bật slide' : 'Đã ẩn slide');
        this.togglingId.set('');
      },
      error: (error) => {
        input.checked = !next;
        this.notification.error(this.notification.extractError(error));
        this.togglingId.set('');
      },
    });
  }

  remove(b: HomeBannerResponse): void {
    if (!this.canDelete()) {
      return;
    }
    this.bannerService.deleteBanner(b.id).subscribe({
      next: () => {
        this.notification.success(`Đã xóa banner "${b.title}"`);
        this.loadData();
      },
      error: (error) => this.notification.error(this.notification.extractError(error)),
    });
  }

  targetTypeLabel(b: HomeBannerResponse): string {
    switch (b.targetType) {
      case 'PRODUCT':
        return 'Sản phẩm';
      case 'CATEGORY':
        return 'Danh mục';
      case 'BRAND':
        return 'Hãng';
      case 'FLASH_SALE':
        return 'Flash sale';
      default:
        return 'Đường dẫn';
    }
  }

  /** Màu pill theo loại liên kết — khớp bảng hướng dẫn. */
  targetTypeClass(b: HomeBannerResponse): string {
    switch (b.targetType) {
      case 'PRODUCT':
        return 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300';
      case 'CATEGORY':
        return 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300';
      case 'BRAND':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
      default:
        return 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300';
    }
  }

  trackByBannerId(b: HomeBannerResponse): string {
    return b.id;
  }
}
