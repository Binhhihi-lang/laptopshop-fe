import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import {
  CouponResponse,
  CouponCreationRequest,
  CouponUpdateRequest,
} from '@core/models/coupon.model';

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private apiUrl = `${API_ENDPOINTS.COUPONS}`;

  constructor(private api: ApiService) {}

  getCoupons(): Observable<CouponResponse[]> {
    return this.api.get<CouponResponse[]>(this.apiUrl);
  }

  getCouponById(id: string): Observable<CouponResponse> {
    return this.api.get<CouponResponse>(`${this.apiUrl}/${id}`);
  }

  private buildFormData(data: CouponCreationRequest | CouponUpdateRequest): FormData {
    const formData = new FormData();
    if (data.code !== undefined) formData.append('code', data.code);
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
    if (data.usageLimit !== undefined && data.usageLimit !== null) {
      formData.append('usageLimit', data.usageLimit.toString());
    }
    if ('active' in data && data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    // Cờ xóa ảnh (chỉ có ở CouponUpdateRequest)
    if ('removeImage' in data && data.removeImage) {
      formData.append('removeImage', 'true');
    }
    // File ảnh nằm TRONG data (inputFile), khớp backend @ModelAttribute + MultipartFile inputFile
    if (data.inputFile instanceof File) {
      formData.append('inputFile', data.inputFile);
    }
    return formData;
  }

  createCoupon(data: CouponCreationRequest): Observable<CouponResponse> {
    return this.api.post<CouponResponse, FormData>(this.apiUrl, this.buildFormData(data));
  }

  updateCoupon(id: string, data: CouponUpdateRequest): Observable<CouponResponse> {
    return this.api.put<CouponResponse, FormData>(`${this.apiUrl}/${id}`, this.buildFormData(data));
  }

  deleteCoupon(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDeleteCoupons(ids: string[]): Observable<void> {
    return this.api.post<void, { ids: string[] }>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  bulkUpdateCouponStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }
}
