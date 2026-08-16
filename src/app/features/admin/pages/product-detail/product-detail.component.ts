import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    LoadingComponent,
    EmptyStateComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  product = signal<ProductResponse | null>(null);
  isLoading = signal(false);
  productId: string | null = null;

  // Computed helpers for badges
  statusBadge = computed(() => {
    const currentProduct = this.product();
    if (!currentProduct) {
      return { label: '', variant: 'neutral' as const, icon: '' };
    }
    return {
      label: currentProduct.active ? 'Đang hoạt động' : 'Ngưng hoạt động',
      variant: (currentProduct.active ? 'success' : 'danger') as 'success' | 'danger',
      icon: currentProduct.active ? 'check_circle' : 'cancel',
    };
  });

  stockBadge = computed(() => {
    const currentProduct = this.product();
    if (!currentProduct) {
      return { label: '', variant: 'neutral' as const, icon: '' };
    }
    if (currentProduct.quantity === 0) {
      return { label: 'Hết hàng', variant: 'danger' as const, icon: 'block' };
    }
    if (currentProduct.quantity < 5) {
      return { label: 'Sắp hết', variant: 'warning' as const, icon: 'warning' };
    }
    return { label: 'Còn hàng', variant: 'success' as const, icon: 'check_circle' };
  });

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.loadProduct(this.productId);
    } else {
      this.router.navigate(['/admin/products']);
    }
  }

  loadProduct(id: string) {
    this.isLoading.set(true);
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[ProductDetail] Lỗi khi tải sản phẩm:', err);
        this.isLoading.set(false);
        this.snackBar.open('Không thể tải thông tin sản phẩm', 'Đóng', { duration: 3000 });
        this.router.navigate(['/admin/products']);
      },
    });
  }

  deleteProduct() {
    const currentProduct = this.product();
    if (!currentProduct) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa sản phẩm "${currentProduct.name}" (${currentProduct.code})? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && this.productId) {
        this.productService.deleteProduct(this.productId).subscribe({
          next: () => {
            this.snackBar.open('Xóa sản phẩm thành công', 'Đóng', { duration: 3000 });
            this.router.navigate(['/admin/products']);
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.snackBar.open('Xóa sản phẩm thất bại', 'Đóng', { duration: 3000 });
          },
        });
      }
    });
  }

  navigateToEdit() {
    if (this.productId) {
      this.router.navigate(['/admin/products', this.productId, 'edit']);
    }
  }

  goBack() {
    this.router.navigate(['/admin/products']);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
}
