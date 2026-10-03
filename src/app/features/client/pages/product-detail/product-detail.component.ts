import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientProductService } from '@core/services/client-product.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ProductResponse } from '@core/models/product.model';
import { NotificationService } from '@core/services/notification.service';
import {
  BadgeComponent,
  BreadcrumbComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  LoadingComponent,
  PriceComponent,
  ProductCardComponent,
  QtyStepperComponent,
} from '@shared/components';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    BadgeComponent,
    BreadcrumbComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingComponent,
    PriceComponent,
    ProductCardComponent,
    QtyStepperComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ClientProductService);
  private readonly cartService = inject(ClientCartService);
  private readonly auth = inject(ClientAuthService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly product = signal<ProductResponse | null>(null);
  readonly related = signal<ProductResponse[]>([]);
  readonly quantity = signal<number>(1);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const code = params.get('code');
      if (!code) {
        this.isLoading.set(false);
        return;
      }
      this.load(code);
    });
  }

  load(code: string): void {
    this.isLoading.set(true);
    this.productService.getByCode(code).subscribe({
      next: (res) => {
        this.product.set(res.product);
        this.related.set(res.related);
        this.quantity.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.product.set(null);
        this.isLoading.set(false);
      },
    });
  }

  // Thêm vào giỏ: khách đã login → giỏ server; chưa login → localStorage.
  onAddToCart(): void {
    const p = this.product();
    if (!p) return;
    const qty = this.quantity();

    if (this.auth.isAuthenticated()) {
      this.cartService.addItem({ productId: p.id, quantity: qty }).subscribe({
        next: () => this.notification.success(`Đã thêm "${p.name}" vào giỏ hàng`),
        error: (err) => this.notification.error(this.notification.extractError(err)),
      });
      return;
    }

    this.addToGuestCart(p, qty);
    this.notification.success(`Đã thêm "${p.name}" vào giỏ hàng`);
  }

  // Mua ngay: thêm vào giỏ xong mới chuyển trang (tránh race → giỏ trống).
  onBuyNow(): void {
    const p = this.product();
    if (!p) return;
    const qty = this.quantity();

    if (this.auth.isAuthenticated()) {
      this.cartService.addItem({ productId: p.id, quantity: qty }).subscribe({
        next: () => this.router.navigate(['/cart']),
        error: (err) => this.notification.error(this.notification.extractError(err)),
      });
      return;
    }

    this.addToGuestCart(p, qty);
    this.router.navigate(['/cart']);
  }

  private addToGuestCart(p: ProductResponse, qty: number): void {
    const items = this.cartService.getGuestCart();
    const cap = this.maxBuyable();
    const existing = items.find((i) => i.productId === p.id);
    if (existing) {
      // Kẹp cả tồn kho lẫn trần mỗi khách của phiên flash (BE cũng kẹp khi gộp).
      existing.quantity = Math.min(existing.quantity + qty, cap);
    } else {
      items.push({ productId: p.id, quantity: Math.min(qty, cap) });
    }
    this.cartService.setGuestCart(items);
  }

  // Có đang giảm giá không (giá gốc > giá bán)
  hasDiscount(): boolean {
    const p = this.product();
    return !!p && !!p.originalPrice && p.originalPrice > p.price;
  }

  // Phần trăm giảm giá (làm tròn), chỉ gọi khi hasDiscount() true
  discountPercent(): number {
    const p = this.product()!;
    return Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100);
  }

  /** Dòng này đang trong phiên flash và còn suất? */
  hasFlash(): boolean {
    const p = this.product();
    return !!p && p.flashPrice != null && p.flashPrice > 0 && (p.flashStock ?? 0) > 0;
  }

  /**
   * Số máy tối đa khách được chọn: nhỏ hơn giữa tồn kho và trần mỗi khách của
   * phiên flash. Không có phiên thì chỉ giới hạn theo tồn kho.
   */
  maxBuyable(): number {
    const p = this.product();
    if (!p) {
      return 1;
    }
    const stock = p.quantity ?? 1;
    const limit = p.flashPerUserLimit;
    return limit != null && limit > 0 ? Math.min(stock, limit) : stock;
  }

  /** Tổng suất phiên = còn lại (flashStock) + đã bán (flashSold). */
  flashTotal(): number {
    const p = this.product();
    return (p?.flashStock ?? 0) + (p?.flashSold ?? 0);
  }

  /** % đã bán của suất flash. */
  flashPercent(): number {
    const total = this.flashTotal();
    return total > 0 ? Math.min(100, Math.round(((this.product()?.flashSold ?? 0) / total) * 100)) : 0;
  }

  /** Giờ kết thúc phiên flash, định dạng cho khách. */
  flashEndAt(): string {
    const end = this.product()?.flashEndAt;
    if (!end) {
      return '';
    }
    return new Date(end).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Các cặp label/value cho thông số kỹ thuật
  get specs(): { label: string; value: string | number | undefined }[] {
    const p = this.product();
    if (!p) return [];
    return [
      { label: 'CPU', value: p.cpu },
      { label: 'RAM', value: p.ram },
      { label: 'Ổ cứng', value: p.storage },
      { label: 'Card đồ họa', value: p.gpu },
      { label: 'Màn hình', value: p.screen },
      { label: 'Hệ điều hành', value: p.os },
      {
        label: 'Cân nặng',
        value: p.weight ? `${p.weight} kg` : undefined,
      },
      {
        label: 'Bảo hành',
        value: p.warrantyMonths ? `${p.warrantyMonths} tháng` : undefined,
      },
    ].filter((s) => s.value);
  }
}
