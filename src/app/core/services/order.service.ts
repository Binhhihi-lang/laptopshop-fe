import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';

export interface OrderResponse {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatar?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${API_ENDPOINTS.ORDERS}`;

  constructor(private api: ApiService) {}

  getOrders(): Observable<OrderResponse[]> {
    return this.api.get<OrderResponse[]>(this.apiUrl);
  }

  getOrderById(id: string): Observable<OrderResponse> {
    return this.api.get<OrderResponse>(`${this.apiUrl}/${id}`);
  }
}