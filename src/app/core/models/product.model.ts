export interface ProductResponse {
  id: string;
  code: string;
  name: string;
  price: number; // Long (int64) -> number
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
}

export interface ProductCreationRequest {
  // Required fields (backend validates @NotBlank/@NotNull)
  code: string;
  name: string;
  price: number; // Long
  categoryId: string;

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
}

export interface ProductUpdateRequest {
  // Required fields (backend validates @NotBlank/@NotNull)
  code: string;
  name: string;
  price: number; // Long
  categoryId: string; // String (NOT Category object)

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
}
