import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  throwError,
  catchError,
  tap,
} from 'rxjs';
import { JwtHelper } from '@core/utils/jwt.helper';
import { API_ENDPOINTS, STORAGE_KEYS } from '@core/utils/constants';
import { IntrospectResponse, LoginResponse } from '@core/models/auth.model';
import { UserInfo, UserResponse } from '@core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  private refreshTokenSubject = new BehaviorSubject<string | null>(this.getRefreshToken());
  private isRefreshingSubject = new BehaviorSubject<boolean>(false); // đang refresh hay không
  // Subject để emit token mới cho các request đang chờ (single-flight pattern)
  private refreshResultSubject = new BehaviorSubject<string | null>(null);

  // Subject để emit khi userInfo đổi (vd: profile update ở admin).
  // Layout admin (AdminLayoutComponent) subscribe userInfo$ để sync signal.
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(
    (() => {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_INFO);
      return raw ? (JSON.parse(raw) as UserInfo) : null;
    })(),
  );
  readonly userInfo$ = this.userInfoSubject.asObservable();

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

  private buildUserInfo(token: string): UserInfo {
    return {
      // JwtHelper trả string | null -> chuẩn hóa về undefined để khớp UserInfo
      userId: this.jwtHelper.getUserIdFromToken(token) ?? undefined,
      fullName: this.jwtHelper.getFullNameFromToken(token) ?? undefined,
      roleNames: this.jwtHelper.getRoleNamesFromToken(token) ?? undefined,
      permissions: this.jwtHelper.getPermissionsFromToken(token) ?? undefined,
    };
  }

  introspect(token: string): Observable<IntrospectResponse> {
    return this.api.post<IntrospectResponse, { token: string }>(API_ENDPOINTS.AUTH.INTROSPECT, {
      token,
    });
  }

  /**
   * Đăng xuất các thiết bị đã chọn khi login bị chặn vì vượt giới hạn. Xác thực
   * bằng `revokeTicket` (BE cấp kèm lỗi 1013). Dự phòng cho admin — hiện admin
   * được miễn giới hạn nên ít dùng, nhưng giữ cho nhất quán với client.
   */
  revokeDeviceAndLogin(revokeTicket: string, targetDeviceIds: string[]): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse, { revokeTicket: string; targetDeviceIds: string[] }>(
        API_ENDPOINTS.AUTH.DEVICES_REVOKE_AND_LOGIN,
        { revokeTicket, targetDeviceIds },
      )
      .pipe(
        tap((response) => {
          if (response.authenticated && response.token && response.refreshToken) {
            this.setToken(response.token);
            this.setRefreshToken(response.refreshToken);
            this.setUserInfo(this.buildUserInfo(response.token));
          }
        }),
      );
  }

  /**
   * Đăng xuất: gọi BE để blacklist access token + thu hồi refresh token + GIẢI
   * PHÓNG SLOT THIẾT BỊ, rồi mới xóa local.
   *
   * Trước đây hàm này chỉ xóa localStorage, khiến refresh token nằm lại Redis và
   * phiên thiết bị không bao giờ được giải phóng -> user bị chặn khi đăng nhập ở
   * máy khác. Giữ signature `void` để không phá các call site hiện có
   * (refreshToken(), global-error.interceptor).
   */
  logout(): void {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (token) {
      // subscribe() kích hoạt interceptor ĐỒNG BỘ nên header Authorization vẫn
      // được gắn bằng token hiện tại; clearTokens() bên dưới chạy sau khi request
      // đã được dựng. Không cần chờ response — logout phía FE phải luôn thành công.
      this.api
        .post<void, { token: string; refreshToken: string | null }>(API_ENDPOINTS.AUTH.LOGOUT, {
          token,
          refreshToken,
        })
        .subscribe({ error: () => {} });
    }

    this.clearTokens();
    this.clearUserInfo();
    this.router.navigate(['/admin/login']);
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

  getUserInfo(): UserInfo | null {
    return this.userInfoSubject.value;
  }

  setUserInfo(user: UserInfo): void {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
    this.userInfoSubject.next(user);
  }

  /**
   * Lấy avatar (URL Cloudinary đầy đủ) của user đang đăng nhập từ API
   * `/admin/users/me` và gộp vào `userInfo` lưu ở localStorage, để sidebar/
   * header có thể hiển thị ảnh đại diện (fallback về chữ cái nếu rỗng).
   * Dùng trực tiếp `this.api` để tránh circular DI với UserService.
   */
  refreshAvatar(): Observable<UserResponse | null> {
    const current = this.getUserInfo();
    if (!current) return of(null);
    return this.api.get<UserResponse>(`${API_ENDPOINTS.USERS}/me`).pipe(
      tap((u) => {
        if (u?.avatar) {
          const updated = { ...current, avatar: u.avatar };
          this.setUserInfo(updated);
        }
      }),
      catchError(() => of(null)),
    );
  }

  clearUserInfo(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    this.userInfoSubject.next(null);
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
