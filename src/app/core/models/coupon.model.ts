export interface CouponResponse {
  id: number;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  usageLimit: number;
  usedCount: number;
}