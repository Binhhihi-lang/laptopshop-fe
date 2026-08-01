import { ProductResponse } from './product.model';

export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
}

export interface CategoryDetailResponse extends CategoryResponse {
  products: ProductResponse[];
}
