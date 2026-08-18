import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoryService } from '@core/services/category.service';
import { CategoryDetailResponse } from '@core/models/category.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    DetailHeaderComponent,
    SkeletonComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './category-detail.component.html',
  styleUrl: './category-detail.component.css',
})
export class CategoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  category = signal<CategoryDetailResponse | null>(null);
  errorMessage = signal('');

  // Computed helpers for badges
  statusBadge = computed(() => {
    const cat = this.category();
    if (!cat) {
      return { label: '', variant: 'neutral' as const, icon: '' };
    }
    return {
      label: cat.active ? 'Đang hoạt động' : 'Ngưng hoạt động',
      variant: (cat.active ? 'success' : 'danger') as 'success' | 'danger',
      icon: cat.active ? 'check_circle' : 'cancel',
    };
  });

  // Ưu tiên trường productCount (backend trả), fallback về độ dài mảng products
  productCount = computed(() => {
    const cat = this.category();
    if (!cat) return 0;
    return cat.productCount ?? cat.products?.length ?? 0;
  });

  hasProducts = computed(() => this.productCount() > 0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCategory(id);
    } else {
      this.errorMessage.set('Không tìm thấy ID danh mục');
    }
  }

  loadCategory(id: string): void {
    this.isLoading.set(true);
    this.categoryService.getCategoryDetail(id).subscribe({
      next: (category) => {
        this.category.set(category);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải thông tin danh mục');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/categories']);
  }

  goToEdit(): void {
    const cat = this.category();
    if (cat) {
      this.router.navigate(['/admin/categories', cat.id, 'edit']);
    }
  }

  deleteCategory(): void {
    const cat = this.category();
    if (!cat) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"? Hành động này không thể hoàn tác (các sản phẩm thuộc danh mục sẽ chuyển về "Chưa phân loại").`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result && cat.id) {
        this.categoryService.deleteCategory(cat.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa danh mục thành công', 'Đóng', { duration: 3000 });
            this.router.navigate(['/admin/categories']);
          },
          error: (error) => {
            console.error('Error deleting category:', error);
            this.snackBar.open(error.error?.message || 'Xóa danh mục thất bại', 'Đóng', {
              duration: 5000,
            });
          },
        });
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
}
