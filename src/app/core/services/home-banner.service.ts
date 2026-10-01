import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { HomeBannerCreationRequest, HomeBannerResponse } from '@core/models/home-banner.model';

/**
 * Banner trang chủ — admin CRUD + client đọc.
 * Khớp HomeBannerRestController (/api/v1/admin/home-banners) và
 * ClientHomeBannerController (/api/v1/client/home-banners, public).
 */
@Injectable({ providedIn: 'root' })
export class HomeBannerService {
  private readonly api = inject(ApiService);
  private readonly adminUrl = API_ENDPOINTS.HOME_BANNERS;

  // ===== Admin =====

  getBanners(): Observable<HomeBannerResponse[]> {
    return this.api.get<HomeBannerResponse[]>(this.adminUrl);
  }

  getBannerById(id: string): Observable<HomeBannerResponse> {
    return this.api.get<HomeBannerResponse>(`${this.adminUrl}/${id}`);
  }

  createBanner(data: HomeBannerCreationRequest): Observable<HomeBannerResponse> {
    return this.api.post<HomeBannerResponse, FormData>(this.adminUrl, this.buildFormData(data));
  }

  updateBanner(id: string, data: HomeBannerCreationRequest): Observable<HomeBannerResponse> {
    return this.api.put<HomeBannerResponse, FormData>(
      `${this.adminUrl}/${id}`,
      this.buildFormData(data),
    );
  }

  deleteBanner(id: string): Observable<void> {
    return this.api.delete<void>(`${this.adminUrl}/${id}`);
  }

  /** Bật/tắt slide ngay trên thẻ. BE chặn trần 5 slide đang bật. */
  setActive(id: string, active: boolean): Observable<HomeBannerResponse> {
    return this.api.patch<HomeBannerResponse, { active: boolean }>(`${this.adminUrl}/${id}/status`, {
      active,
    });
  }

  // ===== Client =====

  /** Slide khách thấy ở trang chủ — public, không cần token. */
  getActiveBanners(): Observable<HomeBannerResponse[]> {
    return this.api.get<HomeBannerResponse[]>('/client/home-banners');
  }

  /** FormData khớp `@ModelAttribute HomeBannerCreationRequest` ở BE. */
  private buildFormData(data: HomeBannerCreationRequest): FormData {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.kicker) {
      formData.append('kicker', data.kicker);
    }
    if (data.subtitle) {
      formData.append('subtitle', data.subtitle);
    }
    formData.append('targetType', data.targetType);
    formData.append('targetValue', data.targetValue);
    if (data.sortOrder !== undefined && data.sortOrder !== null) {
      formData.append('sortOrder', data.sortOrder.toString());
    }
    if (data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    if (data.removeImage) {
      formData.append('removeImage', 'true');
    }
    if (data.inputFile instanceof File) {
      formData.append('inputFile', data.inputFile);
    }
    return formData;
  }
}
