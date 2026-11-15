import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin-guard';
import { adminGuestGuard } from '@core/guards/admin-guest-guard';

/**
 * Toàn bộ trang quản trị nạp LAZY. Trước đây chúng import tĩnh nên khách vào
 * trang chủ vẫn phải tải cả app admin (bundle initial ~1.2 MB) — chậm LCP và
 * tốn CPU parse trên mobile. Storefront (`''`) vốn đã lazy từ trước.
 */
export const routes: Routes = [
  // Admin login: đặt NGOÀI block /admin để không bị AdminLayoutComponent
  // bọc quanh (form login nên đứng riêng, không có header/sidebar). URL là
  // /admin/login nhưng không có ADMIN layout bên ngoài nên không thể  bao được Role trong này cần có cơ chế check quyền ở đây
  {
    path: 'admin/login',
    loadComponent: () =>
      import('@features/admin/pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [adminGuestGuard],
  },

  // Admin routes (protected) — bọc trong AdminLayoutComponent (header + sidebar).
  {
    path: 'admin',
    loadComponent: () =>
      import('@features/admin/layout/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    canActivate: [adminGuard],
    // Chặn CUSTOMER ngay route cha: adminGuard chỉ kiểm tra role/permission khi
    // route có khai báo `data`. Nếu thiếu, mọi tài khoản còn token đều vào được
    // trang quản trị (API trả 403 nhưng layout + trang vẫn render).
    data: { roles: ['ADMIN', 'STAFF'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/admin/pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('@features/admin/pages/users/users.component').then((m) => m.UsersComponent),
        data: { permissions: ['READ_USER'] },
      },
      {
        path: 'users/create',
        loadComponent: () =>
          import('@features/admin/pages/user-form/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
        data: { permissions: ['READ_USER'] },
      },
      {
        path: 'users/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/user-form/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
        data: { permissions: ['READ_USER'] },
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('@features/admin/pages/user-detail/user-detail.component').then(
            (m) => m.UserDetailComponent,
          ),
        data: { permissions: ['READ_USER'] },
      },
      // Hồ sơ cá nhân: bất kỳ tài khoản hợp lệ nào (kể cả STAFF) đều vào được,
      // KHÔNG yêu cầu READ_USER — khác với Quản lý người dùng ở trên.
      {
        path: 'profile',
        loadComponent: () =>
          import('@features/admin/pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('@features/admin/pages/products/products.component').then(
            (m) => m.ProductsComponent,
          ),
      },
      {
        path: 'products/create',
        loadComponent: () =>
          import('@features/admin/pages/product-form/product-form.component').then(
            (m) => m.ProductFormComponent,
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/product-form/product-form.component').then(
            (m) => m.ProductFormComponent,
          ),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('@features/admin/pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('@features/admin/pages/categories/categories.component').then(
            (m) => m.CategoriesComponent,
          ),
      },
      {
        path: 'categories/create',
        loadComponent: () =>
          import('@features/admin/pages/category-form/category-form.component').then(
            (m) => m.CategoryFormComponent,
          ),
      },
      {
        path: 'categories/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/category-form/category-form.component').then(
            (m) => m.CategoryFormComponent,
          ),
      },
      {
        path: 'categories/:id',
        loadComponent: () =>
          import('@features/admin/pages/category-detail/category-detail.component').then(
            (m) => m.CategoryDetailComponent,
          ),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('@features/admin/pages/vouchers/vouchers.component').then(
            (m) => m.VouchersComponent,
          ),
        data: { permissions: ['READ_VOUCHER'] },
      },
      {
        path: 'vouchers/create',
        loadComponent: () =>
          import('@features/admin/pages/voucher-form/voucher-form.component').then(
            (m) => m.VoucherFormComponent,
          ),
        data: { permissions: ['CREATE_VOUCHER'] },
      },
      {
        path: 'vouchers/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/voucher-form/voucher-form.component').then(
            (m) => m.VoucherFormComponent,
          ),
        data: { permissions: ['UPDATE_VOUCHER'] },
      },
      {
        path: 'vouchers/:id',
        loadComponent: () =>
          import('@features/admin/pages/voucher-detail/voucher-detail.component').then(
            (m) => m.VoucherDetailComponent,
          ),
        data: { permissions: ['READ_VOUCHER'] },
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('@features/admin/pages/promotions/promotions.component').then(
            (m) => m.PromotionsComponent,
          ),
        data: { permissions: ['READ_PROMOTION'] },
      },
      {
        path: 'promotions/create',
        loadComponent: () =>
          import('@features/admin/pages/promotion-form/promotion-form.component').then(
            (m) => m.PromotionFormComponent,
          ),
        data: { permissions: ['CREATE_PROMOTION'] },
      },
      {
        path: 'promotions/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/promotion-form/promotion-form.component').then(
            (m) => m.PromotionFormComponent,
          ),
        data: { permissions: ['UPDATE_PROMOTION'] },
      },
      {
        path: 'promotions/:id',
        loadComponent: () =>
          import('@features/admin/pages/promotion-detail/promotion-detail.component').then(
            (m) => m.PromotionDetailComponent,
          ),
        data: { permissions: ['READ_PROMOTION'] },
      },
      {
        path: 'flash-sales',
        loadComponent: () =>
          import('@features/admin/pages/flash-sales/flash-sales.component').then(
            (m) => m.FlashSalesComponent,
          ),
        data: { permissions: ['READ_FLASH_SALE'] },
      },
      {
        path: 'flash-sales/create',
        loadComponent: () =>
          import('@features/admin/pages/flash-sale-form/flash-sale-form.component').then(
            (m) => m.FlashSaleFormComponent,
          ),
        data: { permissions: ['CREATE_FLASH_SALE'] },
      },
      {
        path: 'flash-sales/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/flash-sale-form/flash-sale-form.component').then(
            (m) => m.FlashSaleFormComponent,
          ),
        data: { permissions: ['UPDATE_FLASH_SALE'] },
      },
      {
        path: 'flash-sales/:id',
        loadComponent: () =>
          import('@features/admin/pages/flash-sale-detail/flash-sale-detail.component').then(
            (m) => m.FlashSaleDetailComponent,
          ),
        data: { permissions: ['READ_FLASH_SALE'] },
      },
      {
        path: 'home-banners',
        loadComponent: () =>
          import('@features/admin/pages/home-banners/home-banners.component').then(
            (m) => m.HomeBannersComponent,
          ),
        data: { permissions: ['READ_HOME_BANNER'] },
      },
      {
        path: 'home-banners/create',
        loadComponent: () =>
          import('@features/admin/pages/home-banner-form/home-banner-form.component').then(
            (m) => m.HomeBannerFormComponent,
          ),
        data: { permissions: ['CREATE_HOME_BANNER'] },
      },
      {
        path: 'home-banners/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/home-banner-form/home-banner-form.component').then(
            (m) => m.HomeBannerFormComponent,
          ),
        data: { permissions: ['UPDATE_HOME_BANNER'] },
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('@features/admin/pages/orders/orders.component').then(
            (m) => m.OrdersComponent,
          ),
        data: { permissions: ['READ_ORDER'] },
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('@features/admin/pages/order-detail/order-detail.component').then(
            (m) => m.OrderDetailComponent,
          ),
        data: { permissions: ['READ_ORDER'] },
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('@features/admin/pages/roles/roles.component').then((m) => m.RolesComponent),
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'roles/create',
        loadComponent: () =>
          import('@features/admin/pages/role-form/role-form.component').then(
            (m) => m.RoleFormComponent,
          ),
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'roles/:id',
        loadComponent: () =>
          import('@features/admin/pages/role-detail/role-detail.component').then(
            (m) => m.RoleDetailComponent,
          ),
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'roles/:id/edit',
        loadComponent: () =>
          import('@features/admin/pages/role-form/role-form.component').then(
            (m) => m.RoleFormComponent,
          ),
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'permissions',
        loadComponent: () =>
          import('@features/admin/pages/permissions/permissions.component').then(
            (m) => m.PermissionsComponent,
          ),
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
    ],
  },

  // Storefront (client) — giao diện mặc định khi user vào /.
  // Đăng ký với path '' để khớp mọi URL không thuộc /admin/**, đặt SAU block
  // admin để first-match-wins. Wildcard '**' ở dưới cùng sẽ bắt các path lạ.
  {
    path: '',
    loadChildren: () => import('./features/client/client.routes').then((m) => m.CLIENT_ROUTES),
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '' },
];
