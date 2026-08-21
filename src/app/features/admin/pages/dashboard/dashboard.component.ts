import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@shared/material.module';

import { DashboardService } from '@core/services/dashboard.service';
import { DashboardStats } from '@core/models/dashboard.model';

interface LowStockProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  image?: string;
}

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
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // Statistics
  userCount = 0;
  productCount = 0;
  categoryCount = 0;
  couponCount = 0;
  activeUsers = 0;
  lowStockCount = 0;
  revenueToday = 0;
  recentOrders: unknown[] = []; // tạm giữ mảng rỗng, chưa dùng orderService
  lowStockProducts: LowStockProduct[] = [];
  recentActivity: ActivityItem[] = [];

  loading = true;
  errorMessage = '';

  kpis: Kpi[] = [];

  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  ngAfterViewInit(): void {
    // Chart initialization will go here when chart library is added
    // this.initRevenueChart();
  }

  loadStatistics(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getStats().subscribe({
      next: (stats: DashboardStats) => {
        this.userCount = stats.userCount;
        this.activeUsers = stats.activeUserCount;
        this.productCount = stats.productCount;
        this.categoryCount = stats.categoryCount;
        this.couponCount = stats.couponCount;

        // lowStockProducts đã được backend tính sẵn (top 5, quantity < 5),
        // shape id/code/name/quantity/image khớp nguyên với template.
        this.lowStockProducts = stats.lowStockProducts;
        this.lowStockCount = stats.lowStockCount;

        this.kpis = [
          {
            label: 'Tổng người dùng',
            value: this.userCount.toString(),
            icon: 'people',
            iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            trend: { up: true, text: `${this.activeUsers} đang hoạt động` },
          },
          {
            label: 'Tổng sản phẩm',
            value: this.productCount.toString(),
            icon: 'inventory_2',
            iconClass:
              'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            trend: { up: true, text: `${this.productCount - this.lowStockCount} còn hàng` },
          },
          {
            label: 'Sản phẩm sắp hết',
            value: this.lowStockCount.toString(),
            icon: 'error_outline',
            iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            trend: { up: false, text: 'cần nhập hàng' },
          },
          {
            label: 'Danh mục',
            value: this.categoryCount.toString(),
            icon: 'category',
            iconClass: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            trend: { up: true, text: `${this.categoryCount} đang hoạt động` },
          },
          {
            label: 'Mã giảm giá',
            value: this.couponCount.toString(),
            icon: 'local_offer',
            iconClass: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
            trend: { up: true, text: `${this.couponCount} đang hoạt động` },
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
            value: this.recentOrders.length.toString(),
            icon: 'shopping_cart',
            iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
          },
          {
            label: 'Người dùng hoạt động',
            value: this.activeUsers.toString(),
            icon: 'trending_up',
            iconClass: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
          },
        ];

        // Sample recent activity data
        this.recentActivity = [
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
            iconClass:
              'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
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

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Dashboard load error:', error);
        this.errorMessage =
          'Không thể tải thống kê bảng điều khiển' + (error.message ? ': ' + error.message : '');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      case 'PROCESSING':
        return 'warning';
      default:
        return 'info';
    }
  }
}
