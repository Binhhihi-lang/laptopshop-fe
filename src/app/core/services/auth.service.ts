import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, throwError } from 'rxjs';
import { ApiResponse } from './api.service';
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';
import { JwtHelper } from '../utils/jwt.helper';

export interface LoginResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

export interface IntrospectResponse {
  authenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  private refreshTokenSubject = new BehaviorSubject<string | null>(this.getRefreshToken());
  private isRefreshingSubject = new BehaviorSubject<boolean>(false);

  constructor(private api: ApiService, private router: Router, private jwtHelper: JwtHelper) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse, { email: string; password: string }>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password }
    ).pipe(
      tap(response => {
        if (response.authenticated && response.token && response.refreshToken) {
          this.setToken(response.token);
          this.setRefreshToken(response.refreshToken);
          // Decode token and store user info
          const userInfo = this.buildUserInfo(response.token);
          this.setUserInfo(userInfo);
        }
      })
    );
  }

  private buildUserInfo(token: string): any {
    return {
      userId: this.jwtHelper.getUserIdFromToken(token),
      fullName: this.jwtHelper.getFullNameFromToken(token),
      roleNames: this.jwtHelper.getRoleNamesFromToken(token),
      permissions: this.jwtHelper.getPermissionsFromToken(token)
    };
  }

  introspect(token: string): Observable<IntrospectResponse> {
    return this.api.post<IntrospectResponse, { token: string }>(
      API_ENDPOINTS.AUTH.INTROSPECT,
      { token }
    );
  }

  logout(): void {
    this.clearTokens();
    this.clearUserInfo();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<LoginResponse> {
    if (this.getIsRefreshing()) {
      return new Observable<LoginResponse>();
    }
    this.setIsRefreshing(true);
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.setIsRefreshing(false);
      return throwError(() => new Error('No refresh token available'));
    }
    return this.api.post<LoginResponse, { token: string }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { token: refreshToken }
    ).pipe(
      tap(response => {
        if (response.authenticated && response.token && response.refreshToken) {
          this.setToken(response.token);
          this.setRefreshToken(response.refreshToken);
          // Update user info with new token
          const userInfo = this.buildUserInfo(response.token);
          this.setUserInfo(userInfo);
        }
        this.setIsRefreshing(false);
      })
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
      const permissions = decoded.permissions || '';
      return permissions.split(' ').includes(permission);
    } catch (e) {
      // If token is invalid, treat as not having the permission
      return false;
    }
  }
}