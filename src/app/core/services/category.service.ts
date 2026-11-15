import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { Page } from '@core/models/page.model';
import {
  CategoryResponse,
  CategoryCreationRequest,
  CategoryUpdateRequest,
  CategoryDetailResponse,
} from '@core/models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private apiUrl = `${API_ENDPOINTS.CATEGORIES}`;

  constructor(private api: ApiService) {}

  getCategories(): Observable<CategoryResponse[]> {
    return this.api.get<CategoryResponse[]>(this.apiUrl);
  }

  /**
   * Trang danh mục cho quản trị — lọc + phân trang ở DB.
   * keyword tìm trong tên danh mục; active lọc trạng thái.
   */
  getCategoryPage(params: {
    keyword?: string;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<CategoryResponse>> {
    return this.api.getPage<CategoryResponse>(`${this.apiUrl}/page`, {
      keyword: params.keyword?.trim() || undefined,
      active: params.active,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort || 'displayOrder,asc',
    });
  }

  getCategoryById(id: string): Observable<CategoryResponse> {
    return this.api.get<CategoryResponse>(`${this.apiUrl}/${id}`);
  }

  getCategoryDetail(id: string): Observable<CategoryDetailResponse> {
    return this.api.get<CategoryDetailResponse>(`${this.apiUrl}/${id}`);
  }

  private buildFormData(data: CategoryCreationRequest | CategoryUpdateRequest): FormData {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if ('displayOrder' in data && data.displayOrder !== null && data.displayOrder !== undefined) {
      formData.append('displayOrder', data.displayOrder.toString());
    }
    if ('active' in data && data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    // Cờ xóa ảnh (chỉ có ở CategoryUpdateRequest)
    if ('removeImage' in data && data.removeImage) {
      formData.append('removeImage', 'true');
    }
    // URL ảnh online (thay cho inputFile khi admin dán link)
    if (data.imageUrl) {
      formData.append('imageUrl', data.imageUrl);
    }
    // File ảnh nằm TRONG data (inputFile), khớp backend @ModelAttribute +
    // MultipartFile inputFile (giống user.service.ts, KHÔNG như product.service.ts)
    if (data.inputFile instanceof File) {
      formData.append('inputFile', data.inputFile);
    }
    return formData;
  }

  createCategory(data: CategoryCreationRequest): Observable<CategoryResponse> {
    return this.api.post<CategoryResponse, FormData>(this.apiUrl, this.buildFormData(data));
  }

  updateCategory(id: string, data: CategoryUpdateRequest): Observable<CategoryResponse> {
    return this.api.put<CategoryResponse, FormData>(
      `${this.apiUrl}/${id}`,
      this.buildFormData(data),
    );
  }

  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDeleteCategories(ids: string[]): Observable<void> {
    return this.api.post<void, { ids: string[] }>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  bulkUpdateCategoryStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }
}
