import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { JwtHelper } from '../utils/jwt.helper';
import { STORAGE_KEYS, API_ENDPOINTS } from '../utils/constants';

interface AuthResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

interface IntrospectResponse {
  authenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private isRefreshingSubject = new BehaviorSubject<boolean>(false);
  token$: Observable<string | null> = this.tokenSubject.asObservable();
  isRefreshing$ = this.isRefreshingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private jwtHelper: JwtHelper
  ) {
    // Load token from localStorage on init
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (token) {
      this.tokenSubject.next(token);
    }
    if (refreshToken) {
      this.refreshTokenSubject.next(refreshToken);
    }
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}${API_ENDPOINTS.AUTH.LOGIN}`, { email, password }).pipe(
      map((response: any) => {
        if (response.authenticated) {
          this.setToken(response.token, response.refreshToken);
          return response;
        }
        return response;
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  setToken(token: string, refreshToken: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    this.tokenSubject.next(token);
    this.refreshTokenSubject.next(refreshToken);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    this.tokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    this.isRefreshingSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSubject.value;
  }

  getUserInfo(): any {
    const token = this.getToken();
    if (token) {
      return this.jwtHelper.decodeToken(token);
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.jwtHelper.isTokenExpired(token);
  }

  hasRole(role: string): boolean {
    const token = this.getToken();
    if (!token) return false;
    const decoded = this.jwtHelper.decodeToken(token);
    const roles = decoded?.scope ?? '';
    return roles.split(' ').includes(`ROLE_${role}`);
  }

  hasPermission(permission: string): boolean {
    const token = this.getToken();
    if (!token) return false;
    const decoded = this.jwtHelper.decodeToken(token);
    const permissions = decoded?.permissions ?? '';
    return permissions.split(' ').includes(permission);
  }

  refreshToken(): Observable<any> {
    this.isRefreshingSubject.next(true);
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.isRefreshingSubject.next(false);
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post(`${environment.apiUrl}${API_ENDPOINTS.AUTH.REFRESH}`, { token: refreshToken }).pipe(
      map((response: any) => {
        if (response.authenticated) {
          this.setToken(response.token, response.refreshToken);
          this.isRefreshingSubject.next(false);
          return response;
        } else {
          this.isRefreshingSubject.next(false);
          this.logout();
          return throwError(() => new Error('Refresh token invalid'));
        }
      }),
      catchError(error => {
        this.isRefreshingSubject.next(false);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // Method to check if currently refreshing (used in interceptor)
  isRefreshing(): boolean {
    return this.isRefreshingSubject.value;
  }
}