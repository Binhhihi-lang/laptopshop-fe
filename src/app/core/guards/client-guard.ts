import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClientAuthService } from '@core/services/client-auth.service';
import { AuthService } from '@core/services/auth.service';

/**
 * Storefront guards (Sprint 1):
 *
 * - `clientAuthGuard`: yêu cầu đăng nhập (cart / checkout / orders / profile /
 *   change-password). Đồng thời chặn ADMIN/STAFF khỏi storefront — nếu lỡ
 *   vào /client/** thì đẩy về /admin/dashboard. Đây là sự khác biệt cốt lõi
 *   so với adminGuard: phía storefront chỉ dành cho CUSTOMER (hoặc guest
 *   browse, xem clientGuestGuard ở dưới).
 *
 * - `clientGuestGuard`: chỉ cho phép KHÁCH (chưa login) vào login / register /
 *   forgot-password / reset-password. Nếu đã login thì đẩy về /.
 *
 * - `clientGuestBrowseGuard`: mặc định browse công khai (home / product-list /
 *   product-detail) — ai cũng vào được. Hiện tại trả true luôn; function này
 *   chỉ là placeholder để nhất quán cách gọi, dễ thay đổi sau này nếu
 *   muốn chặn geo hoặc rate-limit.
 */

const clientAuthGuard: CanActivateFn = (route, state) => {
  const clientAuth = inject(ClientAuthService);
  const adminAuth = inject(AuthService);
  const router = inject(Router);

  // Nếu user đang giữ token admin → đẩy về dashboard.
  if (adminAuth.isAuthenticated() && (adminAuth.hasRole('ADMIN') || adminAuth.hasRole('STAFF'))) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  if (clientAuth.isAuthenticated()) {
    return true;
  }

  // Chưa login → đẩy về login storefront (giữ lại URL để sau login quay lại).
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

const clientGuestGuard: CanActivateFn = (route, state) => {
  const clientAuth = inject(ClientAuthService);
  const adminAuth = inject(AuthService);
  const router = inject(Router);

  // Nếu đang là admin → không cho vào login/register/forgot/reset client.
  if (adminAuth.isAuthenticated() && (adminAuth.hasRole('ADMIN') || adminAuth.hasRole('STAFF'))) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  if (clientAuth.isAuthenticated()) {
    // Đã login customer → về trang chủ client.
    router.navigate(['/']);
    return false;
  }

  return true;
};

const clientGuestBrowseGuard: CanActivateFn = () => true;

export { clientAuthGuard, clientGuestGuard, clientGuestBrowseGuard };
