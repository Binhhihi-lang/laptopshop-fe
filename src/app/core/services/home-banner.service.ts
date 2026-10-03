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

  createBanner(data: HomeBannerCreationRequest, file?: File): Observable<HomeBannerResponse> {
    return this.api.post<HomeBannerResponse, FormData>(
      this.adminUrl,
      this.buildFormData(data, file),
    );
  }

  updateBanner(
    id: string,
    data: HomeBannerCreationRequest,
    file?: File,
  ): Observable<HomeBannerResponse> {
    return this.api.put<HomeBannerResponse, FormData>(
      `${this.adminUrl}/${id}`,
      this.buildFormData(data, file),
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

  /** FormData khớp `@RequestPart` ở BE (khuôn Product): DTO là 1 part JSON `bannerInfo`. */
  private buildFormData(data: HomeBannerCreationRequest, file?: File): FormData {
    const formData = new FormData();
    const infoBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('bannerInfo', infoBlob);
    if (file) {
      formData.append('inputFile', file);
    }
    return formData;
  }
}
