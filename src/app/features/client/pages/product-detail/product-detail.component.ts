import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientProductService } from '@core/services/client-product.service';
import { ProductResponse } from '@core/models/product.model';
import { NotificationService } from '@core/services/notification.service';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  LoadingComponent,
} from '@shared/components';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ClientProductService);
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

  incQty(): void {
    const max = this.product()?.quantity ?? 1;
    if (this.quantity() < max) this.quantity.update((q) => q + 1);
  }

  decQty(): void {
    if (this.quantity() > 1) this.quantity.update((q) => q - 1);
  }

  // Sprint 2 sẽ wire với cart service. Hiện tại chỉ thông báo.
  onAddToCart(): void {
    this.notification.info('Chức năng giỏ hàng sẽ có ở Sprint 2');
  }

  onBuyNow(): void {
    this.notification.info('Chức năng thanh toán sẽ có ở Sprint 2');
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
