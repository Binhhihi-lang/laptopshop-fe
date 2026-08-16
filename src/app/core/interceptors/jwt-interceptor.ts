import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { switchMap, catchError, filter, take } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  // Sử dụng BehaviorSubject thay vì any = null để tránh lỗi runtime : lưu giá trị token mới nhất
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
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

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    // đính kèm Token cho mỗi request
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
