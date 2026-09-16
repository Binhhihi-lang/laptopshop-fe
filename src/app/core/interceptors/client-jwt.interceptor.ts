import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ClientAuthService } from '@core/services/client-auth.service';
import { DEVICE_ID_HEADER } from '@core/utils/constants';
import { getOrCreateDeviceId } from '@core/utils/device-id.util';

/**
 * Gắn token storefront cho request `/api/v1/client/**` và tự refresh khi 401.
 *
 * Tách khỏi `JwtInterceptor` (admin) vì 2 luồng dùng token/endpoint refresh
 * khác nhau — nếu dùng chung, request của khách sẽ bị gắn token admin và
 * refresh qua endpoint admin (CUSTOMER không có quyền → 403).
 *
 * PHẢI đăng ký TRƯỚC `JwtInterceptor` trong app.config.ts để chạy trước.
 */
@Injectable()
export class ClientJwtInterceptor implements HttpInterceptor {
  private readonly clientAuth = inject(ClientAuthService);

  // Token mới sau khi refresh; follower chờ ở đây (single-flight).
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private isRefreshing = false;

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Chỉ can thiệp request storefront; request admin để JwtInterceptor lo.
    if (!req.url.includes('/api/v1/client/')) {
      return next.handle(req);
    }

    // Gắn deviceId cho MỌI request storefront, kể cả khi chưa có token —
    // endpoint /client/auth/login cần header này để BE áp giới hạn thiết bị.
    const token = this.clientAuth.getAccessToken();
    const withDevice = this.addDeviceId(req);
    const authReq = token ? this.addToken(withDevice, token) : withDevice;

    return next.handle(authReq).pipe(
      catchError((error) => {
        // Không refresh cho chính 2 endpoint auth (login sai / refresh hỏng).
        const isAuthEndpoint =
          req.url.includes('/client/auth/login') || req.url.includes('/client/auth/refresh');
        if (error.status === 401 && !isAuthEndpoint && this.clientAuth.isAuthenticated()) {
          return this.handle401(authReq, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private handle401(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    // Đang refresh: xếp hàng chờ token mới rồi gửi lại request này.
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token) => next.handle(this.addToken(request, token))),
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.clientAuth.refresh().pipe(
      switchMap((res) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(res.token);
        return next.handle(this.addToken(request, res.token));
      }),
      catchError((err) => {
        // refresh() đã tự clear token khi thất bại.
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        return throwError(() => err);
      }),
    );
  }

  private addDeviceId(request: HttpRequest<unknown>): HttpRequest<unknown> {
    return request.clone({
      setHeaders: { [DEVICE_ID_HEADER]: getOrCreateDeviceId() },
    });
  }

  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
}
