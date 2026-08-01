import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../utils/constants';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface CategoryDetail extends Category {
  products: any[]; // Using any for ProductResponse to avoid circular dependency
}

export interface CategoryCreationRequest {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${API_ENDPOINTS.CATEGORIES}`;

  constructor(private api: ApiService) {}

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>(this.apiUrl);
  }

  getCategoryById(id: number): Observable<Category> {
    return this.api.get<Category>(`${this.apiUrl}/${id}`);
  }

  getCategoryDetail(id: number): Observable<CategoryDetail> {
    return this.api.get<CategoryDetail>(`${this.apiUrl}/${id}`);
  }

  createCategory(data: CategoryCreationRequest): Observable<Category> {
    return this.api.post<Category, CategoryCreationRequest>(this.apiUrl, data);
  }

  updateCategory(id: number, data: CategoryCreationRequest): Observable<Category> {
    return this.api.put<Category, CategoryCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deleteCategory(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}