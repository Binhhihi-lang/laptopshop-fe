import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';

// Import layout and page components
import { AdminLayoutComponent } from './features/admin/layout/admin-layout/admin-layout.component';
import { LoginComponent } from './features/admin/pages/login/login.component';
import { DashboardComponent } from './features/admin/pages/dashboard/dashboard.component';
import { UsersComponent } = from './features/admin/pages/users/users.component';
import { UserCreateComponent } = from './features/admin/pages/users/user-form/user-form.component';
import { UserEditComponent } = from './features/admin/pages/users/user-form/user-form.component';
import { UserDetailComponent } = from './features/admin/pages/users/users.component';
import { ProductsComponent } = from './features/admin/pages/products/products.component';
import { ProductCreateComponent } = from './features/admin/pages/products/product-form/product-form.component';
import { ProductEditComponent } = from './features/admin/pages/products/product-form/product-form.component';
import { CategoriesComponent } = from './features/admin/pages/categories/categories.component';
import { CategoryCreateComponent } = from './features/admin/pages/categories/category-form/category-form.component';
import { CategoryEditComponent } = from './features/admin/pages/categories/category-form/category-form.component';
import { CategoryDetailComponent } = from './features/admin/pages/categories/category-detail/category-detail.component';
import { CouponsComponent } = from './features/admin/pages/coupons/coupons.component';
import { CouponCreateComponent } = from './features/admin/pages/coupons/coupon-form/coupon-form.component';
import { CouponEditComponent } = from './features/admin/pages/coupons/coupon-form/coupon-form.component';
import { CouponDetailComponent } = from './features/admin/pages/coupons/coupon-detail/coupon-detail.component';
import { RolesComponent } = from './features/admin/pages/roles/roles.component';
import { RoleCreateComponent } = from './features/admin/pages/roles/role-form/role-form.component';
import { RoleEditComponent } = from './features/admin/pages/roles/role-form/role-form.component';
import { PermissionsComponent } = from './features/admin/pages/permissions/permissions.component';
import { PermissionCreateComponent } = from './features/admin/pages/permissions/permission-form/permission-form.component';
import { PermissionEditComponent } = from './features/admin/pages/permissions/permission-form/permission-form.component';
import { HomeComponent } = from './features/client/pages/home/home.component';
import { ProductDetailComponent } = from './features/client/pages/product-detail/product-detail.component';
import { CartComponent } = from './features/client/pages/cart/cart.component';

export const routes: Routes = [
  // Auth routes
  { path: 'login', component: LoginComponent, canActivate: [authGuard] },

  // Admin routes (protected)
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'users/create', component: UserCreateComponent },
      { path: 'users/:id/edit', component: UserEditComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'products/create', component: ProductCreateComponent },
      { path: 'products/:id/edit', component: ProductEditComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'categories/create', component: CategoryCreateComponent },
      { path: 'categories/:id/edit', component: CategoryEditComponent },
      { path: 'categories/:id', component: CategoryDetailComponent },
      { path: 'coupons', component: CouponsComponent },
      { path: 'coupons/create', component: CouponCreateComponent },
      { path: 'coupons/:id/edit', component: CouponEditComponent },
      { path: 'coupons/:id', component: CouponDetailComponent },
      { path: 'roles', component: RolesComponent },
      { path: 'roles/create', component: RoleCreateComponent },
      { path: 'roles/:id/edit', component: RoleEditComponent },
      { path: 'permissions', component: PermissionsComponent },
      { path: 'permissions/create', component: PermissionCreateComponent },
      { path: 'permissions/:id/edit', component: PermissionEditComponent }
    ]
  },

  // Client routes (public)
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'product/:id',
    component: ProductDetailComponent
  },
  {
    path: 'cart',
    component: CartComponent
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '' }
];