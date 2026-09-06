import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Page } from '@core/models/page.model';
import { ProductResponse } from '@core/models/product.model';

/**
 * Param filter cho trang product-list. Tất cả optional. sort FE truyền qua
 * dạng `field,direction` (vd `price,asc` hoặc `sold,desc`); mặc định để
 * trống để BE dùng Pageable mặc định (`createdAt`).
 */
export interface ProductListParams {
  page?: number;
  size?: number;
  sort?: string;
  categoryId?: string;
  factory?: string;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
}

export interface ProductDetailResponse {
  product: ProductResponse;
  related: ProductResponse[];
}

/**
 * Storefront: duyệt sản phẩm công khai. Endpoint public, không cần token.
 * Khớp BE ClientProductController:
 *  - GET /api/v1/client/products           → Page<ProductResponse>
 *  - GET /api/v1/client/products/{code}    → { product, related }
 *  - GET /api/v1/client/products/brands    → List<String>
 */
@Injectable({ providedIn: 'root' })
export class ClientProductService {
  private readonly api = inject(ApiService);

  list(params: ProductListParams = {}): Observable<Page<ProductResponse>> {
    return this.api.getPage<ProductResponse>('/client/products', {
      page: params.page,
      size: params.size,
      sort: params.sort,
      categoryId: params.categoryId,
      factory: params.factory,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      keyword: params.keyword,
    });
  }

  getByCode(code: string): Observable<ProductDetailResponse> {
    return this.api.get<ProductDetailResponse>(`/client/products/${code}`);
  }

  getBrands(): Observable<string[]> {
    return this.api.get<string[]>('/client/products/brands');
  }
}
