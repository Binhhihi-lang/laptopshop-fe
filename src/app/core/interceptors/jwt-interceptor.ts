import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { switchMap, catchError, filter, take } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { DEVICE_ID_HEADER } from '@core/utils/constants';
import { getOrCreateDeviceId } from '@core/utils/device-id.util';
import { environment } from '@environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  // Sử dụng BehaviorSubject thay vì any = null để tránh lỗi runtime : lưu giá trị token mới nhất
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Request storefront do ClientJwtInterceptor lo trọn gói (token + refresh).
    // Phải bỏ qua ở đây vì interceptor chạy theo thứ tự đăng ký ở chiều request
    // nhưng NGƯỢC LẠI ở chiều lỗi: 401 của client sẽ lọt vào đây trước, gọi
    // refreshToken() của ADMIN → khách bị đá về /admin/login. Ngoài ra addToken()
    // bên dưới sẽ ghi đè header Authorization của khách bằng token admin.
    if (req.url.includes('/api/v1/client/')) {
      return next.handle(req);
    }

    // Request ra domain NGOÀI (vd API địa chỉ provinces.open-api.vn) phải đi
    // thẳng, KHÔNG gắn header nào: X-Device-Id là custom header nên trình duyệt
    // buộc phải gửi CORS preflight (OPTIONS) trước, mà server ngoài trả 405 cho
    // OPTIONS → request bị chặn với lỗi CORS. Ngoài ra cũng tránh rò rỉ
    // deviceId/token của mình ra bên thứ ba.
    if (!this.isBackendRequest(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    // Gắn deviceId cho MỌI request admin, kể cả khi chưa có token — endpoint
    // /auth/login cần header này để BE nhận diện thiết bị và áp giới hạn.
    req = req.clone({
      setHeaders: { [DEVICE_ID_HEADER]: getOrCreateDeviceId() },
    });
    if (token) {
      req = this.addToken(req, token);
    }

    return next.handle(req).pipe(
      catchError((error) => {
        if (
          error.status === 401 &&
          !req.url.includes('/auth/login') &&
          !req.url.includes('/auth/refresh')
        ) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Request tới backend của mình hay không. Backend được gọi qua
   * `environment.apiUrl` (URL tuyệt đối); URL bắt đầu bằng '/' là trường hợp
   * gọi qua proxy dev server — cũng là nội bộ.
   */
  private isBackendRequest(url: string): boolean {
    return url.startsWith(environment.apiUrl) || url.startsWith('/');
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    // đính kèm Token cho mỗi request (deviceId đã gắn ở intercept)
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Single-flight coordinator pattern:
   * - NOT refreshing (leader): thực hiện refresh, emit token mới qua subject
   * - IS refreshing (follower): subscribe chờ token mới từ authService.refreshToken$ , các request khác theo sau lấy token mới
   * - Refresh fail: AuthService đã logout, chỉ throw error
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // TH1: LEADER (Request đầu tiên bị 401)
    if (!this.authService.getIsRefreshing()) {
      this.authService.setIsRefreshing(true);
      this.refreshTokenSubject.next(null); // Reset tín hiệu hàng chờ

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          this.authService.setIsRefreshing(false);
          // Bắn token mới cho các FOLLOWER đang chờ
          this.refreshTokenSubject.next(response.token);

          // Thử lại request ban đầu của LEADER
          return next.handle(this.addToken(request, response.token));
        }),
        catchError((err) => {
          // AuthService ĐÃ logout ở bên trong rồi, Interceptor KHÔNG gọi logout nữa.
          // Chỉ cần trả cờ isRefreshing về false và đẩy lỗi tiếp.
          this.authService.setIsRefreshing(false);
          return throwError(() => err);
        }),
      );
    }

    // TH2: FOLLOWER (Các request đến sau, đứng vào hàng chờ)
    return this.refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        return next.handle(this.addToken(request, token!));
      }),
    );
  }
}
