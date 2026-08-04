import { ProductResponse } from './product.model';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number | null;
  active: boolean;
  image: string;
}
export interface CategoryDetailResponse extends CategoryResponse {
  products: ProductResponse[];
}

export interface CategoryCreationRequest {
  name: string;
  description: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  slug?: string;
  displayOrder?: number | null;
  active?: boolean;
  image?: string;
}
