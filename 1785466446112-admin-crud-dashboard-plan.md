# Kế hoạch triển khai Frontend Admin CRUD + Dashboard — Laptopshop v5

## Mục tiêu
Triển khai đầy đủ giao diện Admin với CRUD cho Users, Roles, Permissions, Products, Categories, Coupons và trang Dashboard, kết nối backend Spring Boot v5 qua REST API.

## Phạm vi
- **Bao gồm**: Admin layout, Login, Dashboard, CRUD đầy đủ cho 6 module (Users, Roles, Permissions, Products, Categories, Coupons)
- **Không bao gồm**: Client pages (Home, Product Detail, Cart) — để phase sau

## Backend API Reference (v5)

Base URL: `/api/v1`

### Auth
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/admin/auth/login` | `{ email: string, password: string }` | `{ authenticated: boolean, token: string, refreshToken: string }` |
| POST | `/admin/auth/introspect` | `{ token: string }` | `{ authenticated: boolean }` |
| POST | `/admin/auth/logout` | `{ token: string }` | `void` |
| POST | `/admin/auth/refresh` | `{ token: string }` | `{ authenticated: boolean, token: string, refreshToken: string }` |

### Users
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/users` | — | `UserResponse[]` |
| GET | `/admin/users/{id}` | — | `UserResponse` |
| POST | `/admin/users` | `multipart/form-data` | `UserResponse` |
| PUT | `/admin/users/{id}` | `multipart/form-data` | `UserResponse` |
| DELETE | `/admin/users/{id}` | — | `void` |

`UserResponse = { id, username, email, fullName, roleNames: string[], deletedAt: string | null }`
`UserCreationRequest = { username, email, password, fullName, roleNames: string[], avatar?: File }`
`UserUpdateRequest = Omit<UserCreationRequest, 'password'> & { id: number, password?: string }`

### Roles
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/roles` | — | `RoleResponse[]` |
| GET | `/admin/roles/{id}` | — | `RoleResponse` |
| POST | `/admin/roles` | `{ name: string, permissionNames: string[] }` | `RoleResponse` |
| PUT | `/admin/roles/{id}` | `{ name: string, permissionNames: string[] }` | `RoleResponse` |
| DELETE | `/admin/roles/{id}` | — | `void` |

`RoleResponse = { id, name, permissionNames: string[] }`

### Permissions
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/permissions` | — | `PermissionResponse[]` |
| GET | `/admin/permissions/{id}` | — | `PermissionResponse` |
| POST | `/admin/permissions` | `{ name: string, description: string }` | `PermissionResponse` |
| PUT | `/admin/permissions/{id}` | `{ name: string, description: string }` | `PermissionResponse` |
| DELETE | `/admin/permissions/{id}` | — | `void` |

`PermissionResponse = { id, name, description }`

### Products
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/products` | — | `ProductResponse[]` |
| GET | `/admin/products/{id}` | — | `ProductResponse` |
| POST | `/admin/products` | `multipart/form-data` | `ProductResponse` |
| PUT | `/admin/products/{id}` | `multipart/form-data` | `ProductResponse` |
| DELETE | `/admin/products/{id}` | — | `void` |

`ProductResponse = { id, name, price, quantity, description, image: string, sold, categoryId, categoryName }`
`ProductCreationRequest = { name, price, quantity, description, image?: File, categoryId: number }`

### Categories
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/categories` | — | `CategoryResponse[]` |
| GET | `/admin/categories/{id}` | — | `CategoryDetailResponse` |
| POST | `/admin/categories` | `{ name, description }` | `CategoryResponse` |
| PUT | `/admin/categories/{id}` | `{ name, description }` | `CategoryResponse` |
| DELETE | `/admin/categories/{id}` | — | `void` |

`CategoryResponse = { id, name, description }`
`CategoryDetailResponse = CategoryResponse & { products: ProductResponse[] }`

### Coupons
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/coupons` | — | `CouponResponse[]` |
| GET | `/admin/coupons/{id}` | — | `CouponResponse` |
| POST | `/admin/coupons` | `{ code, discountPercent?, discountAmount?, usageLimit }` | `CouponResponse` |
| PUT | `/admin/coupons/{id}` | `{ code, discountPercent?, discountAmount?, usageLimit }` | `CouponResponse` |
| DELETE | `/admin/coupons/{id}` | — | `void` |

`CouponResponse = { id, code, discountPercent: number | null, discountAmount: number | null, usageLimit, usedCount }`

### JWT Token Structure
Claims:
- `sub`: fullName
- `userId`: number
- `scope`: space-separated roles with `ROLE_` prefix (e.g. `"ROLE_ADMIN ROLE_STAFF"`)
- `permissions`: space-separated permission names without prefix (e.g. `"user:read user:write"`)
- `exp`, `iat`, `iss`

Frontend parsing:
- `roleNames = scope.split(' ').filter(s => s.startsWith('ROLE_')).map(s => s.replace('ROLE_', ''))`
- `permissions = permissions.split(' ').filter(Boolean)`

### API Response Wrapper
All responses are wrapped: `ApiResponse<T> = { code: number, message: string, result: T }`
Errors are returned as HTTP error responses (4xx/5xx) — interceptor unwraps `result` from successful responses.

---

## Các bước triển khai

### Phase 1: Setup & Core Infrastructure

#### 1.1 Cài Angular Material
```bash
ng add @angular/material
```
Chọn theme Indigo/Pink, bật global typography + animations.

#### 1.2 Environment & Proxy
Tạo `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

Tạo `src/environments/environment.prod.ts` với production URL.

Tạo `proxy.conf.json` ở gốc:
```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

Cập nhật `angular.json` serve config để dùng proxy.

#### 1.3 Models & Interfaces
Tạo `src/app/core/models/` với các file interfaces theo API Reference.

#### 1.4 Utils
Tạo `src/app/core/utils/constants.ts` với `API_ENDPOINTS` và `STORAGE_KEYS`.
Tạo `src/app/core/utils/jwt.helper.ts` với các hàm decode/parse JWT.

#### 1.5 Core Services
- **`api.service.ts`**: Generic HTTP wrapper với `get`, `post`, `put`, `delete`, `upload` (FormData), unwrap `ApiResponse.result`, error handling.
- **`auth.service.ts`**: `login()`, `logout()`, `getToken()`, `getRefreshToken()`, `getUserInfo()`, `isAuthenticated()`, `hasRole()`, `hasPermission()`, `refreshToken()`.
- **Module services** (`user.service.ts`, `role.service.ts`, `permission.service.ts`, `product.service.ts`, `category.service.ts`, `coupon.service.ts`): CRUD operations sử dụng `ApiService`.

#### 1.6 Interceptors
- **`jwt-interceptor.ts`**: Attach `Authorization: Bearer <token>` từ localStorage. Error interceptor: bắt 401 → gọi `authService.refreshToken()` → retry request gốc; nếu refresh fail → logout + redirect.

#### 1.7 Guards
- **`admin-guard.ts`**: Kiểm tra `authService.isAuthenticated()`, redirect `/login` nếu chưa auth. Hỗ trợ `data.roles` và `data.permissions` để check quyền chi tiết.

#### 1.8 Routing
Cập nhật `app.routes.ts`:
```
/login → LoginComponent
/ → AdminLayoutComponent (canActivate: adminGuard), children:
  /dashboard, /users, /users/create, /users/:id/edit, /users/:id
  /products, /products/create, /products/:id/edit
  /categories, /categories/create, /categories/:id/edit, /categories/:id
  /coupons, /coupons/create, /coupons/:id/edit, /coupons/:id
  /roles
  /permissions
```

### Phase 2: Admin Layout

#### 2.1 AdminLayout
- `<mat-sidenav-container>` với `<mat-sidenav>` (sidebar) + `<mat-toolbar>` (header) + `<router-outlet>`
- Responsive: drawer toggle trên mobile

#### 2.2 Sidebar
- Danh sách menu items với icon + label: Dashboard, Users, Products, Categories, Coupons, Roles, Permissions
- Active route highlighting
- Click navigate

#### 2.3 Header
- Hiển thị tên user + avatar (nếu có)
- Nút logout

### Phase 3: Auth Pages

#### 3.1 Login Page
- Reactive Form: email + password
- POST `/admin/auth/login` → lưu token + refreshToken + parse JWT user info vào localStorage
- Redirect `/dashboard` nếu thành công
- Hiển thị lỗi từ API response

### Phase 4: Dashboard

#### 4.1 Dashboard Stats
- Card grid hiển thị: Tổng Users, Tổng Products, Tổng Categories, Tổng Coupons
- Load data từ các list APIs, tính tổng client-side
- Loading state + error handling

### Phase 5: Users CRUD

#### 5.1 Users List
- MatTable (desktop) / MatCard (mobile): username, email, fullName, roles (chips), deletedAt (badge), actions
- Search box filter client-side theo username/email/fullName
- Delete → MatDialog confirm → DELETE API → refresh
- Nút "Thêm mới" navigate `/users/create`

#### 5.2 User Create
- Reactive Form: username, email, password, fullName, roleNames (checkbox multi-select load từ roles API), avatar (file upload + preview)
- POST multipart/form-data → navigate về list

#### 5.3 User Edit
- Load user data → populate form
- PUT multipart/form-data → navigate về list

#### 5.4 User Detail
- Hiển thị thông tin user + roles chips
- Nút edit navigate tới edit form

### Phase 6: Roles CRUD

#### 6.1 Roles List
- MatTable: id, name, permissionCount, actions

#### 6.2 Role Create/Edit
- Reactive Form: name, permissionNames (checkbox multi-select từ permissions API)
- POST/PUT JSON body

#### 6.3 Role Detail
- Hiển thị thông tin + danh sách permissions

### Phase 7: Permissions CRUD

#### 7.1 Permissions List
- MatTable: id, name, description, actions

#### 7.2 Permission Create/Edit
- Reactive Form: name, description
- POST/PUT JSON body

### Phase 8: Products CRUD

#### 8.1 Products List
- MatTable: image thumbnail, name, price, quantity, sold, categoryName, actions
- Filter theo category dropdown + search theo name

#### 8.2 Product Create/Edit
- Reactive Form: name, price, quantity, description, image (file upload + preview), categoryId (dropdown load từ categories API)
- POST/PUT multipart/form-data

### Phase 9: Categories CRUD

#### 9.1 Categories List
- MatTable: name, description, actions

#### 9.2 Category Create/Edit
- Reactive Form: name, description

#### 9.3 Category Detail
- GET `/categories/{id}` → hiển thị thông tin + danh sách products (MatTable/Card)

### Phase 10: Coupons CRUD

#### 10.1 Coupons List
- MatTable: code, discount display, usageLimit, usedCount, actions

#### 10.2 Coupon Create/Edit
- Reactive Form: code, discountPercent, discountAmount, usageLimit
- Validation: chỉ được nhập 1 trong 2 discount (mutually exclusive)
- POST/PUT JSON body

### Phase 11: Styling & Polish

- Global styles: font, color palette, spacing
- Component-specific styles cho từng page
- Loading skeletons / spinner
- Toast notifications cho success/error
- Confirm dialog cho delete actions
- Empty states khi list trống
- Responsive adjustments

---

## Cấu trúc thư mục cuối cùng

```
src/
├── app/
│   ├── core/
│   │   ├── models/           # TypeScript interfaces
│   │   ├── utils/            # constants.ts, jwt.helper.ts
│   │   ├── services/         # api.service, auth.service, user.service, role.service, permission.service, product.service, category.service, coupon.service
│   │   ├── interceptors/     # jwt-interceptor
│   │   └── guards/           # admin-guard
│   ├── features/
│   │   ├── admin/
│   │   │   ├── layout/       # admin-layout, header, sidebar
│   │   │   └── pages/        # login, dashboard, users, products, categories, coupons, roles, permissions
│   │   └── client/           # (để trống, phase sau)
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
├── styles.css
└── index.html
```

---

## Các quyết định thiết kế quan trọng

1. **UI Library**: Angular Material 22 — theme Indigo/Pink, global typography + animations
2. **Form strategy**: Reactive Forms với FormBuilder + validators
3. **State management**: Signals (component state) + RxJS (HTTP streams)
4. **Table UI**: Hybrid MatTable desktop / MatCard mobile với `*ngIf` + `*ngFor`
5. **Confirm dialog**: MatDialog cho tất cả delete actions
6. **API response**: Unwrap `result` ở `ApiService` level, error propagate qua RxJS `catchError`
7. **Auth**: JWT trong localStorage, interceptor tự động gắn token + refresh khi 401
8. **Upload ảnh**: `FormData` + `HttpClient`, Angular tự set content-type boundary
9. **CORS dev**: `proxy.conf.json` proxy `/api` → `http://localhost:8080`
10. **Pagination**: Chưa có — backend trả list đầy đủ, client-side search/filter

---

## Rủi ro & giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| CORS block dev API calls | Proxy config cho dev + CORS đã có ở backend |
| JWT parse sai role | Filter `scope` chỉ lấy items bắt đầu bằng `ROLE_`, strip prefix |
| Upload multipart lỗi | Dùng `FormData` + `HttpClient`, không set content-type thủ công |
| Lazy loading Category products | Backend trả `CategoryDetailResponse` với products đã load sẵn |
| Soft delete User | Badge "Đã xóa", disable edit/delete nếu `deletedAt != null` |
| Coupon discount validation | Frontend validate chỉ nhập 1 trong 2, backend cũng validate |
| 401 interceptor race condition | Dùng `refreshTokenSubject` BehaviorSubject để chống concurrent refresh requests |

---

## Validation Plan

1. `ng serve` — dev server localhost:4200
2. Test flow: login → dashboard → CRUD users → CRUD roles → CRUD permissions → CRUD products → CRUD categories → CRUD coupons
3. Test 401 auto-refresh: đợi access token hết hạn, gọi API → thấy auto retry
4. Test file upload: create/edit user với avatar, product với image
5. Test responsive: desktop vs mobile layout
6. `ng build --configuration production` — production build pass

---

## Open Questions

- Backend endpoint `/admin/auth/introspect` có trả thêm thông tin gì không (claims)? → Có thể dùng để validate client-side
- Backend có endpoint search/filter không hay chỉ trả full list? → Hiện tại chỉ có full list
- Permission seeds mặc định khi chạy backend lần đầu là gì? → Cần xác định để hiển thị đúng trong role create/edit
- Backend CORS config cho phép origin localhost:4200 không? → Cần confirm
