/**
 * Khớp BE: domain/BannerTargetType.java + dto/request|response/HomeBanner/*
 */

/** Nơi banner dẫn khách tới — FE tự build routerLink từ cặp này. */
export type BannerTargetType = 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'FLASH_SALE';

export interface HomeBannerResponse {
  id: string;
  title: string;
  /** Nhãn nhỏ in hoa phía trên tiêu đề (vd "BỘ SƯU TẬP MỚI"). */
  kicker: string | null;
  subtitle: string;
  image: string;
  targetType: BannerTargetType;
  /** Product.code | Category.id | tên hãng | FlashSale.id. */
  targetValue: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomeBannerCreationRequest {
  title: string;
  kicker?: string;
  subtitle?: string;
  /** URL ảnh online (thay cho file khi admin dán link). */
  imageUrl?: string;
  removeImage?: boolean;
  targetType: BannerTargetType;
  targetValue: string;
  sortOrder?: number;
  active?: boolean;
}
