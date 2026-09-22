import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientCartService } from '@core/services/client-cart.service';
import { ClientOrderService } from '@core/services/client-order.service';
import { ClientUserService } from '@core/services/client-user.service';
import { LocationService, Commune, Province } from '@core/services/location.service';
import { NotificationService } from '@core/services/notification.service';
import { Cart } from '@core/models/cart.model';
import { CreateOrderRequest, PaymentMethod, ValidateCouponRequest } from '@core/models/order.model';
import { UserResponse } from '@core/models/user.model';
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
  private readonly userService = inject(ClientUserService);
  private readonly locationService = inject(LocationService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly cart = signal<Cart | null>(null);
  readonly couponCode = signal('');
  readonly couponDiscount = signal(0);
  readonly couponNote = signal('');
  readonly couponValid = signal<boolean | null>(null);
  /** Hồ sơ khách đang đăng nhập — nguồn điền sẵn form giao hàng. */
  readonly profile = signal<UserResponse | null>(null);

  /** Chỉ điền tự động khi khách chưa nhập gì (tránh ghi đè). */
  private isFormEmpty(): boolean {
    return (
      !this.receiverFullName.trim() &&
      !this.receiverPhone.trim() &&
      !this.receiverAddress.trim() &&
      !this.receiverProvinceCode
    );
  }

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
    this.loadProfile();
    this.loadCart();
  }

  // ================== ĐIỀN SẴN TỪ HỒ SƠ ==================

  /**
   * Nạp hồ sơ khách đang đăng nhập để điền sẵn form giao hàng.
   * Lỗi mạng không chặn luồng đặt hàng — chỉ bỏ qua việc điền sẵn.
   */
  loadProfile(): void {
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.profile.set(user);
        // Khách đã tự nhập trước khi API trả về thì tôn trọng dữ liệu đã nhập.
        if (this.isFormEmpty()) {
          this.applyProfile();
        }
      },
      error: () => {
        /* Không điền sẵn được thì khách tự nhập — không cần báo lỗi. */
      },
    });
  }

  /** Điền lại toàn bộ form giao hàng từ hồ sơ (nút "Dùng thông tin của tôi"). */
  applyProfile(): void {
    const user = this.profile();
    if (!user) {
      return;
    }
    this.receiverFullName = user.fullName ?? '';
    this.receiverPhone = user.phone ?? '';
    this.receiverEmail = user.email ?? '';
    // address lưu sẵn dạng "số nhà, phường, tỉnh" — cắt đuôi để tránh lặp
    // khi submit ghép lại thành chuỗi đầy đủ.
    this.receiverAddress = this.streetPart(user);
    this.receiverProvinceCode = user.provinceCode ?? '';
    this.receiverCommuneCode = user.communeCode ?? '';
    if (user.provinceCode) {
      this.loadCommunesFor(user.provinceCode);
    }
  }

  /**
   * Bỏ phần phường/xã và tỉnh/thành đã lưu ở cuối chuỗi address, chỉ giữ
   * địa chỉ đường. Duyệt từ cuối nên không cắt nhầm khi tên đường trùng
   * tên phường/xã.
   */
  private streetPart(user: UserResponse): string {
    let address = (user.address ?? '').trim();
    const suffixes = [user.communeName, user.provinceName]
      .filter((s): s is string => !!s?.trim())
      .map((s) => s.trim());
    for (const suffix of suffixes) {
      if (address.toLowerCase().endsWith(suffix.toLowerCase())) {
        address = address.slice(0, address.length - suffix.length);
        address = address.replace(/[,\s]+$/, '');
      }
    }
    return address;
  }

  // ================== ĐỊA CHỈ 2 CẤP ==================

  /** 34 tỉnh/thành sau sáp nhập — gọi API công khai, không qua BE. */
  loadProvinces(): void {
    this.locationService.getProvinces().subscribe({
      next: (list) => this.provinces.set(list),
      error: () => this.notification.error('Không tải được danh sách tỉnh/thành'),
    });
  }

  /** Nạp phường/xã của một tỉnh — không xóa lựa chọn đang có. */
  loadCommunesFor(provinceCode: string): void {
    this.isLoadingCommunes.set(true);
    this.locationService.getCommunes(provinceCode).subscribe({
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

  /** Đổi tỉnh → xóa phường/xã đã chọn rồi nạp lại danh sách phường/xã. */
  onProvinceChange(): void {
    this.receiverCommuneCode = '';
    this.communes.set([]);
    if (!this.receiverProvinceCode) {
      return;
    }
    this.loadCommunesFor(this.receiverProvinceCode);
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
      receiverEmail: this.receiverEmail.trim() || undefined,
      receiverAddress: fullAddress,
      receiverProvinceCode: this.receiverProvinceCode,
      receiverProvinceName: provinceName,
      receiverCommuneCode: this.receiverCommuneCode,
      receiverCommuneName: communeName,
      note: this.note.trim() || undefined,
      couponCode: this.couponCode().trim() || undefined,
      paymentMethod: this.paymentMethod,
    };

    // Mở tab trống NGAY trong sự kiện click: gọi window.open trong callback
    // async sẽ bị trình duyệt chặn popup. Tab này được trỏ sang VNPay sau.
    const vnpayTab = this.paymentMethod === 'VNPAY' ? window.open('about:blank', '_blank') : null;

    this.isSubmitting.set(true);
    this.orderService.createOrder(req).subscribe({
      next: (order) => {
        this.isSubmitting.set(false);
        this.cartService.setCount(0);
        if (this.paymentMethod === 'VNPAY') {
          // Đơn đã tạo + trừ tồn kho; tab VNPay lo phần thanh toán, tab hiện
          // tại giữ lại để khách xem đơn.
          this.orderService.createVnpayPayment({ orderCode: order.orderCode }).subscribe({
            next: (res) => {
              if (vnpayTab) {
                // Cắt tham chiếu opener trước khi rời sang cổng thanh toán.
                vnpayTab.opener = null;
                vnpayTab.location.href = res.paymentUrl;
                this.router.navigate(['/order-success'], {
                  queryParams: { code: order.orderCode, id: order.id, pending: 'vnpay' },
                });
              } else {
                // Popup bị chặn → đành sang VNPay ngay tại tab hiện tại.
                window.location.href = res.paymentUrl;
              }
            },
            error: (err) => {
              vnpayTab?.close();
              this.notification.error(this.notification.extractError(err));
              // Đơn đã tạo rồi (đã trừ tồn kho) — không để khách kẹt ở checkout:
              // đưa sang chi tiết đơn, nơi có nút "Thanh toán lại".
              this.router.navigate(['/orders', order.id]);
            },
          });
          return;
        }
        this.router.navigate(['/order-success'], {
          queryParams: { code: order.orderCode, id: order.id },
        });
      },
      error: (err) => {
        vnpayTab?.close();
        this.notification.error(this.notification.extractError(err));
        this.isSubmitting.set(false);
      },
    });
  }
}
