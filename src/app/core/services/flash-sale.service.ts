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
   * FormData khớp `@ModelAttribute FlashSaleCreationRequest` ở BE.
   *
   * <p>
   * `items` là List<FlashSaleItemRequest> nên Spring bind theo CHỈ SỐ:
   * `items[0].productId`, `items[0].flashPrice`... Không gửi JSON string —
   * @ModelAttribute không parse JSON.
   */
  private buildFormData(data: FlashSaleCreationRequest): FormData {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    // datetime-local -> ISO để BE @DateTimeFormat(iso=DATE_TIME) bind được.
    formData.append('startAt', new Date(data.startAt).toISOString());
    formData.append('endAt', new Date(data.endAt).toISOString());
    if (data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    if (data.removeImage) {
      formData.append('removeImage', 'true');
    }
    if (data.imageUrl) {
      formData.append('imageUrl', data.imageUrl);
    }
    if (data.inputFile instanceof File) {
      formData.append('inputFile', data.inputFile);
    }
    data.items.forEach((item, i) => {
      formData.append(`items[${i}].productId`, item.productId);
      formData.append(`items[${i}].flashPrice`, item.flashPrice.toString());
      formData.append(`items[${i}].flashStock`, item.flashStock.toString());
      if (item.perUserLimit !== null && item.perUserLimit !== undefined) {
        formData.append(`items[${i}].perUserLimit`, item.perUserLimit.toString());
      }
    });
    return formData;
  }
}
