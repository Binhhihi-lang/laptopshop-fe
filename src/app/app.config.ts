import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { JwtInterceptor } from '@core/interceptors/jwt-interceptor';
import { GlobalErrorInterceptor } from '@core/interceptors/global-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes),
    // gắn header Authorization: Bearer vào mỗi request dùng interceptor gán JWT
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
    // Bắt lỗi HTTP (trừ 401 do JwtInterceptor lo) → hiện toast lỗi tập trung
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GlobalErrorInterceptor,
      multi: true,
    },
  ],
};
