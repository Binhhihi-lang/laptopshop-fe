import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { ClientVoucherService } from '@core/services/client-voucher.service';
import { NotificationService } from '@core/services/notification.service';
import { Cart, CartItem } from '@core/models/cart.model';
import { ValidateVoucherRequest } from '@core/models/order.model';
import { UserVoucherResponse } from '@core/models/voucher.model';
import { ClientOrderService } from '@core/services/client-order.service';
import {
  BreadcrumbComponent,
  CartLineItemComponent,
  EmptyStateComponent,
  LoadingComponent,
  OrderSummaryComponent,
  PromoOverlayComponent,
} from '@shared/components';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    BreadcrumbComponent,
    CartLineItemComponent,
    EmptyStateComponent,
    LoadingComponent,
    OrderSummaryComponent,
    PromoOverlayComponent,
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(ClientAuthService);
  private readonly cartService = inject(ClientCartService);
  private readonly orderService = inject(ClientOrderService);
  private readonly voucherService = inject(ClientVoucherService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly cart = signal<Cart | null>(null);
  readonly voucherCode = signal('');
  readonly voucherDiscount = signal(0);
  /** BR-V14: phần mệnh giá voucher không dùng được (đơn nhỏ hơn mệnh giá). */
  readonly voucherForfeited = signal(0);
  readonly voucherNote = signal('');
  readonly voucherValid = signal<boolean | null>(null);
  readonly isApplyingVoucher = signal(false);

  /** Overlay "Khuyến mại và ưu đãi" (G8 — dùng chung với trang thanh toán). */
  readonly isOverlayOpen = signal(false);
  readonly vouchers = signal<UserVoucherResponse[]>([]);
  readonly selectedVoucherId = signal<string | null>(null);

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.loadCart();
      this.loadVouchers();
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

  /** Chỉ voucher còn dùng được mới cho chọn. */
  loadVouchers(): void {
    this.voucherService.getMyVouchers('AVAILABLE').subscribe({
      next: (vouchers) => this.vouchers.set(vouchers),
      error: () => this.vouchers.set([]),
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

  /** Bấm + vượt trần mỗi khách của phiên flash → nhắc thay vì im lặng. */
  onLimitWarning(limit: number): void {
    this.notification.warn(`Chỉ được mua tối đa ${limit} máy/khách cho sản phẩm này`);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.productId).subscribe({
      next: (cart) => this.cart.set(cart),
      error: (err) => this.notification.error(this.notification.extractError(err)),
    });
  }

  /**
   * D14: chỉ gửi `code` — BE tự đọc giỏ và tự tính. FE không gửi số tiền lên
   * nữa nên không sửa được giá, và con số trả về khớp lúc chốt đơn.
   */
  applyVoucher(): void {
    const code = this.voucherCode().trim();
    if (!code || !this.cart()) {
      return;
    }
    this.isApplyingVoucher.set(true);
    const req: ValidateVoucherRequest = { code };
    this.orderService.validateVoucher(req).subscribe({
      next: (res) => {
        this.voucherValid.set(res.valid);
        this.voucherNote.set(res.message);
        this.voucherDiscount.set(res.discountAmount);
        this.voucherForfeited.set(res.forfeitedAmount);
        this.isApplyingVoucher.set(false);
      },
      error: (err) => {
        this.voucherValid.set(false);
        this.voucherNote.set(this.notification.extractError(err));
        this.voucherForfeited.set(0);
        this.isApplyingVoucher.set(false);
      },
    });
  }

  openOverlay(): void {
    this.isOverlayOpen.set(true);
  }

  closeOverlay(): void {
    this.isOverlayOpen.set(false);
  }

  /** Chọn voucher khác → số tiền đổi ngay; bỏ chọn thì về 0. */
  onVoucherChange(voucherId: string | null): void {
    this.selectedVoucherId.set(voucherId);
    if (voucherId === null) {
      this.voucherDiscount.set(0);
      this.voucherForfeited.set(0);
      this.voucherNote.set('');
      this.voucherValid.set(null);
      return;
    }
    this.revalidateWithVoucher(voucherId);
  }

  /**
   * BR-V13: voucher lấy từ ví cũng phải hỏi BE số tiền, KHÔNG tự tính ở FE.
   *
   * <p>
   * Trước đây hàm này chỉ set cờ `voucherValid = true` và để
   * {@code voucherPreviewDiscount()} tự tính trên `subtotal` — bỏ qua phạm vi
   * (scope) của voucher, nên số hiển thị lệch với số BE thu (có ca lệch hàng
   * chục triệu). Nay gọi đúng API validate như nhánh gõ mã.
   */
  private revalidateWithVoucher(voucherId: string): void {
    const voucher = this.vouchers().find((v) => v.id === voucherId);
    if (!voucher) {
      return;
    }
    this.voucherCode.set('');
    this.isApplyingVoucher.set(true);
    this.orderService.validateVoucher({ userVoucherId: voucherId }).subscribe({
      next: (res) => {
        this.voucherValid.set(res.valid);
        this.voucherNote.set(res.message);
        this.voucherDiscount.set(res.discountAmount);
        this.voucherForfeited.set(res.forfeitedAmount);
        this.isApplyingVoucher.set(false);
      },
      error: (err) => {
        this.voucherValid.set(false);
        this.voucherNote.set(this.notification.extractError(err));
        this.voucherDiscount.set(0);
        this.voucherForfeited.set(0);
        this.isApplyingVoucher.set(false);
      },
    });
  }

  /**
   * D6/D14: dùng `payable` BE trả thay vì tự trừ ở FE. Số voucher lấy từ BE
   * (BR-V13) nên không còn phép tính nào ở FE.
   */
  finalTotal(cart: Cart): number {
    const base = cart.payable ?? cart.total;
    return Math.max(0, base - this.voucherDiscount());
  }

  /** Tiền voucher đang chọn giảm — lấy từ BE, không tự tính (BR-V13). */
  voucherPreviewDiscount(): number {
    return this.voucherDiscount();
  }

  /** Tổng tiết kiệm hiện ở overlay: khuyến mại + voucher đang chọn. */
  totalSaving(): number {
    const cart = this.cart();
    return (cart?.promotionDiscount ?? 0) + this.voucherPreviewDiscount();
  }

  /**
   * Query mang ưu đãi đang chọn sang trang thanh toán. Tách riêng `voucherId`
   * (chọn từ ví) và `code` (gõ tay) vì checkout cần biết đang có cái nào —
   * trước đây cả hai dùng chung một khóa nên checkout không phân biệt được.
   */
  checkoutQueryParams(): Record<string, string> {
    const voucherId = this.selectedVoucherId();
    if (voucherId) {
      return { voucherId };
    }
    const code = this.voucherCode().trim();
    return code ? { code } : {};
  }

  goLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  goShop(): void {
    this.router.navigate(['/products']);
  }
}
