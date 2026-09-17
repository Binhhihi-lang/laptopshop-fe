/** DTOs giỏ hàng storefront — khớp dto/response/Client + dto/request/Client ở BE. */

export interface CartItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productImage: string;
  factory: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  lineTotal: number;
  availableQuantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
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
