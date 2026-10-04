/**
 * Model voucher — gộp một chỗ cho cả mẫu voucher (admin) lẫn voucher trong ví
 * khách, vì cả hai đều là "voucher" và trước đây nằm rải ở voucher.model.ts +
 * voucher.model.ts gây trùng khai báo.
 *
 * Khớp BE: domain/Voucher.java, domain/VoucherType.java, domain/ScopeType.java,
 * domain/UserVoucher*.java, dto/request|response/Voucher/*, dto/response/UserVoucher/*
 */

/** Loại voucher theo nguồn phát hành — khớp BE domain/VoucherType.java */
export type VoucherType = 'PUBLIC' | 'ASSIGNED';

export type ScopeType = 'ALL' | 'CATEGORY' | 'BRAND' | 'PRODUCT';

/** Mẫu voucher (admin quản lý) — khớp dto/response/Voucher/VoucherResponse.java */
export interface VoucherResponse {
  id: string;
  code: string;
  /** Tiêu đề hiển thị cho khách trên overlay giỏ hàng. */
  title: string | null;
  /** Mô tả / điều kiện hiển thị cho khách. */
  description: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
  startDate: string | null;
  expiryDate: string | null;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  minOrderValue: number | null;
  maxDiscountAmount: number | null;
  perUserLimit: number | null;
  scopeType: ScopeType | null;
  /** Danh sách giá trị phạm vi; rỗng = toàn bộ đơn. */
  scopeValues: string[];
  voucherType: VoucherType | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherCreationRequest {
  code: string;
  title?: string | null;
  description?: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
  startDate?: string | null;
  expiryDate: string | null;
  usageLimit: number;
  active?: boolean;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  perUserLimit?: number | null;
  scopeType?: ScopeType | null;
  scopeValues?: string[];
  voucherType?: VoucherType | null;
}

export interface VoucherUpdateRequest extends Partial<VoucherCreationRequest> {}

// ===== Voucher trong ví khách =====

/** Khớp BE domain/UserVoucherStatus.java */
export type UserVoucherStatus = 'AVAILABLE' | 'USED' | 'EXPIRED';

/** Khớp BE domain/UserVoucherSource.java */
export type UserVoucherSource = 'CLAIMED' | 'GIFTED' | 'WELCOME' | 'BIRTHDAY';

/** Một voucher trong ví khách — khớp dto/response/UserVoucher/UserVoucherResponse.java */
export interface UserVoucherResponse {
  id: string;
  /** Voucher.id — gửi lên lúc đặt hàng qua userVoucherId. */
  voucherId: string;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderValue: number | null;
  maxDiscountAmount: number | null;
  /** Tổng lượt dùng tối đa toàn hệ thống; 0 = không giới hạn. */
  usageLimit: number | null;
  /** Số lượt đã dùng trên toàn hệ thống. */
  usedCount: number | null;
  /** Số lượt tối đa MỖI KHÁCH; null = không giới hạn. */
  perUserLimit: number | null;
  status: UserVoucherStatus;
  source: UserVoucherSource;
  acquiredAt: string;
  /** null = voucher không đặt hạn (trường tồn). */
  expiresAt: string | null;
  usedAt: string | null;
}

/** Một khách đã nhận voucher — GET /admin/vouchers/{id}/holders */
export interface VoucherHolderResponse {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  source: UserVoucherSource;
  status: UserVoucherStatus;
  acquiredAt: string;
  expiresAt: string | null;
  usedAt: string | null;
}
