/**
 * Khớp BE: dto/response/FlashSale/*, dto/request/FlashSale/*
 * và domain/BannerTargetType.java
 */

export interface FlashSaleItemResponse {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productImage: string;
  /** Giá bán trong phiên (₫). */
  flashPrice: number;
  /** Giá thường để FE hiện gạch ngang + tính % giảm. */
  regularPrice: number;
  flashStock: number;
  soldInFlash: number;
  remainingStock: number;
  /** null = không giới hạn mỗi khách (D32). */
  perUserLimit: number | null;
}

export interface FlashSaleResponse {
  id: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  active: boolean;
  /** BE tính sẵn theo giờ hiện tại — FE không tự suy. */
  running: boolean;
  itemCount: number;
  items: FlashSaleItemResponse[];
  createdAt: string;
  updatedAt: string;
}

/** Khớp `GET /api/v1/admin/flash-sales/summary` — số liệu KPI toàn hệ thống. */
export interface FlashSaleSummary {
  total: number;
  running: number;
  upcoming: number;
  totalItems: number;
  totalStock: number;
  totalSold: number;
  sessionsWithItems: number;
}

/** Khớp dto/request/FlashSale/FlashSaleItemRequest.java */
export interface FlashSaleItemRequest {
  productId: string;
  flashPrice: number;
  flashStock: number;
  perUserLimit?: number | null;
}

/** Khớp dto/request/FlashSale/FlashSaleCreationRequest.java (JSON part `flashSaleInfo`) */
export interface FlashSaleCreationRequest {
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  active?: boolean;
  items: FlashSaleItemRequest[];
}
