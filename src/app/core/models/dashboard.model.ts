export interface DashboardStats {
  userCount: number;
  activeUserCount: number;
  productCount: number;
  categoryCount: number;
  couponCount: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
}

export interface LowStockProduct {
  id: string;
  code: string;
  name: string;
  quantity: number;
  image?: string;
}
