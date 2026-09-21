import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientCartService } from '@core/services/client-cart.service';
import { ClientOrderService } from '@core/services/client-order.service';
import { LocationService, Commune, Province } from '@core/services/location.service';
import { NotificationService } from '@core/services/notification.service';
import { Cart } from '@core/models/cart.model';
import { CreateOrderRequest, PaymentMethod, ValidateCouponRequest } from '@core/models/order.model';
import {
  BreadcrumbComponent,
  ButtonComponent,
  CheckoutStepsComponent,
  LoadingComponent,
  OrderSummaryComponent,
  SelectComponent,
  SelectOption,
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
    SelectComponent,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cartService = inject(ClientCartService);
  private readonly orderService = inject(ClientOrderService);
  private readonly locationService = inject(LocationService);
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
  receiverAddress = '';
  note = '';
  paymentMethod: PaymentMethod = 'COD';

  // Địa chỉ 2 cấp sau sáp nhập 2025: Tỉnh/Thành phố → Phường/Xã
  receiverProvinceCode = '';
  receiverCommuneCode = '';

  readonly provinces = signal<Province[]>([]);
  readonly communes = signal<Commune[]>([]);
  readonly isLoadingCommunes = signal(false);

  readonly provinceOptions = computed<SelectOption[]>(() =>
    this.provinces().map((p) => ({ value: String(p.code), label: p.name })),
  );
  readonly communeOptions = computed<SelectOption[]>(() =>
    this.communes().map((c) => ({ value: String(c.code), label: c.name })),
  );

  ngOnInit(): void {
    const coupon = this.route.snapshot.queryParamMap.get('coupon');
    if (coupon) {
      this.couponCode.set(coupon);
    }
    this.loadProvinces();
    this.loadCart();
  }

  // ================== ĐỊA CHỈ 2 CẤP ==================

  /** 34 tỉnh/thành sau sáp nhập — gọi API công khai, không qua BE. */
  loadProvinces(): void {
    this.locationService.getProvinces().subscribe({
      next: (list) => this.provinces.set(list),
      error: () => this.notification.error('Không tải được danh sách tỉnh/thành'),
    });
  }

  /** Đổi tỉnh → xóa phường/xã đã chọn rồi nạp lại danh sách phường/xã. */
  onProvinceChange(): void {
    this.receiverCommuneCode = '';
    this.communes.set([]);
    if (!this.receiverProvinceCode) {
      return;
    }
    this.isLoadingCommunes.set(true);
    this.locationService.getCommunes(this.receiverProvinceCode).subscribe({
      next: (list) => {
        this.communes.set(list);
        this.isLoadingCommunes.set(false);
      },
      error: () => {
        this.isLoadingCommunes.set(false);
        this.notification.error('Không tải được danh sách phường/xã');
      },
    });
  }

  /** Tên tỉnh/phường theo code đang chọn — dùng để ghép chuỗi địa chỉ. */
  private provinceName(): string {
    return this.provinces().find((p) => String(p.code) === this.receiverProvinceCode)?.name ?? '';
  }

  private communeName(): string {
    return this.communes().find((c) => String(c.code) === this.receiverCommuneCode)?.name ?? '';
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
    if (!this.receiverProvinceCode || !this.receiverCommuneCode) {
      this.notification.warn('Vui lòng chọn tỉnh/thành và phường/xã');
      return;
    }

    // Ghép địa chỉ 2 cấp thành 1 chuỗi cho cột receiverAddress của BE
    const provinceName = this.provinceName();
    const communeName = this.communeName();
    const fullAddress = `${this.receiverAddress.trim()}, ${communeName}, ${provinceName}`;

    const req: CreateOrderRequest = {
      receiverFullName: this.receiverFullName.trim(),
      receiverPhone: this.receiverPhone.trim(),
      receiverAddress: fullAddress,
      receiverProvinceCode: this.receiverProvinceCode,
      receiverProvinceName: provinceName,
      receiverCommuneCode: this.receiverCommuneCode,
      receiverCommuneName: communeName,
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
