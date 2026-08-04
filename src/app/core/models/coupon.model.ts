export interface CouponResponse {
  id: string;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export interface CouponCreationRequest {
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  expiryDate: string;
  usageLimit: number;
}

export interface CouponUpdateRequest {
  code?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  expiryDate?: string;
  usageLimit?: number;
}
