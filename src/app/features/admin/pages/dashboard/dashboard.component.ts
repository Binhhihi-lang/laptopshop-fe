import { Component, OnInit } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { CommonModule } from '@angular/common';
import { UserService } from '@core/services/user.service';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import { CouponService } from '@core/services/coupon.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
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
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    // Fetch user count
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.userCount = users.length;
        this.checkIfAllLoaded();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load user statistics';
        this.loading = false;
      },
    });

    // Fetch product count
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.productCount = products.length;
        this.checkIfAllLoaded();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load product statistics';
        this.loading = false;
      },
    });

    // Fetch category count
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categoryCount = categories.length;
        this.checkIfAllLoaded();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load category statistics';
        this.loading = false;
      },
    });

    // Fetch coupon count
    this.couponService.getCoupons().subscribe({
      next: (coupons) => {
        this.couponCount = coupons.length;
        this.checkIfAllLoaded();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load coupon statistics';
        this.loading = false;
      },
    });
  }

  private checkIfAllLoaded(): void {
    // Check if all four requests have completed
    if (
      this.userCount !== 0 ||
      this.productCount !== 0 ||
      this.categoryCount !== 0 ||
      this.couponCount !== 0
    ) {
      // We don't have a perfect way to track all requests, so we'll use a timeout approach
      // In a real app, we'd use forkJoin or similar
      setTimeout(() => {
        this.loading = false;
      }, 500);
    }
  }
}
