import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../utils/constants';
import { Observable } from 'rxjs';
import { Coupon, CouponCreationRequest } from '../models/coupon.model';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private apiUrl = `${API_ENDPOINTS.COUPONS}`;

  constructor(private api: ApiService) {}

  getCoupons(): Observable<Coupon[]> {
    return this.api.get<Coupon[]>(this.apiUrl);
  }

  getCouponById(id: number): Observable<Coupon> {
    return this.api.get<Coupon>(`${this.apiUrl}/${id}`);
  }

  createCoupon(data: CouponCreationRequest): Observable<Coupon> {
    return this.api.post<Coupon, CouponCreationRequest>(this.apiUrl, data);
  }

  updateCoupon(id: number, data: CouponCreationRequest): Observable<Coupon> {
    return this.api.put<Coupon, CouponCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deleteCoupon(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
