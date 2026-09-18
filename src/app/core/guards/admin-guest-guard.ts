import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/**
 * Guard cho `/admin/login`: chỉ người CHƯA đăng nhập quản trị mới thấy form login.
 *
 * Khác `authGuard` cũ (đẩy MỌI tài khoản có token về `/admin/dashboard`): ở đây
 * chỉ đẩy về dashboard khi token thuộc ADMIN/STAFF. Tài khoản CUSTOMER còn sót
 * token admin sẽ được dọn phiên và giữ lại form login — nếu không sẽ lặp vô hạn
 * `/admin/login` → `/admin/dashboard` → (adminGuard chặn) → `/`.
 */
export const adminGuestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  if (authService.hasRole('ADMIN') || authService.hasRole('STAFF')) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  // Token admin không thuộc ADMIN/STAFF (CUSTOMER đăng nhập từ trước khi BE
  // chặn ở login): dọn phiên quản trị rồi hiện lại form login.
  authService.clearTokens();
  authService.clearUserInfo();
  return true;
};
