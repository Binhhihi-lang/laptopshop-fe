import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import {
  VoucherResponse,
  VoucherCreationRequest,
  VoucherUpdateRequest,
  VoucherHolderResponse,
} from '@core/models/voucher.model';

@Injectable({
  providedIn: 'root',
})
export class VoucherService {
  private apiUrl = `${API_ENDPOINTS.VOUCHERS}`;

  constructor(private api: ApiService) {}

  getVouchers(): Observable<VoucherResponse[]> {
    return this.api.get<VoucherResponse[]>(this.apiUrl);
  }

  getVoucherById(id: string): Observable<VoucherResponse> {
    return this.api.get<VoucherResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Chuẩn hoá trước khi gửi JSON: bỏ trường undefined/null rỗng và chuyển
   * startDate/expiryDate sang ISO để khớp LocalDateTime của BE (giống Promotion).
   */
  private buildPayload(
    data: VoucherCreationRequest | VoucherUpdateRequest,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...data };
    for (const key of ['startDate', 'expiryDate'] as const) {
      const value = payload[key];
      if (value === undefined || value === null || value === '') {
        delete payload[key];
      } else {
        payload[key] = new Date(value as string).toISOString();
      }
    }
    return payload;
  }

  createVoucher(data: VoucherCreationRequest): Observable<VoucherResponse> {
    return this.api.post<VoucherResponse, Record<string, unknown>>(
      this.apiUrl,
      this.buildPayload(data),
    );
  }

  updateVoucher(id: string, data: VoucherUpdateRequest): Observable<VoucherResponse> {
    return this.api.put<VoucherResponse, Record<string, unknown>>(
      `${this.apiUrl}/${id}`,
      this.buildPayload(data),
    );
  }

  deleteVoucher(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDeleteVouchers(ids: string[]): Observable<void> {
    return this.api.post<void, { ids: string[] }>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  bulkUpdateVoucherStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }

  /** Phát voucher đích danh cho một nhóm khách; trả về số voucher thực sự phát thêm. */
  assignVoucher(voucherId: string, userIds: string[]): Observable<number> {
    return this.api.post<number, { voucherId: string; userIds: string[] }>(
      `${this.apiUrl}/assign`,
      { voucherId, userIds },
    );
  }

  /** Danh sách khách đã nhận voucher này — bảng ở trang chi tiết. */
  getVoucherHolders(voucherId: string): Observable<VoucherHolderResponse[]> {
    return this.api.get<VoucherHolderResponse[]>(`${this.apiUrl}/${voucherId}/holders`);
  }
}
