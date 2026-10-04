/** Khoảng thời gian của Bảng điều khiển — khớp enum DashboardRange ở BE. */
export type DashboardRange = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH';

/**
 * Số liệu tổng hợp Bảng điều khiển — khớp `DashboardStatsResponse` ở BE.
 *
 * Nhóm NGƯỜI DÙNG (`userCount`, `activeUserCount`, `newCustomerCount`) là `null`
 * khi tài khoản thiếu quyền READ_USER (STAFF) — xem docs/ba/06-dashboard.md BR-D06.
 */
export interface DashboardStats {
  userCount: number | null;
  activeUserCount: number | null;
  newCustomerCount: number | null;

  productCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
  lowStockCount: number;
  criticalStockCount: number;
  lowStockProducts: LowStockProduct[];

  categoryCount: number;
  activeCategoryCount: number;

  voucherCount: number;
  activeVoucherCount: number;
  voucherExpiringSoonCount: number;

  totalOrderCount: number;
  needsActionCount: number;
  ordersTodayCount: number;
  ordersByStatus: Record<string, number>;

  revenueInRange: number;
  revenuePrevRange: number;
  revenueChangePercent: number | null;
  revenueToday: number;
  revenueYesterday: number;

  revenueSeries: DailyPoint[];
  previousRevenueSeries: DailyPoint[];

  topSellingProducts: TopProduct[];

  /** Hiệu quả khuyến mại trong kỳ (đơn không huỷ). */
  promotionEffect: PromotionEffect;
}

export interface PromotionEffect {
  totalCost: number;
  promotionCost: number;
  voucherCost: number;
  flashSaleCost: number;
  totalOrders: number;
  discountedOrders: number;
  /** Tỉ lệ đơn có khuyến mại (%); null khi kỳ không có đơn nào. */
  discountedRate: number | null;
  topPromotions: ProgramEffect[];
  topVouchers: ProgramEffect[];
  flashSale: FlashSaleEffect;
}

export interface ProgramEffect {
  id: string;
  name: string;
  orderCount: number;
  discountAmount: number;
}

export interface FlashSaleEffect {
  orderCount: number;
  quantitySold: number;
  discountAmount: number;
}

export interface LowStockProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  image?: string;
}

export interface DailyPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string | null;
  code: string;
  name: string;
  image?: string;
  quantitySold: number;
  revenue: number;
}
