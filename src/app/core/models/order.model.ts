/** DTOs đơn hàng storefront — khớp dto/response/Client + dto/request/Client ở BE. */

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'VNPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

/** Nhãn tiếng Việt + màu badge cho từng trạng thái — dùng chung admin + client. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  SHIPPING: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

/** Thứ tự luồng trạng thái — dùng cho nút/bảng đổi trạng thái của admin. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
];

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  productImage: string;
  /** Đơn giá tại thời điểm mua (chưa trừ khuyến mại của dòng). */
  price: number;
  quantity: number;
  /** Thành tiền = price × quantity − discountAmount. */
  lineTotal: number;
  /** Tiền khuyến mại giảm riêng dòng này (0/undefined nếu không giảm). */
  discountAmount?: number;
}

export interface OrderSummary {
  id: string;
  orderCode: string;
  orderDate: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  itemCount: number;
  distinctItemCount: number;
  firstProductName: string;
  firstProductImage: string;
  productNames: string[];
}

export interface OrderDetail extends OrderSummary {
  /** Tiền hàng SAU khi trừ giảm giá cấp dòng (chưa trừ voucher). */
  subtotal: number;
  /** Tiền hàng GỐC = Σ(giá × số lượng), chưa trừ gì — mốc để các dòng cộng khớp. */
  totalBeforeDiscount?: number;
  discountAmount: number;
  /** Giảm cấp DÒNG từ khuyến mại (undefined = đơn cũ trước Sprint 1). */
  promotionDiscount?: number;
  /** Giảm cấp ĐƠN từ voucher (undefined = đơn cũ). */
  voucherDiscount?: number;
  /** Chương trình khuyến mại đã áp — rỗng nếu không có hoặc đơn cũ. */
  promotionLines?: OrderPromotionLine[];
  shippingFee: number;
  voucherCode?: string;
  receiverFullName: string;
  receiverPhone: string;
  receiverEmail?: string;
  receiverAddress: string;
  receiverProvinceCode?: string;
  receiverProvinceName?: string;
  receiverCommuneCode?: string;
  receiverCommuneName?: string;
  note?: string;
  items: OrderItem[];
  /** Các lần thử thanh toán (mới nhất trước) — rỗng với đơn COD. */
  payments: PaymentAttempt[];
  /** Rule thanh toán lại do BE quyết — FE không tự suy ra. */
  canRetryPayment: boolean;
  /** Lý do bị chặn thanh toán lại (tiếng Việt, từ BE); null khi được phép. */
  retryBlockedReason?: string;
}

/** Một chương trình khuyến mại đã áp cho đơn — khớp PromotionLine ở BE. */
export interface OrderPromotionLine {
  promotionId: string;
  /** Tên chương trình; null nếu chương trình đã bị xóa khỏi DB. */
  name: string | null;
  /** Tổng tiền chương trình này đã giảm cho cả đơn. */
  discountAmount: number;
}

/** Một lần thử thanh toán — khớp PaymentAttemptResponse ở BE. */
export interface PaymentAttempt {
  id: string;
  txnRef: string;
  attemptNo: number;
  status: PaymentStatus;
  amount: number;
  responseCode?: string;
  transactionNo?: string;
  bankCode?: string;
  createdAt: string;
}

export interface CreateOrderRequest {
  receiverFullName: string;
  receiverPhone: string;
  receiverEmail?: string;
  receiverAddress: string;
  receiverProvinceCode: string;
  receiverProvinceName: string;
  receiverCommuneCode: string;
  receiverCommuneName: string;
  note?: string;
  /** Mã gõ tay. D11: không được gửi đồng thời với userVoucherId. */
  voucherCode?: string;
  /** Voucher lấy từ ví (id UserVoucher, KHÔNG phải mã voucher). D11. */
  userVoucherId?: string;
  paymentMethod: PaymentMethod;
}

export interface VoucherValidation {
  valid: boolean;
  code?: string;
  discountAmount: number;
  message: string;
  /**
   * Phần mệnh giá voucher KHÔNG dùng được vì đơn nhỏ hơn mệnh giá (BR-V14).
   * `> 0` = khách mất phần này, không được hoàn lại — FE hiện cảnh báo.
   */
  forfeitedAmount: number;
}

/**
 * D14: BE tự đọc giỏ của khách nên KHÔNG còn orderTotal.
 * BR-V13: gửi ĐÚNG MỘT trong hai — `code` (mã gõ tay) hoặc `userVoucherId` (ví).
 */
export interface ValidateVoucherRequest {
  code?: string;
  userVoucherId?: string;
}

// ===== Admin (khớp dto/request/Order + dto/response/Order ở BE) =====

/** Bản ghi đơn trong bảng quản lý của admin — kèm thông tin khách hàng. */
export interface AdminOrder {
  id: string;
  orderCode: string;
  orderDate: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  itemCount: number;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  receiverFullName: string;
  receiverPhone: string;
  firstProductName?: string;
  firstProductImage?: string;
  productNames: string[];
  /** Trạng thái được phép chuyển tới — BE trả về, FE không tự suy ra. */
  allowedNextStatuses: OrderStatus[];
}

/** Chi tiết đơn cho admin — có thêm khách hàng + các trạng thái được chuyển tới. */
export interface AdminOrderDetail {
  id: string;
  orderCode: string;
  orderDate: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTxnRef?: string;
  /** Tiền hàng SAU khi trừ giảm giá cấp dòng (chưa trừ voucher). */
  subtotal: number;
  /** Tiền hàng GỐC = Σ(giá × số lượng), chưa trừ gì — mốc để các dòng cộng khớp. */
  totalBeforeDiscount?: number;
  discountAmount: number;
  /** G10: tách 2 nguồn giảm (D1) — null với đơn cũ trước Sprint 2. */
  promotionDiscount?: number | null;
  voucherDiscount?: number | null;
  /** Các chương trình khuyến mại đã áp, gộp theo promotionId. */
  promotionLines?: { promotionId: string; name: string | null; discountAmount: number }[];
  shippingFee: number;
  totalPrice: number;
  voucherCode?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  receiverFullName: string;
  receiverPhone: string;
  receiverEmail?: string;
  receiverAddress: string;
  note?: string;
  items: OrderItem[];
  allowedNextStatuses: OrderStatus[];
}

export interface OrderStats {
  totalOrders: number;
  pendingCount: number;
  confirmedCount: number;
  shippingCount: number;
  completedCount: number;
  cancelledCount: number;
  completedRevenue: number;
  needsAction: number;
}

/** Param lọc cho GET /admin/orders — tất cả optional. */
export interface AdminOrderFilter {
  status?: OrderStatus | '';
  paymentStatus?: PaymentStatus | '';
  keyword?: string;
  /** ISO date `yyyy-MM-dd` */
  fromDate?: string;
  /** ISO date `yyyy-MM-dd` */
  toDate?: string;
  page?: number;
  size?: number;
  /** `field,asc|desc` — vd `orderDate,desc` */
  sort?: string;
}

// ===== VNPay (khớp dto/request/Client/VnpayCreateRequest + response ở BE) =====

/** Body POST /api/v1/client/payments/vnpay/create — tạo URL thanh toán. */
export interface VnpayCreateRequest {
  orderCode: string;
}

/** Kết quả tạo URL — FE redirect trình duyệt sang paymentUrl của cổng VNPay. */
export interface VnpayCreateResponse {
  paymentUrl: string;
  orderCode: string;
}
