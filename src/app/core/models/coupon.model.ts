export interface CouponResponse {
  id: string;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  expiryDate: string | null;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponCreationRequest {
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  expiryDate: string | null;
  usageLimit: number;
  active?: boolean;
  inputFile?: File;
  imageUrl?: string; // URL ảnh online (thay cho inputFile khi dán link)
}

export interface CouponUpdateRequest {
  code?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  expiryDate?: string | null;
  usageLimit?: number;
  active?: boolean;
  inputFile?: File;
  removeImage?: boolean;
  imageUrl?: string; // URL ảnh online (thay cho inputFile khi dán link)
}
