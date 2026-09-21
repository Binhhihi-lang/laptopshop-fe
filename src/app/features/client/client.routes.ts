import { Routes } from '@angular/router';
import {
  clientAuthGuard,
  clientGuestBrowseGuard,
  clientGuestGuard,
} from '@core/guards/client-guard';
import { ClientLayoutComponent } from './layout/client-layout/client-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';

/**
 * Routes cho nhánh client (storefront). Mount ở `path: ''` trong
 * `app.routes.ts` (đăng ký sau block /admin nên first-match-wins). Có 2 layout:
 *  - `AuthLayoutComponent` (split-screen, không header/footer) cho login /
 *    register / forgot-password / reset-password.
 *  - `ClientLayoutComponent` (header + outlet + footer) cho mọi trang còn lại.
 */
export const CLIENT_ROUTES: Routes = [
  // Auth: layout riêng split-screen, KHÔNG header/footer của storefront.
  // Mỗi route khai path cụ thể (không dùng route cha `path: ''`) vì route cha
  // rỗng sẽ khớp tiền tố MỌI url và nuốt luôn trang chủ `/` → outlet trống.
  {
    path: 'login',
    component: AuthLayoutComponent,
    canActivate: [clientGuestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/auth/login/login.component').then((m) => m.ClientLoginComponent),
      },
    ],
  },
  {
    path: 'register',
    component: AuthLayoutComponent,
    canActivate: [clientGuestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/auth/register/register.component').then((m) => m.ClientRegisterComponent),
      },
    ],
  },
  {
    path: 'forgot-password',
    component: AuthLayoutComponent,
    canActivate: [clientGuestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/auth/forgot-password/forgot-password.component').then(
            (m) => m.ClientForgotPasswordComponent,
          ),
      },
    ],
  },
  {
    path: 'reset-password',
    component: AuthLayoutComponent,
    canActivate: [clientGuestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/auth/reset-password/reset-password.component').then(
            (m) => m.ClientResetPasswordComponent,
          ),
      },
    ],
  },
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
      // Kết quả thanh toán VNPay — không guard để khách vừa rời cổng VNPay
      // vẫn xem được (xem trang không cần token; thanh toán lại mới cần).
      {
        path: 'payment-result',
        loadComponent: () =>
          import('./pages/payment-result/payment-result.component').then(
            (m) => m.PaymentResultComponent,
          ),
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
