import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { Page } from '@core/models/page.model';
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

  /**
   * Danh sách cho trang quản trị — phân trang + lọc ở server.
   * Trang sản phẩm trước đây tải toàn bộ (hàng chục nghìn dòng) rồi lọc ở
   * client nên rất chậm; nay mỗi lần đổi lọc chỉ lấy đúng 1 trang.
   */
  getProductsPage(params: {
    keyword?: string;
    categoryId?: string;
    active?: boolean;
    stockStatus?: 'out' | 'low' | 'in';
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<ProductResponse>> {
    return this.api.getPage<ProductResponse>(`${this.apiUrl}/page`, {
      keyword: params.keyword,
      categoryId: params.categoryId,
      active: params.active,
      stockStatus: params.stockStatus,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
    });
  }

  /** Danh sách hãng duy nhất — thay cho việc tải cả danh sách sản phẩm. */
  getBrands(): Observable<string[]> {
    return this.api.get<string[]>(`${this.apiUrl}/brands`);
  }

  /**
   * Tra nhiều sản phẩm theo id trong một request.
   * ids lặp nhiều lần trên query string (`?ids=a&ids=b`) nên tự ghép URL —
   * ApiService chỉ set một giá trị cho mỗi key.
   */
  getProductsByIds(ids: string[]): Observable<ProductResponse[]> {
    if (!ids.length) {
      return new Observable<ProductResponse[]>((subscriber) => {
        subscriber.next([]);
        subscriber.complete();
      });
    }
    const query = ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
    return this.api.get<ProductResponse[]>(`${this.apiUrl}/by-ids?${query}`);
  }

  getProductById(id: string): Observable<ProductResponse> {
    return this.api.get<ProductResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tìm sản phẩm cho picker ở trang quản trị (phạm vi khuyến mại, banner...).
   * Phân trang để không phải tải hết danh mục khi shop có hàng nghìn sản phẩm.
   * keyword rỗng = lấy trang đầu theo tên.
   */
  searchForPicker(keyword: string, page = 0, size = 20): Observable<Page<ProductResponse>> {
    return this.api.get<Page<ProductResponse>>(`${this.apiUrl}/search`, {
      keyword: keyword?.trim() || undefined,
      page,
      size,
    });
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
