import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { VoucherResponse } from '@core/models/voucher.model';
import { UserVoucherResponse, UserVoucherStatus } from '@core/models/voucher.model';

/**
 * Ví voucher storefront — khớp ClientVoucherController + ClientVoucherController ở BE.
 * Đường dẫn: /api/v1/client/vouchers (ví, kho nhận được, claim, validate)
 */
@Injectable({ providedIn: 'root' })
export class ClientVoucherService {
  private readonly api = inject(ApiService);

  /** Ví của tôi; không truyền status = cả ví. */
  getMyVouchers(status?: UserVoucherStatus): Observable<UserVoucherResponse[]> {
    const query = status ? `?status=${status}` : '';
    return this.api.get<UserVoucherResponse[]>(`/client/vouchers${query}`);
  }

  /** Bấm "Lưu mã" — sinh voucher trong ví từ voucher PUBLIC. */
  claim(voucherId: string): Observable<UserVoucherResponse> {
    return this.api.post<UserVoucherResponse, void>(
      `/client/vouchers/claim/${voucherId}`,
      undefined as void,
    );
  }

  /** Kho voucher khách còn claim được (D16) — chỉ voucher PUBLIC. */
  getClaimableVouchers(): Observable<VoucherResponse[]> {
    return this.api.get<VoucherResponse[]>('/client/vouchers/available');
  }
}
