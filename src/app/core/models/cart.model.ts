/** DTOs giỏ hàng storefront — khớp dto/response/Client + dto/request/Client ở BE. */

export interface CartItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productImage: string;
  factory: string;
  category?: string;
  /** id danh mục — BE dùng để khớp scope voucher; FE không hiển thị. */
  categoryId?: string;
  price: number;
  originalPrice?: number;
  /** Giá sốc nếu dòng đang trong phiên flash (D25); null = không có. */
  flashPrice?: number | null;
  quantity: number;
  lineTotal: number;
  /** Tiền promotion giảm riêng dòng này (D5: mỗi dòng chỉ 1 promotion thắng). */
  lineDiscount?: number;
  availableQuantity: number;
}

/** Chương trình khuyến mại đã áp cho giỏ — FE hiện ở overlay (D14). */
export interface AppliedPromotion {
  id: string;
  name: string;
  title: string;
  discountAmount: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shippingFee: number;
  /** subtotal + shippingFee, CHƯA trừ khuyến mại/voucher. */
  total: number;
  freeShippingThreshold: number;
  /** Tổng tiền promotion giảm (chưa gồm voucher). */
  promotionDiscount?: number;
  /** Số tiền phải trả cuối cùng — BE tính, FE chỉ hiển thị (D6/D14). */
  payable?: number;
  promotions?: AppliedPromotion[];
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface MergeCartRequest {
  items: { productId: string; quantity: number }[];
}
