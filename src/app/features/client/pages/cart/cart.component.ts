import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { NotificationService } from '@core/services/notification.service';
import { Cart, CartItem } from '@core/models/cart.model';
import { ValidateCouponRequest } from '@core/models/order.model';
import { ClientOrderService } from '@core/services/client-order.service';
import {
  BreadcrumbComponent,
  ButtonComponent,
  CartLineItemComponent,
  EmptyStateComponent,
  LoadingComponent,
  OrderSummaryComponent,
} from '@shared/components';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbComponent,
    ButtonComponent,
    CartLineItemComponent,
    EmptyStateComponent,
    LoadingComponent,
    OrderSummaryComponent,
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(ClientAuthService);
  private readonly cartService = inject(ClientCartService);
  private readonly orderService = inject(ClientOrderService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly cart = signal<Cart | null>(null);
  readonly couponCode = signal('');
  readonly couponDiscount = signal(0);
  readonly couponNote = signal('');
  readonly couponValid = signal<boolean | null>(null);
  readonly isApplyingCoupon = signal(false);

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.loadCart();
    } else {
      this.isLoading.set(false);
    }
  }

  loadCart(): void {
    this.isLoading.set(true);
    this.cartService.getCart().subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isLoading.set(false);
      },
    });
  }

  updateQty(item: CartItem, qty: number): void {
    if (qty < 1 || qty > item.availableQuantity) {
      return;
    }
    this.cartService.updateQty(item.productId, { quantity: qty }).subscribe({
      next: (cart) => this.cart.set(cart),
      error: (err) => this.notification.error(this.notification.extractError(err)),
    });
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.productId).subscribe({
      next: (cart) => this.cart.set(cart),
      error: (err) => this.notification.error(this.notification.extractError(err)),
    });
  }

  applyCoupon(): void {
    const code = this.couponCode().trim();
    const cart = this.cart();
    if (!code || !cart) {
      return;
    }
    this.isApplyingCoupon.set(true);
    const req: ValidateCouponRequest = { code, orderTotal: cart.subtotal };
    this.orderService.validateCoupon(req).subscribe({
      next: (res) => {
        this.couponValid.set(res.valid);
        this.couponNote.set(res.message);
        this.couponDiscount.set(res.discountAmount);
        this.isApplyingCoupon.set(false);
      },
      error: (err) => {
        this.couponValid.set(false);
        this.couponNote.set(this.notification.extractError(err));
        this.isApplyingCoupon.set(false);
      },
    });
  }

  finalTotal(cart: Cart): number {
    return Math.max(0, cart.total - this.couponDiscount());
  }

  checkoutLink(): string {
    const code = this.couponCode().trim();
    return code ? `/checkout?coupon=${code}` : '/checkout';
  }

  goLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
  }

  goShop(): void {
    this.router.navigate(['/products']);
  }
}
