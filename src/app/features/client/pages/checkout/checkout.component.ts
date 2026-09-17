import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientCartService } from '@core/services/client-cart.service';
import { ClientOrderService } from '@core/services/client-order.service';
import { NotificationService } from '@core/services/notification.service';
import { Cart } from '@core/models/cart.model';
import { CreateOrderRequest, PaymentMethod, ValidateCouponRequest } from '@core/models/order.model';
import {
  BreadcrumbComponent,
  ButtonComponent,
  CheckoutStepsComponent,
  LoadingComponent,
  OrderSummaryComponent,
} from '@shared/components';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbComponent,
    ButtonComponent,
    CheckoutStepsComponent,
    LoadingComponent,
    OrderSummaryComponent,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cartService = inject(ClientCartService);
  private readonly orderService = inject(ClientOrderService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly cart = signal<Cart | null>(null);
  readonly couponCode = signal('');
  readonly couponDiscount = signal(0);
  readonly couponNote = signal('');
  readonly couponValid = signal<boolean | null>(null);

  // Form giao hàng
  receiverFullName = '';
  receiverPhone = '';
  receiverEmail = '';
  receiverProvince = '';
  receiverDistrict = '';
  receiverAddress = '';
  note = '';
  paymentMethod: PaymentMethod = 'COD';

  readonly provinces = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];

  ngOnInit(): void {
    const coupon = this.route.snapshot.queryParamMap.get('coupon');
    if (coupon) {
      this.couponCode.set(coupon);
    }
    this.loadCart();
  }

  loadCart(): void {
    this.cartService.getCart().subscribe({
      next: (cart) => {
        if (cart.items.length === 0) {
          this.notification.warn('Giỏ hàng đang trống');
          this.router.navigate(['/cart']);
          return;
        }
        this.cart.set(cart);
        this.isLoading.set(false);
        if (this.couponCode()) {
          this.validateCoupon();
        }
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isLoading.set(false);
      },
    });
  }

  validateCoupon(): void {
    const cart = this.cart();
    const code = this.couponCode().trim();
    if (!cart || !code) {
      this.couponDiscount.set(0);
      return;
    }
    const req: ValidateCouponRequest = { code, orderTotal: cart.subtotal };
    this.orderService.validateCoupon(req).subscribe({
      next: (res) => {
        this.couponValid.set(res.valid);
        this.couponNote.set(res.message);
        this.couponDiscount.set(res.discountAmount);
      },
      error: () => this.couponDiscount.set(0),
    });
  }

  finalTotal(cart: Cart): number {
    return Math.max(0, cart.total - this.couponDiscount());
  }

  /** Phương thức chưa triển khai — chỉ báo "sắp ra mắt", không submit. */
  selectComingSoon(label: string): void {
    this.notification.info(`Phương thức ${label} sắp ra mắt. Vui lòng chọn COD.`);
  }

  submit(): void {
    const cart = this.cart();
    if (!cart) {
      return;
    }
    if (
      !this.receiverFullName.trim() ||
      !this.receiverPhone.trim() ||
      !this.receiverAddress.trim()
    ) {
      this.notification.warn('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ');
      return;
    }
    if (!this.receiverProvince || !this.receiverDistrict) {
      this.notification.warn('Vui lòng chọn tỉnh/thành và quận/huyện');
      return;
    }

    // Ghép địa chỉ 3 cấp thành 1 chuỗi — BE chỉ lưu 1 cột receiverAddress.
    const fullAddress = `${this.receiverAddress.trim()}, ${this.receiverDistrict}, ${this.receiverProvince}`;

    const req: CreateOrderRequest = {
      receiverFullName: this.receiverFullName.trim(),
      receiverPhone: this.receiverPhone.trim(),
      receiverAddress: fullAddress,
      note: this.note.trim() || undefined,
      couponCode: this.couponCode().trim() || undefined,
      paymentMethod: this.paymentMethod,
    };

    this.isSubmitting.set(true);
    this.orderService.createOrder(req).subscribe({
      next: (order) => {
        this.isSubmitting.set(false);
        this.cartService.setCount(0);
        this.router.navigate(['/order-success'], {
          queryParams: { code: order.orderCode, id: order.id },
        });
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isSubmitting.set(false);
      },
    });
  }
}
