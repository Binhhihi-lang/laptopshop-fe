/**
 * Khớp BE: domain/PromotionType.java, PromotionDiscountType.java, ScopeType.java
 * và dto/request|response/Promotion/*.java
 */
export type PromotionType = 'PRODUCT_DISCOUNT';

export type PromotionDiscountType = 'PERCENT' | 'AMOUNT';

export type ScopeType = 'ALL' | 'CATEGORY' | 'BRAND' | 'PRODUCT';

/** Khớp dto/response/Promotion/PromotionResponse.java */
export interface PromotionResponse {
  id: string;
  name: string;
  title: string;
  description: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  active: boolean;
  priority: number | null;
  minOrderValue: number | null;
  minQuantity: number | null;
  usageLimit: number | null;
  usedCount: number;
  stackable: boolean;
  scopeType: ScopeType;
  scopeValues: string[];
  excludeProductIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Khớp dto/request/Promotion/PromotionCreationRequest.java */
export interface PromotionCreationRequest {
  name: string;
  title: string;
  description?: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  startDate: string;
  endDate: string;
  active?: boolean;
  priority?: number | null;
  minOrderValue?: number | null;
  minQuantity?: number | null;
  usageLimit?: number | null;
  stackable?: boolean;
  scopeType: ScopeType;
  scopeValues: string[];
  excludeProductIds: string[];
}

export type PromotionUpdateRequest = Partial<PromotionCreationRequest>;
