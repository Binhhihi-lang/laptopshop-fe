import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import {
  PromotionCreationRequest,
  PromotionResponse,
  PromotionUpdateRequest,
} from '@core/models/promotion.model';

/** Khớp PromotionRestController ở BE — /api/v1/admin/promotions */
@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly api = inject(ApiService);
  private readonly apiUrl = API_ENDPOINTS.PROMOTIONS;

  getPromotions(): Observable<PromotionResponse[]> {
    return this.api.get<PromotionResponse[]>(this.apiUrl);
  }

  getPromotionById(id: string): Observable<PromotionResponse> {
    return this.api.get<PromotionResponse>(`${this.apiUrl}/${id}`);
  }

  createPromotion(data: PromotionCreationRequest): Observable<PromotionResponse> {
    return this.api.post<PromotionResponse, PromotionCreationRequest>(this.apiUrl, data);
  }

  updatePromotion(id: string, data: PromotionUpdateRequest): Observable<PromotionResponse> {
    return this.api.put<PromotionResponse, PromotionUpdateRequest>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * "Xóa" ở BE thực chất là NGỪNG ÁP DỤNG (soft) — chương trình đã áp lên đơn
   * phải giữ lại để tra cứu. Quyền cần: UPDATE_PROMOTION, không có DELETE_PROMOTION.
   */
  deactivate(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Bật/tắt nhiều chương trình cùng lúc (bulk toolbar). */
  bulkUpdateStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }

  /** Ngừng áp hàng loạt (bulk toolbar). */
  bulkDeactivate(ids: string[]): Observable<void> {
    return this.api.patch<void, { ids: string[] }>(`${this.apiUrl}/bulk-deactivate`, { ids });
  }
}
