import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../utils/constants';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description: string;
  image: string;        // Cloudinary URL string
  sold: number;
  categoryId: number;
  categoryName: string;
}

export interface ProductCreationRequest {
  name: string;
  price: number;
  quantity: number;
  description: string;
  image?: File | null;
  categoryId: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${API_ENDPOINTS.PRODUCTS}`;

  constructor(private api: ApiService) {}

  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>(this.apiUrl);
  }

  getProductById(id: number): Observable<Product> {
    return this.api.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: ProductCreationRequest): Observable<Product> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', data.price.toString());
    formData.append('quantity', data.quantity.toString());
    formData.append('description', data.description);
    if (data.image) {
      formData.append('image', data.image);
    }
    formData.append('categoryId', data.categoryId.toString());
    return this.api.post<Product, FormData>(this.apiUrl, formData);
  }

  updateProduct(id: number, data: ProductCreationRequest): Observable<Product> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', data.price.toString());
    formData.append('quantity', data.quantity.toString());
    formData.append('description', data.description);
    if (data.image) {
      formData.append('image', data.image);
    }
    formData.append('categoryId', data.categoryId.toString());
    return this.api.put<Product, FormData>(`${this.apiUrl}/${id}`, formData);
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}