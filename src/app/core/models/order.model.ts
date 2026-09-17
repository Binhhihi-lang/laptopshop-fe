/** DTOs đơn hàng storefront — khớp dto/response/Client + dto/request/Client ở BE. */

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'VNPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  lineTotal: number;
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
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  couponCode?: string;
  receiverFullName: string;
  receiverPhone: string;
  receiverAddress: string;
  note?: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  receiverFullName: string;
  receiverPhone: string;
  receiverAddress: string;
  note?: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
}

export interface CouponValidation {
  valid: boolean;
  code?: string;
  discountAmount: number;
  message: string;
}

export interface ValidateCouponRequest {
  code: string;
  orderTotal: number;
}
