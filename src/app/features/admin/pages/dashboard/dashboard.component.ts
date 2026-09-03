import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@shared/material.module';
import {
  PageHeaderComponent,
  CardComponent,
  CardHeaderComponent,
  BadgeComponent,
  ButtonComponent,
  LoadingComponent,
  EmptyStateComponent,
  StatCardComponent,
} from '@shared/components';

import { DashboardService } from '@core/services/dashboard.service';
import { DashboardStats } from '@core/models/dashboard.model';

interface KpiTrend {
  up: boolean;
  text: string;
}

interface Kpi {
  label: string;
  value: string;
  icon: string;
  iconClass: string;
  trend?: KpiTrend;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: string;
  iconClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    PageHeaderComponent,
    CardComponent,
    CardHeaderComponent,
    BadgeComponent,
    ButtonComponent,
    LoadingComponent,
    EmptyStateComponent,
    StatCardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  // ---- State dạng Signals (thay cho class fields + ChangeDetectorRef) ----
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly permissionDenied = signal(false);
  readonly stats = signal<DashboardStats | null>(null);

  // Doanh thu hôm nay tạm thời 0 (chưa có API doanh thu)
  private readonly revenueToday = 0;

  readonly lowStockProducts = computed(() => this.stats()?.lowStockProducts ?? []);
  readonly recentActivity = signal<ActivityItem[]>([]);

  // KPI tính lại tự động mỗi khi stats thay đổi
  readonly kpis = computed<Kpi[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const recentOrdersCount = 0; // tạm giữ 0, chưa dùng orderService
    return [
      {
        label: 'Tổng người dùng',
        value: s.userCount.toString(),
        icon: 'people',
        iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        trend: { up: true, text: `${s.activeUserCount} đang hoạt động` },
      },
      {
        label: 'Tổng sản phẩm',
        value: s.productCount.toString(),
        icon: 'inventory_2',
        iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        trend: { up: true, text: `${s.productCount - s.lowStockCount} còn hàng` },
      },
      {
        label: 'Sản phẩm sắp hết',
        value: s.lowStockCount.toString(),
        icon: 'error_outline',
        iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        trend: { up: false, text: 'cần nhập hàng' },
      },
      {
        label: 'Danh mục',
        value: s.categoryCount.toString(),
        icon: 'category',
        iconClass: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        trend: { up: true, text: `${s.categoryCount} đang hoạt động` },
      },
      {
        label: 'Mã giảm giá',
        value: s.couponCount.toString(),
        icon: 'local_offer',
        iconClass: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        trend: { up: true, text: `${s.couponCount} đang hoạt động` },
      },
      {
        label: 'Doanh thu hôm nay',
        value: this.formatCurrency(this.revenueToday),
        icon: 'attach_money',
        iconClass: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        trend: { up: true, text: 'so với hôm qua' },
      },
      {
        label: 'Đơn hàng gần đây',
        value: recentOrdersCount.toString(),
        icon: 'shopping_cart',
        iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      },
      {
        label: 'Người dùng hoạt động',
        value: s.activeUserCount.toString(),
        icon: 'trending_up',
        iconClass: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
      },
    ];
  });

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getStats().subscribe({
      next: (stats: DashboardStats) => {
        this.stats.set(stats);
        this.recentActivity.set(this.buildSampleActivity());
        this.loading.set(false); // Signals tự cập nhật view, không cần detectChanges
      },
      error: (error: HttpErrorResponse) => {
        console.error('Dashboard load error:', error);
        if (error.status === 403) {
          // Bị khóa quyền (READ_DASHBOARD) → hiện empty-state "quyền bị thu hồi"
          this.permissionDenied.set(true);
        } else {
          this.errorMessage.set(
            'Không thể tải thống kê bảng điều khiển' + (error.message ? ': ' + error.message : ''),
          );
        }
        this.loading.set(false);
      },
    });
  }

  // Dữ liệu mẫu hoạt động gần đây — khi có API activity sẽ thay bằng dữ liệu thật
  private buildSampleActivity(): ActivityItem[] {
    return [
      {
        id: '1',
        title: 'Đơn hàng mới',
        description: 'Đơn #ORD-2024-001 từ Nguyễn Văn A',
        time: '2 phút trước',
        icon: 'shopping_cart',
        iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      },
      {
        id: '2',
        title: 'Cảnh báo hết hàng',
        description: 'MacBook Pro 14" chỉ còn 3 sản phẩm',
        time: '15 phút trước',
        icon: 'warning',
        iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      },
      {
        id: '3',
        title: 'Người dùng mới',
        description: 'Trần Thị B đăng ký với vai trò STAFF',
        time: '1 giờ trước',
        icon: 'person_add',
        iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      {
        id: '4',
        title: 'Tạo mã giảm giá',
        description: 'SUMMER20 - Giảm 20% tất cả laptop',
        time: '3 giờ trước',
        icon: 'local_offer',
        iconClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      },
      {
        id: '5',
        title: 'Đơn hàng đã giao',
        description: 'Đơn #ORD-2024-005 đã chuyển cho Viettel Post',
        time: '5 giờ trước',
        icon: 'local_shipping',
        iconClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      },
    ];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}
