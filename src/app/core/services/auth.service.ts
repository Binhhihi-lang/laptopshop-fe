import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  throwError,
  filter,
  take,
  switchMap,
  catchError,
  tap,
} from 'rxjs';
import { JwtHelper } from '@core/utils/jwt.helper';
import { API_ENDPOINTS, STORAGE_KEYS } from '@core/utils/constants';
import { IntrospectResponse, LoginResponse } from '@core/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  private refreshTokenSubject = new BehaviorSubject<string | null>(this.getRefreshToken());
  private isRefreshingSubject = new BehaviorSubject<boolean>(false); // đang refresh hay không
  // Subject để emit token mới cho các request đang chờ (single-flight pattern)
  private refreshResultSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private api: ApiService,
    private router: Router,
    private jwtHelper: JwtHelper,
  ) {}

  // Expose observable cho interceptor subscribe khi đang chờ refresh
  get refreshToken$(): Observable<string | null> {
    return this.refreshResultSubject.asObservable();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse, { email: string; password: string }>(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          if (response.authenticated && response.token && response.refreshToken) {
            this.setToken(response.token);
            this.setRefreshToken(response.refreshToken);
            // Decode token and store user info
            const userInfo = this.buildUserInfo(response.token);
            this.setUserInfo(userInfo);
          }
        }),
      );
  }

  private buildUserInfo(token: string): any {
    return {
      userId: this.jwtHelper.getUserIdFromToken(token),
      fullName: this.jwtHelper.getFullNameFromToken(token),
      roleNames: this.jwtHelper.getRoleNamesFromToken(token),
      permissions: this.jwtHelper.getPermissionsFromToken(token),
    };
  }

  introspect(token: string): Observable<IntrospectResponse> {
    return this.api.post<IntrospectResponse, { token: string }>(API_ENDPOINTS.AUTH.INTROSPECT, {
      token,
    });
  }

  logout(): void {
    this.clearTokens();
    this.clearUserInfo();
    this.router.navigate(['/login']);
  }

  /**
   * Single-flight token refresh pattern:
   * - Nếu đang refresh: return observable chờ kết quả từ refreshResultSubject
   * - Nếu chưa refresh: gọi API refresh, emit token mới cho TẤT CẢ waiter
   * - Thất bại: error cho TẤT CẢ waiter + logout tự động
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();

    // Không có token -> Logout luôn tại đây
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.api
      .post<LoginResponse, { refreshToken: string }>(API_ENDPOINTS.AUTH.REFRESH, { refreshToken })
      .pipe(
        tap((response) => {
          if (response.authenticated && response.token && response.refreshToken) {
            this.setToken(response.token);
            this.setRefreshToken(response.refreshToken);
            this.setUserInfo(this.buildUserInfo(response.token));
          }
        }),
        catchError((err) => {
          // NƠI DUY NHẤT XỬ LÝ LOGOUT KHI REFRESH THẤT BẠI
          this.logout();
          return throwError(() => err);
        }),
      );
  }

  private setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    this.tokenSubject.next(token);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    this.refreshTokenSubject.next(token);
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    this.tokenSubject.next(null);
    this.refreshTokenSubject.next(null);
  }

  getUserInfo(): any {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  setUserInfo(user: any): void {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  }

  clearUserInfo(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Method to be used in interceptor for token refresh
  get token$(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  getIsRefreshing(): boolean {
    return this.isRefreshingSubject.value;
  }

  setIsRefreshing(isRefreshing: boolean): void {
    this.isRefreshingSubject.next(isRefreshing);
  }

  hasRole(role: string): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const roles = decoded.scope || '';
      return roles.split(' ').includes(`ROLE_${role}`);
    } catch (e) {
      // If token is invalid, treat as not having the role
      return false;
    }
  }

  hasPermission(permission: string): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const scope = decoded?.scope ?? '';
      const permissions = scope.split(' ').filter((s: string) => s && !s.startsWith('ROLE_'));
      return permissions.includes(permission);
    } catch (e) {
      // If token is invalid, treat as not having the permission
      return false;
    }
  }
}
