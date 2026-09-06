import { Injectable, inject } from '@angular/core';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { JwtHelper } from '@core/utils/jwt.helper';
import {
  ClientChangePasswordRequest,
  ClientForgotPasswordRequest,
  ClientIntrospectResponse,
  ClientLoginRequest,
  ClientLoginResponse,
  ClientRegisterRequest,
  ClientResetPasswordRequest,
} from '@core/models/client-auth.model';
import { UserInfo } from '@core/models/user.model';

/**
 * Storefront auth — tách hoàn toàn khỏi `AuthService` (admin):
 * - Token + refresh + userInfo lưu key riêng (`client_*`) trong localStorage.
 * - Không gọi /admin/auth/** mà dùng /api/v1/client/auth/** (BE permitAll).
 * - Guard route storefront bằng `clientGuard`; nếu admin lỡ truy cập /client/**
 *   thì check role != ADMIN/STAFF để đẩy về /admin/dashboard.
 *
 * Tránh circular dependency với interceptor (FE chưa có interceptor riêng
 * cho client) — chỉ cần đảm bảo khi vào ClientLayout, JwtInterceptor vẫn
 * gắn header Authorization từ access_token (cùng key với admin).
 *
 * → Giải pháp: TÁI SỬ DỤNG key access_token/refresh_token/user_info của admin.
 *   Hai service chỉ khác nhau ở URL gọi; cùng đọc cùng localStorage → JWT
 *   interceptor vẫn gắn header bình thường, nhưng nếu user đã login admin
 *   rồi mà vào /client/** thì bị ClientGuard chặn (check role != ADMIN/STAFF
 *   qua `authService.hasRole`).
 *
 * Đây là thiết kế đơn giản nhất cho FE monorepo dùng chung JwtInterceptor,
 * tránh phải viết thêm 1 interceptor nữa chỉ để đổi key.
 */

const CLIENT_ACCESS_TOKEN_KEY = 'access_token';
const CLIENT_REFRESH_TOKEN_KEY = 'refresh_token';
const CLIENT_USER_INFO_KEY = 'user_info';

@Injectable({
  providedIn: 'root',
})
export class ClientAuthService {
  private readonly api = inject(ApiService);
  private readonly jwtHelper = inject(JwtHelper);

  // Observable để component (header) subscribe biết khi auth state đổi.
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(!!this.getToken());
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // ===== Token helpers =====
  private getToken(): string | null {
    return localStorage.getItem(CLIENT_ACCESS_TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(CLIENT_REFRESH_TOKEN_KEY);
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(CLIENT_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(CLIENT_REFRESH_TOKEN_KEY, refreshToken);
    this.isAuthenticatedSubject.next(true);
  }

  private clearTokens(): void {
    localStorage.removeItem(CLIENT_ACCESS_TOKEN_KEY);
    localStorage.removeItem(CLIENT_REFRESH_TOKEN_KEY);
    localStorage.removeItem(CLIENT_USER_INFO_KEY);
    this.isAuthenticatedSubject.next(false);
  }

  // ===== User info helpers =====
  getUserInfo(): UserInfo | null {
    const raw = localStorage.getItem(CLIENT_USER_INFO_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  }

  private setUserInfo(info: UserInfo): void {
    localStorage.setItem(CLIENT_USER_INFO_KEY, JSON.stringify(info));
  }

  // ===== Public API =====
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const roles = decoded?.scope ?? '';
      return roles.split(' ').includes(`ROLE_${role}`);
    } catch {
      return false;
    }
  }

  // Đăng ký tài khoản customer mới. Tự động login luôn nếu BE trả token.
  register(req: ClientRegisterRequest): Observable<ClientLoginResponse> {
    return this.api
      .post<ClientLoginResponse, ClientRegisterRequest>('/client/auth/register', req)
      .pipe(tap((res) => this.handleLoginSuccess(res)));
  }

  login(req: ClientLoginRequest): Observable<ClientLoginResponse> {
    return this.api
      .post<ClientLoginResponse, ClientLoginRequest>('/client/auth/login', req)
      .pipe(tap((res) => this.handleLoginSuccess(res)));
  }

  // Quên mật khẩu — BE luôn trả 200 (kể cả email không tồn tại) để tránh dò email.
  forgotPassword(req: ClientForgotPasswordRequest): Observable<void> {
    return this.api.post<void, ClientForgotPasswordRequest>('/client/auth/forgot-password', req);
  }

  // Đặt lại mật khẩu bằng token nhận từ email.
  resetPassword(req: ClientResetPasswordRequest): Observable<void> {
    return this.api.post<void, ClientResetPasswordRequest>('/client/auth/reset-password', req);
  }

  // Đổi mật khẩu khi đã đăng nhập. Yêu cầu @PreAuthorize phía BE.
  changePassword(req: ClientChangePasswordRequest): Observable<void> {
    return this.api.post<void, ClientChangePasswordRequest>('/client/auth/change-password', req);
  }

  introspect(token: string): Observable<ClientIntrospectResponse> {
    return this.api.post<ClientIntrospectResponse, { token: string }>('/client/auth/introspect', {
      token,
    });
  }

  // Refresh — chưa wire single-flight như AuthService vì store chưa có cart
  // hoặc dữ liệu nhạy cảm. Nếu sau này cần, copy pattern single-flight từ
  // AuthService.refreshToken().
  refresh(): Observable<ClientLoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return throwError(() => new Error('No refresh token available'));
    }
    return this.api
      .post<ClientLoginResponse, { refreshToken: string }>('/client/auth/refresh', {
        refreshToken,
      })
      .pipe(
        tap((res) => this.handleLoginSuccess(res)),
        catchError((err) => {
          this.clearTokens();
          return throwError(() => err);
        }),
      );
  }

  // Logout — gọi BE để blacklist access token + xóa refresh token, rồi clear local.
  logout(): Observable<void> {
    const token = this.getToken();
    if (!token) {
      this.clearTokens();
      return new Observable((s) => {
        s.next();
        s.complete();
      });
    }
    return this.api
      .post<void, { token: string }>('/client/auth/logout', { token })
      .pipe(tap({ next: () => this.clearTokens(), finalize: () => this.clearTokens() }));
  }

  // ===== Internal =====
  private handleLoginSuccess(res: ClientLoginResponse): void {
    if (res.authenticated && res.token && res.refreshToken) {
      this.setTokens(res.token, res.refreshToken);
      const userInfo: UserInfo = {
        userId: this.jwtHelper.getUserIdFromToken(res.token) ?? undefined,
        fullName: this.jwtHelper.getFullNameFromToken(res.token) ?? undefined,
        roleNames: this.jwtHelper.getRoleNamesFromToken(res.token) ?? undefined,
        permissions: this.jwtHelper.getPermissionsFromToken(res.token) ?? undefined,
      };
      this.setUserInfo(userInfo);
    }
  }
}
