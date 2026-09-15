import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClientAuthService } from '@core/services/client-auth.service';

/**
 * Storefront guards:
 *
 * - `clientAuthGuard`: yêu cầu đăng nhập storefront (checkout / orders /
 *   profile / change-password).
 *
 * - `clientGuestGuard`: chỉ cho phép KHÁCH CHƯA đăng nhập client vào login /
 *   register / forgot-password / reset-password. Đã login client thì về `/`.
 *
 * - `clientGuestBrowseGuard`: browse công khai (home / product-list /
 *   product-detail) — ai cũng vào được.
 *
 * LƯU Ý về phiên admin song song: guard ở đây CHỈ xét token storefront
 * (`ClientAuthService`, key `client_*`) — cố ý KHÔNG xét token admin
 * (`AuthService`, key `access_token`). Trước đây guard xét admin trước nên
 * admin đang đăng nhập ở tab khác làm khách bị đá sang /admin/dashboard ngay
 * khi vừa login client; và admin cũng không xem được storefront. Hai phiên
 * đã tách key hoàn toàn nên không còn chồng lấn — ai vào `/admin/**` thì
 * `adminGuard` lo, còn storefront chỉ quan tâm danh tính khách.
 */

const clientAuthGuard: CanActivateFn = (route, state) => {
  const clientAuth = inject(ClientAuthService);
  const router = inject(Router);

  if (clientAuth.isAuthenticated()) {
    return true;
  }

  // Chưa login → đẩy về login storefront (giữ lại URL để sau login quay lại).
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

const clientGuestGuard: CanActivateFn = (route, state) => {
  const clientAuth = inject(ClientAuthService);
  const router = inject(Router);

  if (clientAuth.isAuthenticated()) {
    // Đã login customer → về trang chủ client.
    router.navigate(['/']);
    return false;
  }

  return true;
};

const clientGuestBrowseGuard: CanActivateFn = () => true;

export { clientAuthGuard, clientGuestGuard, clientGuestBrowseGuard };
