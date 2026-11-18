import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { JwtInterceptor } from '@core/interceptors/jwt-interceptor';
import { ClientJwtInterceptor } from '@core/interceptors/client-jwt.interceptor';
import { GlobalErrorInterceptor } from '@core/interceptors/global-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    // Thiếu 2 tuỳ chọn này thì Angular GIỮ NGUYÊN vị trí cuộn của trang trước:
    // bấm card sản phẩm ở cuối trang chủ sẽ mở trang chi tiết ngay giữa nội dung.
    // - scrollPositionRestoration 'top': mở trang mới luôn từ đầu.
    // - anchorScrolling: cho phép nhảy tới #id khi URL có fragment.
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    // gắn header Authorization: Bearer vào mỗi request dùng interceptor gán JWT
    provideHttpClient(withInterceptorsFromDi()),
    // Client đứng TRƯỚC JwtInterceptor để gắn token storefront và tự refresh khi 401.
    // Lưu ý: thứ tự này chỉ đảm bảo ở chiều request — chiều lỗi chạy ngược lại, nên
    // JwtInterceptor phải tự bỏ qua URL /api/v1/client/** (xem jwt-interceptor.ts).
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ClientJwtInterceptor,
      multi: true,
    },
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
