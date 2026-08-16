import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import {
  ProductResponse,
  ProductCreationRequest,
  ProductUpdateRequest,
} from '@core/models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${API_ENDPOINTS.PRODUCTS}`;

  constructor(private api: ApiService) {}

  getProducts(): Observable<ProductResponse[]> {
    return this.api.get<ProductResponse[]>(this.apiUrl);
  }

  getProductById(id: string): Observable<ProductResponse> {
    return this.api.get<ProductResponse>(`${this.apiUrl}/${id}`);
  }

  private buildProductFormData(
    data: ProductCreationRequest | ProductUpdateRequest,
    file?: File,
  ): FormData {
    const formData = new FormData();

    const productInfoBlob = new Blob([JSON.stringify(data)], {
      type: 'application/json',
    });
    formData.append('productInfo', productInfoBlob);

    if (file) {
      formData.append('inputFile', file);
    }

    return formData;
  }

  createProduct(data: ProductCreationRequest, file?: File): Observable<ProductResponse> {
    return this.api.post<ProductResponse, FormData>(
      this.apiUrl,
      this.buildProductFormData(data, file),
    );
  }

  updateProduct(id: string, data: ProductUpdateRequest, file?: File): Observable<ProductResponse> {
    return this.api.put<ProductResponse, FormData>(
      `${this.apiUrl}/${id}`,
      this.buildProductFormData(data, file),
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDeleteProducts(ids: string[]): Observable<void> {
    return this.api.post<void, { ids: string[] }>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  bulkUpdateProductStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }
}
