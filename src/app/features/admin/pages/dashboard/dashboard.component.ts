import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@shared/material.module';

import { UserService } from '@core/services/user.service';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import { CouponService } from '@core/services/coupon.service';

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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
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

  loading = true;
  errorMessage = '';

  kpis: Kpi[] = [];

  constructor(
    private userService: UserService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private couponService: CouponService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.userService.getUsers(),
      products: this.productService.getProducts(),
      categories: this.categoryService.getCategories(),
      coupons: this.couponService.getCoupons(),
    }).subscribe({
      next: ({ users, products, categories, coupons }) => {
        this.userCount = users.length;
        this.productCount = products.length;
        this.categoryCount = categories.length;
        this.couponCount = coupons.length;

        this.activeUsers = users.length;

        this.lowStockProducts = products
          .filter((p) => p.quantity < 5)
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            code:p.code,
            name: p.name,
            quantity: p.quantity,
            image: p.image,
          }));
        this.lowStockCount = this.lowStockProducts.length;

        this.kpis = [
          {
            label: 'Total Users',
            value: this.userCount.toString(),
            icon: 'people',
            iconClass: 'bg-blue-50 text-blue-600',
            trend: { up: true, text: `${this.activeUsers} active` },
          },
          {
            label: 'Total Products',
            value: this.productCount.toString(),
            icon: 'inventory_2',
            iconClass: 'bg-emerald-50 text-emerald-600',
            trend: { up: true, text: `${this.productCount - this.lowStockCount} in stock` },
          },
          {
            label: 'Low Stock Items',
            value: this.lowStockCount.toString(),
            icon: 'error_outline',
            iconClass: 'bg-amber-50 text-amber-600',
            trend: { up: false, text: 'needs attention' },
          },
          {
            label: 'Categories',
            value: this.categoryCount.toString(),
            icon: 'category',
            iconClass: 'bg-purple-50 text-purple-600',
            trend: { up: true, text: `${this.categoryCount} active` },
          },
          {
            label: 'Coupons',
            value: this.couponCount.toString(),
            icon: 'local_offer',
            iconClass: 'bg-pink-50 text-pink-600',
            trend: { up: true, text: `${this.couponCount} active` },
          },
          {
            label: 'Revenue Today',
            value: this.formatCurrency(this.revenueToday),
            icon: 'attached_money',
            iconClass: 'bg-green-50 text-green-600',
            trend: { up: true, text: 'vs yesterday' },
          },
          {
            label: 'Recent Orders',
            value: this.recentOrders.length.toString(),
            icon: 'shopping_cart',
            iconClass: 'bg-indigo-50 text-indigo-600',
          },
          {
            label: 'Active Users',
            value: this.activeUsers.toString(),
            icon: 'trending_up',
            iconClass: 'bg-teal-50 text-teal-600',
          },
        ];

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Dashboard load error:', error);
        this.errorMessage =
          'Không thể tải thống kê dashboard' + (error.message ? ': ' + error.message : '');
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
