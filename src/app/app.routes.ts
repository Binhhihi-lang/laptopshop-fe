import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin-guard';
import { adminGuestGuard } from '@core/guards/admin-guest-guard';

// Import layout and page components
import { AdminLayoutComponent } from '@features/admin/layout/admin-layout/admin-layout.component';
import { LoginComponent } from '@features/admin/pages/login/login.component';
import { DashboardComponent } from '@features/admin/pages/dashboard/dashboard.component';
import { UsersComponent } from '@features/admin/pages/users/users.component';
import { UserFormComponent } from '@features/admin/pages/user-form/user-form.component';
import { UserDetailComponent } from '@features/admin/pages/user-detail/user-detail.component';
import { ProfileComponent } from '@features/admin/pages/profile/profile.component';
import { ProductsComponent } from '@features/admin/pages/products/products.component';
import { ProductFormComponent } from '@features/admin/pages/product-form/product-form.component';
import { ProductDetailComponent } from '@features/admin/pages/product-detail/product-detail.component';
import { CategoriesComponent } from '@features/admin/pages/categories/categories.component';
import { CategoryFormComponent } from '@features/admin/pages/category-form/category-form.component';
import { CategoryDetailComponent } from '@features/admin/pages/category-detail/category-detail.component';
import { VouchersComponent } from '@features/admin/pages/vouchers/vouchers.component';
import { VoucherFormComponent } from '@features/admin/pages/voucher-form/voucher-form.component';
import { VoucherDetailComponent } from '@features/admin/pages/voucher-detail/voucher-detail.component';
import { PromotionsComponent } from '@features/admin/pages/promotions/promotions.component';
import { PromotionFormComponent } from '@features/admin/pages/promotion-form/promotion-form.component';
import { PromotionDetailComponent } from '@features/admin/pages/promotion-detail/promotion-detail.component';
import { FlashSalesComponent } from '@features/admin/pages/flash-sales/flash-sales.component';
import { FlashSaleFormComponent } from '@features/admin/pages/flash-sale-form/flash-sale-form.component';
import { FlashSaleDetailComponent } from '@features/admin/pages/flash-sale-detail/flash-sale-detail.component';
import { HomeBannersComponent } from '@features/admin/pages/home-banners/home-banners.component';
import { HomeBannerFormComponent } from '@features/admin/pages/home-banner-form/home-banner-form.component';
import { OrdersComponent } from '@features/admin/pages/orders/orders.component';
import { OrderDetailComponent } from '@features/admin/pages/order-detail/order-detail.component';
import { RolesComponent } from '@features/admin/pages/roles/roles.component';
import { RoleFormComponent } from '@features/admin/pages/role-form/role-form.component';
import { RoleDetailComponent } from '@features/admin/pages/role-detail/role-detail.component';
import { PermissionsComponent } from '@features/admin/pages/permissions/permissions.component';

export const routes: Routes = [
  // Admin login: đặt NGOÀI block /admin để không bị AdminLayoutComponent
  // bọc quanh (form login nên đứng riêng, không có header/sidebar). URL là
  // /admin/login nhưng không có ADMIN layout bên ngoài nên không thể  bao được Role trong này cần có cơ chế check quyền ở đây
  { path: 'admin/login', component: LoginComponent, canActivate: [adminGuestGuard] },

  // Admin routes (protected) — bọc trong AdminLayoutComponent (header + sidebar).
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    // Chặn CUSTOMER ngay route cha: adminGuard chỉ kiểm tra role/permission khi
    // route có khai báo `data`. Nếu thiếu, mọi tài khoản còn token đều vào được
    // trang quản trị (API trả 403 nhưng layout + trang vẫn render).
    data: { roles: ['ADMIN', 'STAFF'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'users',
        component: UsersComponent,
        data: { permissions: ['READ_USER'] },
      },
      {
        path: 'users/create',
        component: UserFormComponent,
        data: { permissions: ['READ_USER'] },
      },
      {
        path: 'users/:id/edit',
        component: UserFormComponent,
        data: { permissions: ['READ_USER'] },
      },
      {
        path: 'users/:id',
        component: UserDetailComponent,
        data: { permissions: ['READ_USER'] },
      },
      // Hồ sơ cá nhân: bất kỳ tài khoản hợp lệ nào (kể cả STAFF) đều vào được,
      // KHÔNG yêu cầu READ_USER — khác với Quản lý người dùng ở trên.
      { path: 'profile', component: ProfileComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'products/create', component: ProductFormComponent },
      { path: 'products/:id/edit', component: ProductFormComponent },
      { path: 'products/:id', component: ProductDetailComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'categories/create', component: CategoryFormComponent },
      { path: 'categories/:id/edit', component: CategoryFormComponent },
      { path: 'categories/:id', component: CategoryDetailComponent },
      {
        path: 'vouchers',
        component: VouchersComponent,
        data: { permissions: ['READ_VOUCHER'] },
      },
      {
        path: 'vouchers/create',
        component: VoucherFormComponent,
        data: { permissions: ['CREATE_VOUCHER'] },
      },
      {
        path: 'vouchers/:id/edit',
        component: VoucherFormComponent,
        data: { permissions: ['UPDATE_VOUCHER'] },
      },
      {
        path: 'vouchers/:id',
        component: VoucherDetailComponent,
        data: { permissions: ['READ_VOUCHER'] },
      },
      {
        path: 'promotions',
        component: PromotionsComponent,
        data: { permissions: ['READ_PROMOTION'] },
      },
      {
        path: 'promotions/create',
        component: PromotionFormComponent,
        data: { permissions: ['CREATE_PROMOTION'] },
      },
      {
        path: 'promotions/:id/edit',
        component: PromotionFormComponent,
        data: { permissions: ['UPDATE_PROMOTION'] },
      },
      {
        path: 'promotions/:id',
        component: PromotionDetailComponent,
        data: { permissions: ['READ_PROMOTION'] },
      },
      {
        path: 'flash-sales',
        component: FlashSalesComponent,
        data: { permissions: ['READ_FLASH_SALE'] },
      },
      {
        path: 'flash-sales/create',
        component: FlashSaleFormComponent,
        data: { permissions: ['CREATE_FLASH_SALE'] },
      },
      {
        path: 'flash-sales/:id/edit',
        component: FlashSaleFormComponent,
        data: { permissions: ['UPDATE_FLASH_SALE'] },
      },
      {
        path: 'flash-sales/:id',
        component: FlashSaleDetailComponent,
        data: { permissions: ['READ_FLASH_SALE'] },
      },
      {
        path: 'home-banners',
        component: HomeBannersComponent,
        data: { permissions: ['READ_HOME_BANNER'] },
      },
      {
        path: 'home-banners/create',
        component: HomeBannerFormComponent,
        data: { permissions: ['CREATE_HOME_BANNER'] },
      },
      {
        path: 'home-banners/:id/edit',
        component: HomeBannerFormComponent,
        data: { permissions: ['UPDATE_HOME_BANNER'] },
      },
      {
        path: 'orders',
        component: OrdersComponent,
        data: { permissions: ['READ_ORDER'] },
      },
      {
        path: 'orders/:id',
        component: OrderDetailComponent,
        data: { permissions: ['READ_ORDER'] },
      },
      {
        path: 'roles',
        component: RolesComponent,
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'roles/create',
        component: RoleFormComponent,
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'roles/:id',
        component: RoleDetailComponent,
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'roles/:id/edit',
        component: RoleFormComponent,
        data: { permissions: ['MANAGE_ROLES_PERMISSIONS'] },
      },
      {
        path: 'permissions',
        component: PermissionsComponent,
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
