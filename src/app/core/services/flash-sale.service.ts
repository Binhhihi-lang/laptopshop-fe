import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import {
  FlashSaleCreationRequest,
  FlashSaleResponse,
} from '@core/models/flash-sale.model';

/**
 * Flash sale — admin CRUD + client đọc.
 * Khớp FlashSaleRestController (/api/v1/admin/flash-sales) và
 * ClientFlashSaleController (/api/v1/client/flash-sales) ở BE.
 */
@Injectable({ providedIn: 'root' })
export class FlashSaleService {
  private readonly api = inject(ApiService);
  private readonly adminUrl = API_ENDPOINTS.FLASH_SALES;

  // ===== Admin =====

  getFlashSales(): Observable<FlashSaleResponse[]> {
    return this.api.get<FlashSaleResponse[]>(this.adminUrl);
  }

  getFlashSaleById(id: string): Observable<FlashSaleResponse> {
    return this.api.get<FlashSaleResponse>(`${this.adminUrl}/${id}`);
  }

  createFlashSale(data: FlashSaleCreationRequest): Observable<FlashSaleResponse> {
    return this.api.post<FlashSaleResponse, FormData>(this.adminUrl, this.buildFormData(data));
  }

  updateFlashSale(id: string, data: FlashSaleCreationRequest): Observable<FlashSaleResponse> {
    return this.api.put<FlashSaleResponse, FormData>(
      `${this.adminUrl}/${id}`,
      this.buildFormData(data),
    );
  }

  deleteFlashSale(id: string): Observable<void> {
    return this.api.delete<void>(`${this.adminUrl}/${id}`);
  }

  /** Bật/tắt công tắc phiên (màn chi tiết: Tạm dừng / Mở lại). */
  setActive(id: string, active: boolean): Observable<FlashSaleResponse> {
    return this.api.patch<FlashSaleResponse, { active: boolean }>(`${this.adminUrl}/${id}/status`, {
      active,
    });
  }

  // ===== Client =====

  /** Phiên đang chạy; null nếu không có phiên nào (BE trả result null). */
  getActive(): Observable<FlashSaleResponse | null> {
    return this.api.get<FlashSaleResponse | null>('/client/flash-sales/active');
  }

  getUpcoming(limit = 5): Observable<FlashSaleResponse[]> {
    return this.api.get<FlashSaleResponse[]>(`/client/flash-sales/upcoming?limit=${limit}`);
  }

  getById(id: string): Observable<FlashSaleResponse> {
    return this.api.get<FlashSaleResponse>(`/client/flash-sales/${id}`);
  }

  /**
   * FormData khớp `@RequestPart` ở BE (khuôn Product): toàn bộ DTO đóng gói
   * thành 1 part JSON `flashSaleInfo`. Phiên không có ảnh.
   */
  private buildFormData(data: FlashSaleCreationRequest): FormData {
    const formData = new FormData();
    const infoBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('flashSaleInfo', infoBlob);
    return formData;
  }
}
