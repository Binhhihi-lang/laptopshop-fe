import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap, catchError, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: any = null;

  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
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
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.authService.getIsRefreshing()) {
      this.authService.setIsRefreshing(true);
      this.refreshTokenSubject = null;

      return this.authService.refreshToken().pipe(
        switchMap((token: any) => {
          this.refreshTokenSubject = token.token;
          this.authService.setIsRefreshing(false);
          return next.handle(this.addToken(request, token.token));
        }),
        catchError((error) => {
          this.authService.setIsRefreshing(false);
          return throwError(() => error);
        })
      );
    } else {
      return this.refreshTokenSubject
        ? this.refreshTokenSubject.pipe(
            filter((token: string) => token !== null),
            take(1),
            switchMap((token: string) => {
              return next.handle(this.addToken(request, token));
            })
          )
        : this.authService.refreshToken().pipe(
            filter(() => false),
            take(1),
            switchMap(() => {
              return next.handle(this.addToken(request, this.authService.getToken()!));
            })
          );
    }
  }
}
