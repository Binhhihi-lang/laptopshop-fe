import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AddToCartRequest,
  Cart,
  MergeCartRequest,
  UpdateCartItemRequest,
} from '@core/models/cart.model';

const GUEST_CART_KEY = 'client_guest_cart';

/**
 * Giỏ hàng storefront. Khách chưa login: giữ ở localStorage; đã login: giữ
 * trên server. `cartCount$` để header hiển thị badge realtime.
 */
@Injectable({ providedIn: 'root' })
export class ClientCartService {
  private readonly api = inject(ApiService);

  private readonly cartCountSubject = new BehaviorSubject<number>(this.countGuestItems());
  readonly cartCount$ = this.cartCountSubject.asObservable();

  getCart(): Observable<Cart> {
    return this.api
      .get<Cart>('/client/cart')
      .pipe(tap((cart) => this.cartCountSubject.next(cart.totalItems)));
  }

  addItem(req: AddToCartRequest): Observable<Cart> {
    return this.api
      .post<Cart, AddToCartRequest>('/client/cart/items', req)
      .pipe(tap((c) => this.setCount(c.totalItems)));
  }

  updateQty(productId: string, req: UpdateCartItemRequest): Observable<Cart> {
    return this.api
      .put<Cart, UpdateCartItemRequest>(`/client/cart/items/${productId}`, req)
      .pipe(tap((c) => this.setCount(c.totalItems)));
  }

  removeItem(productId: string): Observable<Cart> {
    return this.api
      .delete<Cart>(`/client/cart/items/${productId}`)
      .pipe(tap((c) => this.setCount(c.totalItems)));
  }

  clear(): Observable<Cart> {
    return this.api.delete<Cart>('/client/cart').pipe(tap((c) => this.setCount(c.totalItems)));
  }

  mergeGuestCart(req: MergeCartRequest): Observable<Cart> {
    return this.api.post<Cart, MergeCartRequest>('/client/cart/merge', req).pipe(
      tap((c) => {
        this.clearGuestCart();
        this.setCount(c.totalItems);
      }),
    );
  }

  // ===== Giỏ guest (localStorage) =====
  getGuestCart(): { productId: string; quantity: number }[] {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      const items = raw ? (JSON.parse(raw) as { productId: string; quantity: number }[]) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  setGuestCart(items: { productId: string; quantity: number }[]): void {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    this.cartCountSubject.next(items.reduce((sum, i) => sum + i.quantity, 0));
  }

  clearGuestCart(): void {
    localStorage.removeItem(GUEST_CART_KEY);
  }

  countGuestItems(): number {
    return this.getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
  }

  /** Sync badge ngay (dùng sau login/logout khi chưa gọi API). */
  setCount(count: number): void {
    this.cartCountSubject.next(count);
  }
}
