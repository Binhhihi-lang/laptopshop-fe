import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CategoryResponse } from '@core/models/category.model';

/**
 * Storefront: chỉ trả category active. Endpoint public, không cần token.
 * Khớp BE: GET /api/v1/client/categories → List<CategoryResponse>
 * (dùng `findByActiveTrueOrderByDisplayOrderAsc`).
 */
@Injectable({ providedIn: 'root' })
export class ClientCategoryService {
  private readonly api = inject(ApiService);

  list(): Observable<CategoryResponse[]> {
    return this.api.get<CategoryResponse[]>('/client/categories');
  }
}
