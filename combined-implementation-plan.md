# Kế hoạch Triển khai Frontend Angular — Laptopshop

## Mục tiêu
Xây dựng ứng dụng frontend Angular 22 (standalone components) thay thế toàn bộ giao diện hiện tại, bao gồm:
- Giao diện Admin đầy đủ với CRUD cho Users, Roles, Permissions, Products, Categories, Coupons
- Trang Dashboard hiển thị thống kê
- Giao diện Client (Home, Product Detail, Cart) cho khách hàng
- Kết nối với backend Spring Boot qua REST API `/api/v1/**`

## Quyết định thiết kế

| Chủ đề | Quyết định |
|---|---|
| UI Library | Angular Material 22 |
| Form strategy | Reactive Forms |
| State management | Signals (component state) + RxJS (HTTP) |
| Table UI | Hybrid: MatTable desktop / MatCard mobile |
| Confirm dialog | MatDialog |
| API response | Unwrap `result` ở interceptor |
| Auth | JWT trong localStorage, gửi qua `Authorization: Bearer` |
| Upload ảnh | multipart/form-data kèm CRUD |
| CORS | Cấu hình ở backend Spring Boot + proxy cho dev |
| Pagination | Chưa có — backend trả list đầy đủ (client-side search/filter) |
| Architecture | Standalone components, feature modules lazy-loaded |

## Backend API Reference

**Base URL:** `/api/v1`

### Auth
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/admin/auth/login` | `{ email, password }` | `{ authenticated: boolean, token: string, refreshToken: string }` |
| POST | `/admin/auth/introspect` | `{ token }` | `{ valid: boolean }` |
| POST | `/admin/auth/logout` | `{ token, refreshToken }` | `void` (response includes message in wrapper) |
| POST | `/admin/auth/refresh` | `{ refreshToken }` | `{ authenticated: boolean, token: string, refreshToken: string }` |

### Users
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/users` | — | `UserResponse[]` |
| GET | `/admin/users/{id}` | — | `UserResponse` |
| POST | `/admin/users` | `multipart/form-data: UserCreationRequest` | `UserResponse` |
| PUT | `/admin/users/{id}` | `multipart/form-data: UserUpdateRequest` (ID in path) | `UserResponse` |
| DELETE | `/admin/users/{id}` | — | `void` |

`UserResponse = { id: string, email: string, fullName: string, phone: string, address: string, avatar: string | null, roleNames: string[] }`
`UserCreationRequest = { email: string, password: string, fullName: string, address: string, phone: string, roleNames: string[], inputFile: MultipartFile }`
`UserUpdateRequest = { email: string, fullName: string, phone: string, address: string, roleNames: string[], inputFile: MultipartFile }`

### Roles
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/roles` | — | `RoleResponse[]` |
| GET | `/admin/roles/{id}` | — | `RoleResponse` |
| POST | `/admin/roles` | `RoleCreationRequest` | `RoleResponse` |
| PUT | `/admin/roles/{id}` | `RoleUpdateRequest` (ID in path) | `RoleResponse` |
| DELETE | `/admin/roles/{id}` | — | `void` |

`RoleResponse = { id: string, name: string, description: string, permissionNames: string[] }`
`RoleCreationRequest = { name: string, description: string, permissionNames: string[] }`
`RoleUpdateRequest = { name: string, description: string, permissionNames: string[] }`

### Permissions
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/permissions` | — | `PermissionResponse[]` |
| GET | `/admin/permissions/{id}` | — | `PermissionResponse` |
| POST | `/admin/permissions` | `{ name: string, description: string }` | `PermissionResponse` |
| PUT | `/admin/permissions/{id}` | `{ name: string, description: string }` | `PermissionResponse` |
| DELETE | `/admin/permissions/{id}` | — | `void` |

`PermissionResponse = { id: string, name: string, description: string }`

### Products
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/products` | — | `ProductResponse[]` |
| GET | `/admin/products/{id}` | — | `ProductResponse` |
| POST | `/admin/products` | `multipart/form-data: productInfo (ProductCreationRequest) + inputFile: MultipartFile` | `ProductResponse` |
| PUT | `/admin/products/{id}` | `ProductUpdateRequest` (ID in path, supports multipart/form-data) | `ProductResponse` |
| DELETE | `/admin/products/{id}` | — | `void` (response includes message in wrapper) |

`ProductResponse = { id: string, name: string, price: number, quantity: number, description: string, image: string, sold: number, categoryId: string, categoryName: string }`
`ProductCreationRequest = { name: string, price: number, quantity: number, description: string, categoryId: string }`
`ProductUpdateRequest = { name: string, price: number, quantity: number, description: string, categoryId: string, inputFile: MultipartFile }`

### Categories
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/categories` | — | `CategoryResponse[]` |
| GET | `/admin/categories/{id}` | — | `CategoryDetailResponse` |
| POST | `/admin/categories` | `CategoryCreationRequest` (supports multipart/form-data for image upload) | `CategoryResponse` |
| PUT | `/admin/categories/{id}` | `CategoryUpdateRequest` (ID in path, supports multipart/form-data) | `CategoryResponse` |
| DELETE | `/admin/categories/{id}` | — | `void` (response includes message in wrapper) |

`CategoryResponse = { id: string, name: string, description: string, slug: string, displayOrder: number, active: boolean }`
`CategoryDetailResponse = CategoryResponse & { products: ProductResponse[] }`
`CategoryCreationRequest = { name: string, slug: string, description: string, displayOrder: number, active: boolean, inputFile: MultipartFile }`
`CategoryUpdateRequest = { name: string, slug: string, description: string, displayOrder: number, active: boolean, inputFile: MultipartFile }`

### Coupons
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/coupons` | — | `CouponResponse[]` |
| GET | `/admin/coupons/{id}` | — | `CouponResponse` |
| POST | `/admin/coupons` | `{ code: string, discountPercent: number | null, discountAmount: number | null, usageLimit: number }` | `CouponResponse` |
| PUT | `/admin/coupons/{id}` | `{ code: string, discountPercent: number | null, discountAmount: number | null, usageLimit: number }` | `CouponResponse` |
| DELETE | `/admin/coupons/{id}` | — | `void` |

`CouponResponse = { id: string, code: string, discountPercent: number | null, discountAmount: number | null, usageLimit: number, usedCount: number }`

### Public (Client) APIs
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/v1/products` | `ProductResponse[]` |
| GET | `/api/v1/products/{id}` | `ProductResponse` |
| GET | `/api/v1/categories` | `CategoryResponse[]` |

## 📐 Architectural Overview & Updated Guidelines

### 🏗️ Cấu trúc Thư mục
```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── features/
│   │   └── admin/
│   │       ├── layout/
│   │       ├── pages/
│   │       │   ├── dashboard/
│   │       │   ├── login/
│   │       │   ├── users/
│   │       │   │   ├── user-form/          # Form reuse for create/edit
│   │       │   │   ├── user-detail/
│   │       │   │   └── users.component.ts  # List
│   │       │   ├── products/
│   │       │   │   ├── product-form/
│   │       │   │   ├── product-detail/
│   │       │   │   └── products.component.ts
│   │       │   ├── categories/
│   │       │   │   ├── category-form/
│   │       │   │   ├── category-detail/
│   │       │   │   └── categories.component.ts
│   │       │   ├── coupons/
│   │       │   │   ├── coupon-form/
│   │       │   │   ├── coupon-detail/
│   │       │   │   └── coupons.component.ts
│   │       │   ├── roles/
│   │       │   │   ├── role-form/
│   │       │   │   ├── role-detail/
│   │       │   │   └── roles.component.ts
│   │       │   └── permissions/
│   │       │       ├── permission-form/
│   │       │   │   ├── permission-detail/
│   │       │   │   └── permissions.component.ts
│   │       └── ...
│   ├── shared/
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   ├── app.routes.ts
│   └── app.config.ts
├── assets/
├── environments/
└── ...
```

### 🔄 Luồng Dữ liệu (Data Flow)
1. **Template (HTML)**: Gửi sự kiện (click, submit) tới Component.
2. **Component**: 
   - Nhận dữ liệu từ Service qua Dependency Injection.
   - Xử lý logic présentation (form validation, trạng thái loading).
   - Gọi phương thức của Service để thực hiện thao tác với backend.
3. **Service**: 
   - Tiến hành gọi API qua `HttpClient` (được wraps trong `api.service.ts`).
   - Áp dụng `Interceptor` (ví dụ: `JwtInterceptor`) để thêm token, xử lý lỗi, làm mới token.
   - Trả về `Observable` cho Component.
4. **Interceptor**: 
   - Xử lý trước khi gửi lên server (thêm Authorization header).
   - Bắt lỗi phản hồi (401 → tự động làm mới token, hướng đến trang login nếu thất bại).
5. **API (Backend)**: 
   - Nhận request, xử lý, trả về JSON response.
   - Định dạng response được thống nhất bao gồm `result`, `message`, `statusCode` (tùy backend).

### 🛣️ Các Route Chính (`src/app/app.routes.ts`)
- `/login` → `LoginComponent` (công khai)
- `/admin` (protected by `AdminGuard`):
  - `/` → redirect to `/dashboard`
  - `/dashboard` → `DashboardComponent`
  - `/users` → `UsersComponent` (danh sách)
  - `/users/create` → `UserFormComponent` (tạo mới)
  - `/users/:id/edit` → `UserFormComponent` (chỉnh sửa, cùng component với create)
  - `/users/:id` → `UserDetailComponent` (xem chi tiết)
  - `/products` → `ProductsComponent`
  - `/products/create` → `ProductFormComponent`
  - `/products/:id/edit` → `ProductFormComponent`
  - `/products/:id` → `ProductDetailComponent`
  - `/categories` → `CategoriesComponent`
  - `/categories/create` → `CategoryFormComponent`
  - `/categories/:id/edit` → `CategoryFormComponent`
  - `/categories/:id` → `CategoryDetailComponent`
  - `/coupons` → `CouponsComponent`
  - `/coupons/create` → `CouponFormComponent`
  - `/coupons/:id/edit` → `CouponFormComponent`
  - `/coupons/:id` → `CouponDetailComponent`
  - `/roles` → `RolesComponent`
  - `/roles/create` → `RoleFormComponent`
  - `/roles/:id/edit` → `RoleFormComponent`
  - `/roles/:id` → `RoleDetailComponent`
  - `/permissions` → `PermissionsComponent`
  - `/permissions/create` → `PermissionFormComponent`
  - `/permissions/:id/edit` → `PermissionFormComponent`
  - `/permissions/:id` → `PermissionDetailComponent`
- `/` → `HomeComponent` (client)
- `/product/:id` → `ProductDetailComponent` (client)
- `/cart` → `CartComponent` (client)
- `**` → redirect to `''` (trang chủ)

### ✅ Tiêu Chuẩn Mới Sau Refactor
- **Component Naming**: Mỗi feature có tối đa 3 component:
  - `[entity].component.ts` → danh sách (list)
  - `[entity]-form.component.ts` → form dùng chung cho cả tạo và sửa (có logic ẩn/hiện trường `password` khi edit qua `@if (!isEditMode)`).
  - `[entity]-detail.component.ts` → trang chi tiết.
- **Form Reusability**: Form được thiết kế để tái sử dụng giữa create và edit, với khả năng điều chỉnh поля dựa trên chế độ (có `isEditMode` input từ route hoặc service).
- **DTOs vị trí**: Tất cả các interfaces của DTO nằm trong `src/app/core/models/` (ví dụ: `user.model.ts`, `product.model.ts`, etc.).
- **Standalone Components**: Tất cả các components là độc lập (`standalone: true`) và khai báo các phụ thuộc trực tiếp trong mảng `imports`.
- **State**: Trạng thái thành phần được quản lý bằng Signals (đối với trạng thái cục bộ) và RxJS (đối với các luồng HTTP).
- **Routes**: Các routes để tạo và sửa trỏ sang cùng component form, giảm thiểu sự lặp lại.

## Frontend Implementation Plan

### Phase 1: Cấu hình & Core Infrastructure
- [ ] Cấu hình & Core Infrastructure
- [ ] Cài Angular Material: `ng add @angular/material`
- [ ] Setup Environment files: environment.ts, environment.prod.ts with API URL
- [ ] Proxy config: create proxy.conf.json for /api to http://localhost:8080, update angular.json
- [ ] Configure app.config.ts: provideHttpClient with interceptors, provide JWT interceptor
- [ ] Tạo Models/Interfaces trong src/app/core/models/ (User, Role, Permission, Product, Category, Coupon, ApiResponse, Auth)
- [ ] Tạo Utils: constants.ts (API_ENDPOINTS, STORAGE_KEYS), jwt.helper.ts (decodeToken, getRolesFromToken, getPermissionsFromToken, isTokenExpired)
- [ ] Tạo Services: api.service.ts (generic HTTP with interceptors), auth.service.ts (login, logout, refreshToken, getUserInfo, etc.), user.service.ts, role.service.ts, permission.service.ts, product.service.ts, category.service.ts, coupon.service.ts
- [ ] Tạo Guards: admin-guard.ts (check role/permission), auth-guard.ts (for client routes)
- [ ] Tạo Interceptors: jwt-interceptor.ts (attach token, refresh on 401, logout on refresh fail)

