export interface ProductResponse {
  id: string;
  code: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  image: string;
  sold: number;
  categoryId: string;
  categoryName: string;
  detailDesc: string;
  shortDesc: string;
  factory: string;
  target: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screen: string;
  os: string;
  weight: number;
  warrantyMonths: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreationRequest {
  code?: string;
  name?: string;
  price?: number;
  quantity?: number;
  description?: string;
  categoryId?: string;
  detailDesc?: string;
  shortDesc?: string;
  factory?: string;
  target?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  screen?: string;
  os?: string;
  weight?: number;
  warrantyMonths?: number;
  active?: boolean;
  // inputFile?: string | File;
}

export interface ProductUpdateRequest extends ProductCreationRequest {
  sold?: number;
}
