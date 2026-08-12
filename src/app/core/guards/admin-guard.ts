import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

// Bảo vệ các đường dẫn của Admin khi có người truy cập trái phép
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Check roles if specified in route data
    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    if (requiredRoles && Array.isArray(requiredRoles)) {
      const hasAnyRole = requiredRoles.some(role => authService.hasRole(role));
      if (!hasAnyRole) {
        // Redirect to unauthorized or home
        router.navigate(['/']);
        return false;
      }
    }
    // Check permissions if specified in route data
    const requiredPermissions = route.data?.['permissions'] as string[] | undefined;
    if (requiredPermissions && Array.isArray(requiredPermissions)) {
      const hasAnyPermission = requiredPermissions.some(perm => authService.hasPermission(perm));
      if (!hasAnyPermission) {
        router.navigate(['/']);
        return false;
      }
    }
    return true;
  } else {
    // Not authenticated, redirect to login
    router.navigate(['/login']);
    return false;
  }
};
