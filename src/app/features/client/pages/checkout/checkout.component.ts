import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ClientCartService } from '@core/services/client-cart.service';
import { ClientOrderService } from '@core/services/client-order.service';
import { ClientUserService } from '@core/services/client-user.service';
import { ClientVoucherService } from '@core/services/client-voucher.service';
import { LocationService, Commune, Province } from '@core/services/location.service';
import { NotificationService } from '@core/services/notification.service';
import { Cart } from '@core/models/cart.model';
import { CreateOrderRequest, PaymentMethod, ValidateVoucherRequest } from '@core/models/order.model';
import { UserVoucherResponse } from '@core/models/voucher.model';
import { UserResponse } from '@core/models/user.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import {
  BreadcrumbComponent,
  ButtonComponent,
  CheckoutStepsComponent,
  LoadingComponent,
  OrderSummaryComponent,
  PromoOverlayComponent,
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
    MatIconModule,
    BreadcrumbComponent,
    ButtonComponent,
    CheckoutStepsComponent,
    LoadingComponent,
    OrderSummaryComponent,
    PromoOverlayComponent,
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
  private readonly voucherService = inject(ClientVoucherService);
  private readonly locationService = inject(LocationService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly cart = signal<Cart | null>(null);
  readonly voucherCode = signal('');
  readonly voucherDiscount = signal(0);
  /** BR-V14: phần mệnh giá voucher không dùng được (đơn nhỏ hơn mệnh giá). */
  readonly voucherForfeited = signal(0);
  /** Overlay "Khuyến mại và ưu đãi" — cùng component với trang giỏ (G8). */
  readonly isOverlayOpen = signal(false);
  readonly vouchers = signal<UserVoucherResponse[]>([]);
  readonly selectedVoucherId = signal<string | null>(null);
  readonly voucherNote = signal('');
  readonly voucherValid = signal<boolean | null>(null);
  readonly isApplyingVoucher = signal(false);
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
    // Ưu đãi mang từ trang giỏ sang: `voucherId` = chọn từ ví, `code` = gõ tay.
    // Hai khóa tách riêng vì BE chặn khi nhận đồng thời cả hai (D11).
    const voucherId = this.route.snapshot.queryParamMap.get('voucherId');
    if (voucherId) {
      this.selectedVoucherId.set(voucherId);
    }
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.voucherCode.set(code);
    }
    this.loadProvinces();
    this.loadProfile();
    this.loadVouchers();
    this.loadCart();
  }

  /** Chỉ voucher còn dùng được mới cho chọn ở overlay. */
  loadVouchers(): void {
    this.voucherService.getMyVouchers('AVAILABLE').subscribe({
      next: (vouchers) => this.vouchers.set(vouchers),
      error: () => this.vouchers.set([]),
    });
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
        // Ưu đãi mang từ trang giỏ: hỏi lại BE số tiền ngay khi có giỏ, vì
        // giá trị giảm phụ thuộc nội dung giỏ (BR-V13).
        if (this.voucherCode()) {
          this.validateVoucher();
        } else if (this.selectedVoucherId()) {
          this.onVoucherChange(this.selectedVoucherId());
        }
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isLoading.set(false);
      },
    });
  }

  /**
   * D14: chỉ gửi `code` — BE tự đọc giỏ và tự tính, FE không gửi số tiền lên.
   */
  validateVoucher(): void {
    const cart = this.cart();
    const code = this.voucherCode().trim();
    if (!cart || !code) {
      this.voucherDiscount.set(0);
      return;
    }
    const req: ValidateVoucherRequest = { code };
    this.orderService.validateVoucher(req).subscribe({
      next: (res) => {
        this.voucherValid.set(res.valid);
        this.voucherNote.set(res.message);
        this.voucherDiscount.set(res.discountAmount);
        this.voucherForfeited.set(res.forfeitedAmount);
      },
      error: () => {
        this.voucherDiscount.set(0);
        this.voucherForfeited.set(0);
      },
    });
  }

  openOverlay(): void {
    this.isOverlayOpen.set(true);
  }

  closeOverlay(): void {
    this.isOverlayOpen.set(false);
  }

  /**
   * D11: voucher từ ví và mã gõ tay loại trừ nhau — chọn cái này thì xóa cái kia,
   * vì BE chặn khi nhận cả hai.
   *
   * <p>
   * BR-V13: chọn voucher từ ví cũng phải hỏi BE số tiền — trước đây FE tự tính
   * trên `subtotal` (bỏ qua phạm vi voucher) nên số hiển thị lệch với số thu.
   */
  onVoucherChange(voucherId: string | null): void {
    this.selectedVoucherId.set(voucherId);
    if (voucherId === null) {
      this.voucherDiscount.set(0);
      this.voucherForfeited.set(0);
      this.voucherNote.set('');
      this.voucherValid.set(null);
      return;
    }
    const voucher = this.vouchers().find((v) => v.id === voucherId);
    this.voucherCode.set('');
    this.voucherNote.set(voucher ? `Đang kiểm tra ${voucher.code}…` : '');
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

  /** Tiền voucher đang chọn giảm — lấy từ BE, không tự tính (BR-V13). */
  voucherPreviewDiscount(): number {
    return this.voucherDiscount();
  }

  totalSaving(): number {
    const cart = this.cart();
    return (cart?.promotionDiscount ?? 0) + this.voucherPreviewDiscount();
  }

  /** D6/D14: dùng `payable` BE trả, không tự trừ ở FE. */
  finalTotal(cart: Cart): number {
    const base = cart.payable ?? cart.total;
    return Math.max(0, base - this.voucherPreviewDiscount());
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
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

    // Mở tab trống NGAY trong sự kiện click: gọi window.open trong callback
    // async sẽ bị trình duyệt chặn popup. Tab này được trỏ sang VNPay sau.
    // Dialog xác nhận BR-V14 bên dưới là async nên phải mở tab TRƯỚC nó.
    const vnpayTab = this.paymentMethod === 'VNPAY' ? window.open('about:blank', '_blank') : null;

    // BR-V14: voucher mệnh giá > tiền hàng → khách mất phần chênh, không hoàn.
    // Hỏi lại một lần nữa ở bước chốt đơn, không chỉ cảnh báo ở overlay.
    if (this.voucherForfeited() > 0) {
      this.confirmForfeited().subscribe((confirmed) => {
        if (confirmed) {
          this.placeOrder(vnpayTab);
        } else {
          vnpayTab?.close();
        }
      });
      return;
    }

    this.placeOrder(vnpayTab);
  }

  /** Dialog xác nhận mất tiền voucher — true nếu khách đồng ý tiếp tục. */
  private confirmForfeited(): Observable<boolean> {
    const nominal = this.voucherDiscount() + this.voucherForfeited();
    const code =
      this.voucherCode() ||
      this.vouchers().find((v) => v.id === this.selectedVoucherId())?.code ||
      '';
    return this.dialog
      .open(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Voucher vượt giá trị đơn',
          message:
            `Voucher ${code} có mệnh giá ${this.formatMoney(nominal)} nhưng chỉ giảm được ` +
            `${this.formatMoney(this.voucherDiscount())} cho đơn này. Phần chênh ` +
            `${this.formatMoney(this.voucherForfeited())} không được hoàn lại, và voucher ` +
            `vẫn tính là đã dùng. Bạn vẫn muốn đặt hàng?`,
        },
      })
      .afterClosed();
  }

  /** Tạo đơn thật. Tách khỏi `submit` vì dialog xác nhận là bất đồng bộ. */
  private placeOrder(vnpayTab: Window | null): void {
    const cart = this.cart();
    if (!cart) {
      vnpayTab?.close();
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
      // D11: chỉ gửi MỘT trong hai — overlay đã đảm bảo loại trừ nhau.
      voucherCode: this.selectedVoucherId() ? undefined : this.voucherCode().trim() || undefined,
      userVoucherId: this.selectedVoucherId() ?? undefined,
      paymentMethod: this.paymentMethod,
    };

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
