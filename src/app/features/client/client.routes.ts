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

      // Giỏ hàng: cho phép KHÁCH CHƯA đăng nhập xem giỏ guest (localStorage) —
      // trang tự hiện lời mời đăng nhập. Checkout trở đi mới bắt buộc login.
      {
        path: 'cart',
        loadComponent: () => import('./pages/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
        canActivate: [clientAuthGuard],
      },
      {
        path: 'order-success',
        loadComponent: () =>
          import('./pages/order-success/order-success.component').then(
            (m) => m.OrderSuccessComponent,
          ),
        canActivate: [clientAuthGuard],
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/order-list/order-list.component').then((m) => m.OrderListComponent),
        canActivate: [clientAuthGuard],
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
        canActivate: [clientAuthGuard],
      },

      // Trang tĩnh
      {
        path: 'warranty',
        loadComponent: () =>
          import('./pages/static/warranty.component').then((m) => m.WarrantyComponent),
      },
      {
        path: 'guide',
        loadComponent: () => import('./pages/static/guide.component').then((m) => m.GuideComponent),
      },

      // Wildcard trong layout client → 404 giữ header/footer
      {
        path: '**',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
