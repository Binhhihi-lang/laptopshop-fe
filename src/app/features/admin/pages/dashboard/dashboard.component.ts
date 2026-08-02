import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@shared/material.module';

import { UserService } from '@core/services/user.service';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import { CouponService } from '@core/services/coupon.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  userCount: number = 0;
  productCount: number = 0;
  categoryCount: number = 0;
  couponCount: number = 0;

  loading: boolean = true;
  errorMessage: string = '';

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
        this.loading = false;
        console.log('loading đã set false:', this.loading);
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.log('forkJoin error:', error);
        this.errorMessage = 'Không thể tải thống kê dashboard' + error;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}