import { ProductResponse } from './product.model';

export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
}

export interface CategoryDetailResponse extends CategoryResponse {
  products: ProductResponse[];
}
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
