export interface ProductResponse {
  id: string;
  code: string;
  name: string;
  price: number; // Long (int64) -> number
  originalPrice?: number; // Giá niêm yết gốc (nếu có giảm giá); null/undefined = không giảm
  image: string;
  shortDesc: string;
  detailDesc: string;
  quantity: number; // Integer (int32) -> number
  sold: number; // Integer (int32) -> number
  factory: string;
  target: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screen: string;
  os: string;
  weight: number; // Double -> number
  warrantyMonths: number; // Integer (int32) -> number
  active: boolean;
  categoryId: string;
  categoryName: string;
  categoryActive?: boolean; // trạng thái active của Category (undefined nếu category bị xóa mềm)
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string

  // ===== Flash sale (Sprint 2b) — null/undefined nếu không trong phiên nào =====
  flashPrice?: number | null; // giá sốc thay price khi phiên đang chạy (§0.5)
  flashStock?: number | null; // kho riêng của phiên
  flashSold?: number | null; // đã bán trong phiên — vẽ "Đã bán x/y"
  flashSaleId?: string | null; // phiên chứa sản phẩm
  flashEndAt?: string | null; // lúc phiên kết thúc (đếm ngược)
  flashPerUserLimit?: number | null; // trần mỗi khách; null = không giới hạn
}

export interface ProductCreationRequest {
  // Required fields (backend validates @NotBlank/@NotNull)
  code: string;
  name: string;
  price: number; // Long
  categoryId: string;
  originalPrice?: number; // Giá niêm yết gốc (optional)

  // Optional fields
  shortDesc?: string;
  detailDesc?: string;
  quantity?: number; // Integer
  factory?: string;
  target?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  screen?: string;
  os?: string;
  weight?: number; // Double
  warrantyMonths?: number; // Integer
  active?: boolean;
  imageUrl?: string; // URL ảnh online (thay cho inputFile khi dán link)
}

export interface ProductUpdateRequest {
  // Required fields (backend validates @NotBlank/@NotNull)
  code: string;
  name: string;
  price: number; // Long
  categoryId: string; // String (NOT Category object)
  originalPrice?: number; // Giá niêm yết gốc (optional)

  // Optional fields
  removeImage?: boolean; // true = xóa ảnh hiện tại khi update (không gửi inputFile)
  shortDesc?: string;
  detailDesc?: string;
  quantity?: number; // Integer
  factory?: string;
  target?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  screen?: string;
  os?: string;
  weight?: number; // Double
  warrantyMonths?: number; // Integer
  active?: boolean;
  imageUrl?: string; // URL ảnh online (thay cho inputFile khi dán link)
}
