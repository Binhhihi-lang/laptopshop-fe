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
 * Auth storefront — tách khỏi `AuthService` (admin): token/userInfo lưu key
 * riêng `client_*` nên admin và khách đăng nhập song song không ghi đè nhau.
 * Gọi `/api/v1/client/auth/**`, gắn token qua `clientJwtInterceptor`.
 */

const CLIENT_ACCESS_TOKEN_KEY = 'client_access_token';
const CLIENT_REFRESH_TOKEN_KEY = 'client_refresh_token';
const CLIENT_USER_INFO_KEY = 'client_user_info';

@Injectable({
  providedIn: 'root',
})
export class ClientAuthService {
  private readonly api = inject(ApiService);
  private readonly jwtHelper = inject(JwtHelper);

  // Observable để component (header) subscribe biết khi auth state đổi.
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(!!this.getToken());
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Observable để component (header) subscribe biết khi userInfo đổi
  // (vd: user vừa cập nhật fullName/avatar từ trang profile). Mỗi lần
  // setUserInfo() được gọi (kể cả qua login/register/refresh), subject sẽ
  // emit giá trị mới để layout sync signal và render lại avatar + tên.
  private readonly userInfoSubject = new BehaviorSubject<UserInfo | null>(
    (() => {
      const raw = localStorage.getItem(CLIENT_USER_INFO_KEY);
      return raw ? (JSON.parse(raw) as UserInfo) : null;
    })(),
  );
  readonly userInfo$ = this.userInfoSubject.asObservable();

  // ===== Token helpers =====
  private getToken(): string | null {
    return localStorage.getItem(CLIENT_ACCESS_TOKEN_KEY);
  }

  /** Public cho ClientJwtInterceptor gắn header Authorization. */
  getAccessToken(): string | null {
    return this.getToken();
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
    this.userInfoSubject.next(null);
  }

  // ===== User info helpers =====
  getUserInfo(): UserInfo | null {
    return this.userInfoSubject.value;
  }

  // Public: cho phép component (vd: profile) cập nhật userInfo sau khi đổi
  // fullName/avatar. Phát userInfoSubject để layout subscribe sync signal.
  setUserInfo(info: UserInfo): void {
    localStorage.setItem(CLIENT_USER_INFO_KEY, JSON.stringify(info));
    this.userInfoSubject.next(info);
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

  // Refresh token storefront. Dùng bởi ClientJwtInterceptor (single-flight
  // nằm ở interceptor, service chỉ refresh đơn lẻ).
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

  /**
   * Đăng xuất 1 thiết bị đã chọn khi login bị chặn vì vượt giới hạn.
   *
   * Xác thực bằng `revokeTicket` (BE cấp kèm lỗi 1013) chứ không phải mật khẩu —
   * vé dùng 1 lần. BE đá thiết bị được chọn rồi trả luôn cặp token cho thiết bị
   * đang xin đăng nhập, nên chỉ cần 1 round-trip.
   */
  revokeDeviceAndLogin(
    revokeTicket: string,
    targetDeviceId: string,
  ): Observable<ClientLoginResponse> {
    return this.api
      .post<ClientLoginResponse, { revokeTicket: string; targetDeviceId: string }>(
        '/client/auth/devices/revoke-and-login',
        { revokeTicket, targetDeviceId },
      )
      .pipe(tap((res) => this.handleLoginSuccess(res)));
  }

  /**
   * Logout — gọi BE để blacklist access token + thu hồi refresh token + GIẢI
   * PHÓNG SLOT THIẾT BỊ, rồi mới clear local.
   *
   * PHẢI gửi kèm `refreshToken`: BE chỉ chạy bước thu hồi khi nhận được nó
   * (`AuthenticationService.logout`). Thiếu nó thì refresh token nằm lại Redis
   * tới 10 ngày VÀ `UserDeviceSession` không bị xóa → slot không giải phóng,
   * user bị chặn oan khi đăng nhập ở máy khác.
   */
  logout(): Observable<void> {
    const token = this.getToken();
    // Đọc refresh token TRƯỚC khi gửi: clearTokens() ở tap/finalize sẽ xóa nó.
    const refreshToken = this.getRefreshToken();

    if (!token) {
      this.clearTokens();
      return new Observable((s) => {
        s.next();
        s.complete();
      });
    }
    return this.api
      .post<void, { token: string; refreshToken: string | null }>('/client/auth/logout', {
        token,
        refreshToken,
      })
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
