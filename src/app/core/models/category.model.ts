import { ProductResponse } from './product.model';

export interface CategoryResponse {
  id: string;
  name: string;
  description: string;
  displayOrder: number | null;
  active: boolean;
  image: string;
  productCount: number; // số lượng sản phẩm thuộc danh mục (backend trả về)
  createdAt: string;
  updatedAt: string;
}
export interface CategoryDetailResponse extends CategoryResponse {
  products: ProductResponse[];
}

export interface CategoryCreationRequest {
  name: string;
  description: string;
  inputFile?: File; // Ảnh danh mục, khớp backend @ModelAttribute + MultipartFile inputFile (giống User)
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  displayOrder?: number | null;
  active?: boolean;
  inputFile?: File; // Ảnh mới (nếu admin đổi ảnh)
  removeImage?: boolean; // true = xóa ảnh hiện tại nếu không gửi file mới
}
