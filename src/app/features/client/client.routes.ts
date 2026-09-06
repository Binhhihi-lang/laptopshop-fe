import { Routes } from '@angular/router';
import {
  clientAuthGuard,
  clientGuestBrowseGuard,
  clientGuestGuard,
} from '@core/guards/client-guard';
import { ClientLayoutComponent } from './layout/client-layout/client-layout.component';

/**
 * Routes cho nhánh client (storefront). Mount ở `path: 'client'` trong
 * `app.routes.ts` → mọi URL `/client/...` sẽ render `ClientLayoutComponent`
 * (header + outlet + footer) với page tương ứng ở <router-outlet/>.
 *
 * Sprint 1 bao gồm:
 *  - Browse: home, product-list, product-detail
 *  - Auth:   login, register, forgot-password, reset-password
 *  - Account: profile, change-password
 *  - Cart (Sprint 2): cart, checkout, orders — đã khai báo redirect để tránh
 *    broken link trong header; trang thật sẽ thêm ở Sprint 2.
 */
export const CLIENT_ROUTES: Routes = [
  {
    path: '',
    component: ClientLayoutComponent,
    children: [
      // Browse (guest allowed)
      {
        path: '',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
        canActivate: [clientGuestBrowseGuard],
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/product-list/product-list.component').then((m) => m.ProductListComponent),
        canActivate: [clientGuestBrowseGuard],
      },
      {
        path: 'products/:code',
        loadComponent: () =>
          import('./pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
        canActivate: [clientGuestBrowseGuard],
      },

      // Auth (guest only)
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login/login.component').then((m) => m.ClientLoginComponent),
        canActivate: [clientGuestGuard],
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/register/register.component').then((m) => m.ClientRegisterComponent),
        canActivate: [clientGuestGuard],
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/auth/forgot-password/forgot-password.component').then(
            (m) => m.ClientForgotPasswordComponent,
          ),
        canActivate: [clientGuestGuard],
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/auth/reset-password/reset-password.component').then(
            (m) => m.ClientResetPasswordComponent,
          ),
        canActivate: [clientGuestGuard],
      },

      // Account (auth required)
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ClientProfileComponent),
        canActivate: [clientAuthGuard],
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./pages/auth/change-password/change-password.component').then(
            (m) => m.ClientChangePasswordComponent,
          ),
        canActivate: [clientAuthGuard],
      },

      // Cart / orders (Sprint 2) — tạm redirect về home để tránh 404
      // ngay khi user bấm icon cart.
      { path: 'cart', redirectTo: '', pathMatch: 'full' },
      { path: 'checkout', redirectTo: '', pathMatch: 'full' },
      { path: 'orders', redirectTo: '', pathMatch: 'full' },
      { path: 'orders/:id', redirectTo: '', pathMatch: 'full' },
      { path: 'payment/return', redirectTo: '', pathMatch: 'full' },
    ],
  },
];
