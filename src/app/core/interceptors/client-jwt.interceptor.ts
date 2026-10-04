import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ClientAuthService } from '@core/services/client-auth.service';
import { DEVICE_ID_HEADER } from '@core/utils/constants';
import { getOrCreateDeviceId } from '@core/utils/device-id.util';

/** Kết quả một lần refresh dùng chung cho leader + follower. */
type RefreshResult =
  | { status: 'pending' }
  | { status: 'success'; token: string }
  | { status: 'error'; error: unknown };

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

  // Kết quả refresh; follower chờ ở đây (single-flight). Dùng object có trạng
  // thái thay vì chỉ token: khi refresh THẤT BẠI, follower phải nhận LỖI để
  // kết thúc request — nếu chỉ phát null rồi lọc bỏ, follower treo vĩnh viễn
  // (spinner quay mãi) vì không bao giờ có next/error.
  private readonly refreshResult = new BehaviorSubject<RefreshResult>({ status: 'pending' });
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
    // Đang refresh: xếp hàng chờ kết quả rồi gửi lại (hoặc lỗi) request này.
    if (this.isRefreshing) {
      return this.refreshResult.pipe(
        filter((r) => r.status !== 'pending'),
        take(1),
        switchMap((r) =>
          r.status === 'success'
            ? next.handle(this.addToken(request, r.token))
            : throwError(() => r.error),
        ),
      );
    }

    this.isRefreshing = true;
    this.refreshResult.next({ status: 'pending' });

    return this.clientAuth.refresh().pipe(
      switchMap((res) => {
        this.isRefreshing = false;
        this.refreshResult.next({ status: 'success', token: res.token });
        return next.handle(this.addToken(request, res.token));
      }),
      catchError((err) => {
        // refresh() đã tự clear token khi thất bại.
        this.isRefreshing = false;
        this.refreshResult.next({ status: 'error', error: err });
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
