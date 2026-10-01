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

  private buildFormData(data: VoucherCreationRequest | VoucherUpdateRequest): FormData {
    const formData = new FormData();
    if (data.code !== undefined) formData.append('code', data.code);
    if (data.title !== null && data.title !== undefined) formData.append('title', data.title);
    if (data.description !== null && data.description !== undefined) {
      formData.append('description', data.description);
    }
    if (data.discountPercent !== null && data.discountPercent !== undefined) {
      formData.append('discountPercent', data.discountPercent.toString());
    }
    if (data.discountAmount !== null && data.discountAmount !== undefined) {
      formData.append('discountAmount', data.discountAmount.toString());
    }
    // expiryDate: datetime-local -> ISO string để backend @DateTimeFormat(iso=DATE_TIME) bind được
    if (data.expiryDate !== undefined && data.expiryDate !== null && data.expiryDate !== '') {
      formData.append('expiryDate', new Date(data.expiryDate).toISOString());
    }
    if (data.startDate !== undefined && data.startDate !== null && data.startDate !== '') {
      formData.append('startDate', new Date(data.startDate).toISOString());
    }
    if (data.usageLimit !== undefined && data.usageLimit !== null) {
      formData.append('usageLimit', data.usageLimit.toString());
    }
    // Các trường mở rộng Sprint 1 (D22): gửi khi có giá trị, null = không giới hạn.
    if (data.minOrderValue !== null && data.minOrderValue !== undefined) {
      formData.append('minOrderValue', data.minOrderValue.toString());
    }
    if (data.maxDiscountAmount !== null && data.maxDiscountAmount !== undefined) {
      formData.append('maxDiscountAmount', data.maxDiscountAmount.toString());
    }
    if (data.perUserLimit !== null && data.perUserLimit !== undefined) {
      formData.append('perUserLimit', data.perUserLimit.toString());
    }
    if (data.scopeType) {
      formData.append('scopeType', data.scopeType);
    }
    // BE nhận List<String> scopeValues qua form-data: gửi từng phần tử cùng tên.
    if (data.scopeValues && data.scopeValues.length > 0) {
      for (const value of data.scopeValues) {
        formData.append('scopeValues', value);
      }
    }
    if (data.voucherType) {
      formData.append('voucherType', data.voucherType);
    }
    if ('active' in data && data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    // Cờ xóa ảnh (chỉ có ở VoucherUpdateRequest)
    if ('removeImage' in data && data.removeImage) {
      formData.append('removeImage', 'true');
    }
    // URL ảnh online (thay cho inputFile khi admin dán link)
    if (data.imageUrl) {
      formData.append('imageUrl', data.imageUrl);
    }
    // File ảnh nằm TRONG data (inputFile), khớp backend @ModelAttribute + MultipartFile inputFile
    if (data.inputFile instanceof File) {
      formData.append('inputFile', data.inputFile);
    }
    return formData;
  }

  createVoucher(data: VoucherCreationRequest): Observable<VoucherResponse> {
    return this.api.post<VoucherResponse, FormData>(this.apiUrl, this.buildFormData(data));
  }

  updateVoucher(id: string, data: VoucherUpdateRequest): Observable<VoucherResponse> {
    return this.api.put<VoucherResponse, FormData>(`${this.apiUrl}/${id}`, this.buildFormData(data));
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
