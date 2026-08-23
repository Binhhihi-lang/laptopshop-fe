import { Injectable, inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '@core/services/notification.service';

@Injectable()
export class GlobalErrorInterceptor implements HttpInterceptor {
  private readonly notification = inject(NotificationService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // 401 do JwtInterceptor xử lý (refresh / logout) → không hiện toast ở đây
        if (error.status === 401) {
          return throwError(() => error);
        }
        this.notification.error(this.notification.extractError(error));
        return throwError(() => error);
      }),
    );
  }
}
