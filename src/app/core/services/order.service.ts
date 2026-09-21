import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Page } from '@core/models/page.model';
import {
  AdminOrder,
  AdminOrderDetail,
  AdminOrderFilter,
  OrderStats,
  OrderStatus,
} from '@core/models/order.model';

/**
 * Quản lý đơn hàng cho admin/staff.
 * Khớp BE `controller/api/OrderRestController` (`/api/v1/admin/orders`):
 *  - GET  /               → Page<AdminOrder>   (READ_ORDER)
 *  - GET  /stats          → OrderStats         (READ_ORDER)
 *  - GET  /{id}           → AdminOrderDetail   (READ_ORDER)
 *  - PATCH /{id}/status   → AdminOrderDetail   (UPDATE_ORDER)
 *  - POST /bulk-status    → number (số đơn đã đổi) (UPDATE_ORDER)
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);
  private readonly apiUrl = API_ENDPOINTS.ORDERS;

  getOrders(filter: AdminOrderFilter = {}): Observable<Page<AdminOrder>> {
    return this.api.getPage<AdminOrder>(this.apiUrl, {
      status: filter.status || undefined,
      paymentStatus: filter.paymentStatus || undefined,
      keyword: filter.keyword || undefined,
      fromDate: filter.fromDate || undefined,
      toDate: filter.toDate || undefined,
      page: filter.page,
      size: filter.size,
      sort: filter.sort,
    });
  }

  getOrderStats(): Observable<OrderStats> {
    return this.api.get<OrderStats>(`${this.apiUrl}/stats`);
  }

  getOrderById(id: string): Observable<AdminOrderDetail> {
    return this.api.get<AdminOrderDetail>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: string, status: OrderStatus): Observable<AdminOrderDetail> {
    return this.api.patch<AdminOrderDetail, { status: OrderStatus }>(
      `${this.apiUrl}/${id}/status`,
      { status },
    );
  }

  /** Trả về số đơn cập nhật thành công (đơn có bước chuyển không hợp lệ bị bỏ qua). */
  bulkUpdateStatus(ids: string[], status: OrderStatus): Observable<number> {
    return this.api.post<number, { ids: string[]; status: OrderStatus }>(
      `${this.apiUrl}/bulk-status`,
      { ids, status },
    );
  }
}
