import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Page } from '@core/models/page.model';
import {
  CouponValidation,
  CreateOrderRequest,
  OrderDetail,
  OrderSummary,
  ValidateCouponRequest,
  VnpayCreateRequest,
  VnpayCreateResponse,
} from '@core/models/order.model';

/** Đơn hàng storefront — khớp ClientOrderController + ClientCouponController ở BE. */
@Injectable({ providedIn: 'root' })
export class ClientOrderService {
  private readonly api = inject(ApiService);

  createOrder(req: CreateOrderRequest): Observable<OrderDetail> {
    return this.api.post<OrderDetail, CreateOrderRequest>('/client/orders', req);
  }

  getMyOrders(page = 0, size = 10): Observable<Page<OrderSummary>> {
    return this.api.getPage<OrderSummary>('/client/orders', { page, size });
  }

  getOrderById(orderId: string): Observable<OrderDetail> {
    return this.api.get<OrderDetail>(`/client/orders/${orderId}`);
  }

  cancelOrder(orderId: string): Observable<OrderDetail> {
    return this.api.post<OrderDetail, void>(`/client/orders/${orderId}/cancel`, undefined as void);
  }

  validateCoupon(req: ValidateCouponRequest): Observable<CouponValidation> {
    return this.api.post<CouponValidation, ValidateCouponRequest>('/client/coupons/validate', req);
  }

  /** Tạo URL thanh toán VNPay cho đơn đã tạo — khớp VnpayController ở BE. */
  createVnpayPayment(req: VnpayCreateRequest): Observable<VnpayCreateResponse> {
    return this.api.post<VnpayCreateResponse, VnpayCreateRequest>(
      '/client/payments/vnpay/create',
      req,
    );
  }
}
