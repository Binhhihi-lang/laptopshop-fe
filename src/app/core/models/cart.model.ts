/** DTOs giỏ hàng storefront — khớp dto/response/Client + dto/request/Client ở BE. */

import { PromotionDiscountType } from './promotion.model';

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
  /** Trần mỗi khách của phiên; null = không giới hạn. */
  flashPerUserLimit?: number | null;
  /** Dòng CÓ phiên nhưng khách đã dùng hết suất → về giá thường, FE báo chữ. */
  flashLimitReached?: boolean;
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
  /** Cách tính: PERCENT (% trên dòng) hoặc AMOUNT (số tiền mỗi máy — D21). */
  discountType: PromotionDiscountType;
  /** Giá trị thô: PERCENT → 1..100; AMOUNT → số tiền mỗi máy. */
  discountValue: number;
  /** Trần giảm tối đa cho cả đơn; null = không trần. */
  maxDiscountAmount: number | null;
  /** Đơn tối thiểu để áp dụng; null = không yêu cầu. */
  minOrderValue: number | null;
  /** Số lượng tối thiểu MỖI DÒNG; null = không yêu cầu. */
  minQuantity: number | null;
  /** Ngân sách = số đơn tối đa được áp; null = không giới hạn. */
  usageLimit: number | null;
  /** Số tiền chương trình này giảm trên toàn giỏ (đã cap theo trần). */
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
