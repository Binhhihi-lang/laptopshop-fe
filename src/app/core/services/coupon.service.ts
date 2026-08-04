import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { CouponResponse, CouponCreationRequest } from '@core/models/coupon.model';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private apiUrl = `${API_ENDPOINTS.COUPONS}`;

  constructor(private api: ApiService) {}

  getCoupons(): Observable<CouponResponse[]> {
    return this.api.get<CouponResponse[]>(this.apiUrl);
  }

  getCouponById(id: number): Observable<CouponResponse> {
    return this.api.get<CouponResponse>(`${this.apiUrl}/${id}`);
  }

  createCoupon(data: CouponCreationRequest): Observable<CouponResponse> {
    return this.api.post<CouponResponse, CouponCreationRequest>(this.apiUrl, data);
  }

  updateCoupon(id: number, data: CouponCreationRequest): Observable<CouponResponse> {
    return this.api.put<CouponResponse, CouponCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deleteCoupon(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
