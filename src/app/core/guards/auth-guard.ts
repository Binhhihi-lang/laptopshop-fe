import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Allow access only if NOT authenticated (for guest routes like login, register)
  if (authService.isAuthenticated()) {
    // If already logged in, redirect to admin dashboard
    router.navigate(['/admin/dashboard']);
    return false;
  }
  return true;
};