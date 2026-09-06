import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientCategoryService } from '@core/services/client-category.service';
import { ClientProductService } from '@core/services/client-product.service';
import { CategoryResponse } from '@core/models/category.model';
import { ProductResponse } from '@core/models/product.model';
import { EmptyStateComponent, LoadingComponent } from '@shared/components';

/**
 * Trang chủ storefront:
 * - Hero banner.
 * - Danh mục nổi bật (lưới chip).
 * - Sản phẩm mới (sort theo createdAt DESC, mặc định BE).
 * - Sản phẩm bán chạy (sort=sold,desc).
 *
 * Tất cả data fetch song song bằng `forkJoin`; trang chỉ cần 2 query.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, EmptyStateComponent, LoadingComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly categoryService = inject(ClientCategoryService);
  private readonly productService = inject(ClientProductService);

  readonly isLoading = signal(true);
  readonly categories = signal<CategoryResponse[]>([]);
  readonly newProducts = signal<ProductResponse[]>([]);
  readonly bestSellers = signal<ProductResponse[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    // Gọi 3 API song song. Lỗi ở 1 cái không chặn 2 cái còn lại.
    Promise.all([
      this.categoryService
        .list()
        .toPromise()
        .catch(() => [] as CategoryResponse[]),
      this.productService
        .list({ page: 0, size: 8, sort: 'createdAt,desc' })
        .toPromise()
        .then((p) => p?.content ?? []),
      this.productService
        .list({ page: 0, size: 8, sort: 'sold,desc' })
        .toPromise()
        .then((p) => p?.content ?? []),
    ]).then(([cats, news, bests]) => {
      this.categories.set(cats ?? []);
      this.newProducts.set(news ?? []);
      this.bestSellers.set(bests ?? []);
      this.isLoading.set(false);
    });
  }

  // Định dạng giá VND
  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
