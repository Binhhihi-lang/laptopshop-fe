import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
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

  getCategoryById(id: string): Observable<CategoryResponse> {
    return this.api.get<CategoryResponse>(`${this.apiUrl}/${id}`);
  }

  getCategoryDetail(id: string): Observable<CategoryDetailResponse> {
    return this.api.get<CategoryDetailResponse>(`${this.apiUrl}/${id}`);
  }

  private buildFormData(
    data: CategoryCreationRequest | CategoryUpdateRequest,
    file?: File,
  ): FormData {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if ('slug' in data && data.slug !== undefined) formData.append('slug', data.slug);
    if ('displayOrder' in data && data.displayOrder !== null && data.displayOrder !== undefined) {
      formData.append('displayOrder', data.displayOrder.toString());
    }
    if ('active' in data && data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    if (file) {
      formData.append('image', file);
    }
    return formData;
  }

  createCategory(data: CategoryCreationRequest, file?: File): Observable<CategoryResponse> {
    return this.api.post<CategoryResponse, FormData>(this.apiUrl, this.buildFormData(data, file));
  }

  updateCategory(
    id: string,
    data: CategoryUpdateRequest,
    file?: File,
  ): Observable<CategoryResponse> {
    return this.api.put<CategoryResponse, FormData>(
      `${this.apiUrl}/${id}`,
      this.buildFormData(data, file),
    );
  }

  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
