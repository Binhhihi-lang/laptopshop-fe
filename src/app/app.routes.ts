import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';

// Import layout and page components
import { AdminLayoutComponent } from "./features/admin/layout/admin-layout/admin-layout.component";
import { LoginComponent } from './features/admin/pages/login/login.component';
import { DashboardComponent } from './features/admin/pages/dashboard/dashboard.component';
import { UsersComponent } from './features/admin/pages/users/users.component';
import { UserFormComponent } from './features/admin/pages/user-form/user-form.component';
import { UserDetailComponent} from './features/admin/pages/user-detail/user-detail.component';
import { ProductsComponent } from './features/admin/pages/products/products.component';
import { ProductFormComponent } from './features/admin/pages/product-form/product-form.component';
import { ProductDetailComponent } from './features/admin/pages/product-detail/product-detail.component';
import { CategoriesComponent } from './features/admin/pages/categories/categories.component';
import { CategoryFormComponent } from './features/admin/pages/category-form/category-form.component';
import { CategoryDetailComponent } from './features/admin/pages/category-detail/category-detail.component';
import { CouponsComponent } from './features/admin/pages/coupons/coupons.component';
import { CouponFormComponent } from './features/admin/pages/coupon-form/coupon-form.component';
import { CouponDetailComponent } from './features/admin/pages/coupon-detail/coupon-detail.component';
import { RolesComponent } from './features/admin/pages/roles/roles.component';
import { RoleFormComponent } from './features/admin/pages/role-form/role-form.component';
import { RoleDetailComponent } from './features/admin/pages/role-detail/role-detail.component';
import { PermissionsComponent } from './features/admin/pages/permissions/permissions.component';
import { PermissionFormComponent } from './features/admin/pages/permission-form/permission-form.component';
import { PermissionDetailComponent } from './features/admin/pages/permission-detail/permission-detail.component';

// import { HomeComponent } = './features/client/pages/home/home.component';
// import { ProductDetailComponent } = './features/client/pages/product-detail/product-detail.component';
// import { CartComponent } = './features/client/pages/cart/cart.component';

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
      { path: 'users/create', component: UserFormComponent },
      { path: 'users/:id/edit', component: UserFormComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'products/create', component: ProductFormComponent },
      { path: 'products/:id/edit', component: ProductFormComponent },
      { path: 'products/:id', component: ProductDetailComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'categories/create', component: CategoryFormComponent },
      { path: 'categories/:id/edit', component: CategoryFormComponent },
      { path: 'categories/:id', component: CategoryDetailComponent },
      { path: 'coupons', component: CouponsComponent },
      { path: 'coupons/create', component: CouponFormComponent },
      { path: 'coupons/:id/edit', component: CouponFormComponent },
      { path: 'coupons/:id', component: CouponDetailComponent },
      { path: 'roles', component: RolesComponent },
      { path: 'roles/create', component: RoleFormComponent },
      { path: 'roles/:id/edit', component: RoleFormComponent },
      { path: 'roles/:id', component: RoleDetailComponent },
      { path: 'permissions', component: PermissionsComponent },
      { path: 'permissions/create', component: PermissionFormComponent },
      { path: 'permissions/:id/edit', component: PermissionFormComponent },
      { path: 'permissions/:id', component: PermissionDetailComponent }
    ]
  },

  // Client routes (public)
  // {
  //   path: '',
  //   component: HomeComponent
  // },
  // {
  //   path: 'product/:id',
  //   component: ProductDetailComponent
  // },
  // {
  //   path: 'cart',
  //   component: CartComponent
  // },

  // Wildcard route for 404
  { path: '**', redirectTo: '' }
];
