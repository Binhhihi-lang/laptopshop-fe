# Kế hoạch Triển khai Frontend Angular — Laptopshop

## Mục tiêu
Xây dựng ứng dụng frontend Angular 22 (standalone components) thay thế toàn bộ giao diện hiện tại, bao gồm:
- Giao diện Admin đầy đủ với CRUD cho Users, Roles, Permissions, Products, Categories, Coupons
- Trang Dashboard hiển thị thống kê
- Giao diện Client (Home, Product Detail, Cart) cho khách hàng
- Kết nối với backend Spring Boot qua REST API `/api/v1/**`

## Quyết định thiết kế (Tổng hợp từ cả hai kế hoạch)

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
| POST | `/admin/auth/login` | `{ email, password }` | `{ authenticated, token, refreshToken }` |
| POST | `/admin/auth/introspect` | `{ token }` | `{ authenticated }` |
| POST | `/admin/auth/logout` | `{ token }` | `void` |
| POST | `/admin/auth/refresh` | `{ token }` | `{ authenticated, token, refreshToken }` |

### Users
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/users` | — | `UserResponse[]` |
| GET | `/admin/users/{id}` | — | `UserResponse` |
| POST | `/admin/users` | `multipart/form-data` | `UserResponse` |
| PUT | `/admin/users/{id}` | `multipart/form-data` | `UserResponse` |
| DELETE | `/admin/users/{id}` | — | `void` |

`UserResponse = { id, username, email, fullName, roleNames: string[], deletedAt: string \| null }`
`UserCreationRequest = { username, email, password, fullName, roleNames: string[], avatar?: File }`
`UserUpdateRequest = Omit<UserCreationRequest, 'password'> & { id: number, password?: string }`

### Roles
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/roles` | — | `RoleResponse[]` |
| GET | `/admin/roles/{id}` | — | `RoleResponse` |
| POST | `/admin/roles` | `{ name, permissionNames: string[] }` | `RoleResponse` |
| PUT | `/admin/roles/{id}` | `{ name, permissionNames: string[] }` | `RoleResponse` |
| DELETE | `/admin/roles/{id}` | — | `void` |

`RoleResponse = { id, name, permissionNames: string[] }`

### Permissions
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/admin/permissions` | — | `PermissionResponse[]` |
| GET | `/admin/permissions/{id}` | — | `PermissionResponse` |
| POST | `/admin/permissions` | `{ name, description }` | `PermissionResponse` |
| PUT | `/admin/permissions/{id}` | `{ name, description }` | `PermissionResponse` |
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

`CouponResponse = { id, code, discountPercent: number \| null, discountAmount: number \| null, usageLimit, usedCount }`

### Public (Client) APIs
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/v1/products` | `ProductResponse[]` |
| GET | `/api/v1/products/{id}` | `ProductResponse` |
| GET | `/api/v1/categories` | `CategoryResponse[]` |

## JWT Token Structure
Claims:
- `sub`: fullName
- `userId`: number
- `scope`: space-separated roles với `ROLE_` prefix (ví dụ: `"ROLE_ADMIN ROLE_STAFF"`)
- `permissions`: space-separated permission names không có prefix (ví dụ: `"user:read user:write"`)
- `exp`, `iat`, `iss`

Frontend parsing:
- `roleNames = scope.split(' ').filter(s => s.startsWith('ROLE_')).map(s => s.replace('ROLE_', ''))`
- `permissions = permissions.split(' ').filter(Boolean)`

## API Response Wrapper
Tất cả responses được bao bọc: `ApiResponse<T> = { code: number, message: string, result: T }`
Errors được trả về dưới dạng HTTP error responses (4xx/5xx) — interceptor sẽ unwrap `result` từ successful responses.

## Model interfaces (TypeScript)

```typescript
// core/models/api-response.model.ts
export interface ApiResponse<T> { code: number; message: string; result: T; }

// core/models/auth.model.ts
export interface AuthenticationRequest { email: string; password: string; }
export interface AuthenticationResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

// core/models/user.model.ts
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleNames: string[];
  deletedAt: string | null;
}
export interface UserCreationRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleNames: string[];
  avatar?: File | null;
}
export interface UserUpdateRequest extends Omit<UserCreationRequest, 'password'> {
  id: number;
  password?: string;
}

// core/models/role.model.ts
export interface Role { id: number; name: string; }

// core/models/product.model.ts
export interface ProductResponse {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description: string;
  image: string;        // Cloudinary URL string
  sold: number;
  categoryId: number;
  categoryName: string;
}
export interface ProductCreationRequest {
  name: string;
  price: number;
  quantity: number;
  description: string;
  image?: File | null;
  categoryId: number;
}

// core/models/category.model.ts
export interface CategoryResponse { id: number; name: string; description: string; }
export interface CategoryDetailResponse extends CategoryResponse {
  products: ProductResponse[];
}

// core/models/coupon.model.ts
export interface CouponResponse {
  id: number;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  usageLimit: number;
  usedCount: number;
}
export interface CouponCreationRequest {
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  usageLimit: number;
}
```

## Cấu trúc thư mục

```
src/
├── app/
│   ├── core/
│   │   ├── models/          # TypeScript interfaces
│   │   ├── enums/           # UserRole, OrderStatus
│   │   ├── services/        # api.service, auth.service, user.service, product.service, category.service, coupon.service, role.service, permission.service
│   │   ├── interceptors/    # jwt-interceptor
│   │   ├── guards/          # admin-guard
│   │   └── utils/           # constants.ts (API endpoints, storage keys, JWT helpers)
│   ├── features/
│   │   ├── admin/
│   │   │   ├── layout/      # admin-layout, header, sidebar
│   │   │   └── pages/       # login, dashboard, users, products, categories, coupons, roles, permissions
│   │   └── client/
│   │       ├── pages/       # home, product-detail, cart
│   │       └── components/  # shared client components (product-card, etc.)
│   ├── app.config.ts        # cập nhật
│   ├── app.routes.ts        # cập nhật
│   └── app.ts               # giữ nguyên
├── environments/
│   ├── environment.ts       # dev
│   └── environment.prod.ts  # prod
├── styles.css
└── index.html
```

## Các bước Triển khai

### Phase 1: Cấu hình & Core Infrastructure

1. **Cài đặt Angular Material**
   - `ng add @angular/material`
   - Chọn theme Indigo/Pink, bật global typography + animations

2. **Environment files**
   - `src/environments/environment.ts`: `apiUrl: 'http://localhost:8080/api/v1'`
   - `src/environments/environment.prod.ts`: `apiUrl: '<production-url>'`

3. **Proxy config** (dev only)
   - Tạo `proxy.conf.json`: 
     ```json
     {
       "/api": {
         "target": "http://localhost:8080",
         "secure": false,
         "changeOrigin": true
       }
     }
     ```
   - Cập nhật `angular.json` serve config

4. **app.config.ts**
   - Thêm `provideHttpClient(withInterceptorsFromDi())`
   - Thêm `HTTP_INTERCEPTORS: [{ provide: HTTP_INTERCEPTORS, useExisting: JwtInterceptor, multi: true }]`

5. **Models & Interfaces**
   - Tất cả interfaces trong `src/app/core/models/` dựa trên API Reference ở trên

6. **Utils**
   - `src/app/core/utils/constants.ts`: `API_ENDPOINTS` object và `STORAGE_KEYS`
   - `src/app/core/utils/jwt.helper.ts`: `decodeToken()`, `getRolesFromToken()`, `getPermissionsFromToken()`, `isTokenExpired()`

7. **Core Services**
   - **`api.service.ts`**: Generic HTTP methods (`get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`, `upload()`), unwrap `ApiResponse.result`, error handling
   - **`auth.service.ts`**: `login()`, `logout()`, `getToken()`, `getRefreshToken()`, `getUserInfo()`, `isAuthenticated()`, `hasRole()`, `hasPermission()`, `refreshToken()`
   - **Module services**: `user.service.ts`, `role.service.ts`, `permission.service.ts`, `product.service.ts`, `category.service.ts`, `coupon.service.ts` sử dụng `ApiService`

8. **Interceptors**
   - **`jwt-interceptor.ts`**: 
     - Request: gắn `Authorization: Bearer <token>` từ localStorage
     - Response: unwrap `ApiResponse.result` → trả về `T`
     - Error: bắt 401 → gọi `authService.refreshToken()` → retry request gốc; nếu refresh fail → logout + redirect `/login`

9. **Guards**
   - **`admin-guard.ts`**: Kiểm tra `authService.isAuthenticated()`, nếu không auth → redirect `/login`. Hỗ trợ `data.roles` và `data.permissions` để check quyền chi tiết
   - **`auth-guard.ts`** (for client pages): Cho phép chỉ khi chưa auth (tránh truy cập client pages khi đã login)

10. **Routing** (`app.routes.ts`)
    ```typescript
    // Auth routes
    { path: 'login', component: LoginComponent },
    
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
    
    // Wildcard
    { path: '**', redirectTo: '' }
    ```

### Phase 2: Admin Layout & Auth

11. **Admin Layout**
    - `AdminLayoutComponent`: `<mat-sidenav-container>` với `<mat-sidenav>` (sidebar) + `<mat-toolbar>` (header) + `<router-outlet>`
    - Responsive: drawer toggle trên mobile
    - Persistent sidebar trạng thái (open/close) trong localStorage

12. **Sidebar**
    - Menu items: Dashboard, Users, Products, Categories, Coupons, Roles, Permissions
    - Icon + label, active route highlighting
    - Click navigate

13. **Header**
    - Toolbar hiển thị tên user + avatar (nếu có)
    - Nút logout với confirmation dialog

14. **Login Page**
    - Reactive Form: email + password
    - POST `/admin/auth/login` → lưu token + refreshToken + parse JWT → lưu userInfo
    - Nếuформ JWT → lưu user info vào localStorage
    - Redirect `/admin/dashboard` nếu thành công
    - Hiển thị lỗi từ API response
    - "Remember me" toggle (tuỳ chọn)

### Phase 3: Dashboard

15. **Dashboard Page**
    - Stats cards hiển thị: Tổng Users, Tổng Products, Tổng Categories, Tổng Coupons
    - Load data từ các list APIs (`/admin/users`, `/admin/products`, `/admin/categories`, `/admin/coupons`)
    - Tính tổng client-side (nhẹ vì backend trả list đầy đủ hiện tại)
    - Loading state + error handling
    - Layout responsive (grid trên desktop, stack на mobile)

### Phase 4: Users CRUD

16. **Users List**
    - MatTable (desktop) / MatCard (mobile)
    - Các cột: username, email, fullName, roles (chips), deletedAt (badge "Đã xóa"), actions
    - Search box filter client-side theo username/email/fullName
    - Delete → MatDialog confirm → DELETE API → refresh
    - Nút "Thêm mới" navigate `/admin/users/create`

17. **User Create Form**
    - Reactive Form: username, email, password, fullName, roleNames (checkbox multi-select load từ roles API), avatar (file upload + preview
    - File upload: types, max 
    - POST multipart/form-data → nếu thành công navigate về list

18. **User Edit Form**
    - Load user data từ `userService.getById(id)`
    - Pre-populate form với existing values
    - PUT multipart/form-data → navigate về list

19. **User Detail**
    - Hiển thị thông tin user đầy đủ + roles chips
    - Nút edit → navigate tới edit form
    - Nút delete → confirm → DELETE API

### Phase 5: Roles & Permissions CRUD

20. **Roles List**
    - MatTable: id, name, permission count (tính từ permissionNames.length), actions
    - Delete → confirm → DELETE API

21. **Role Create/Edit Form**
    - Reactive Form: name, permissionNames (checkbox multi-select load từ permissions API)
    - POST/PUT JSON body
    - Validation: name required

22. **Permissions List**
    - MatTable: id, name, description, actions

23. **Permission Create/Edit Form**
    - Reactive Form: name, description
    - POST/PUT JSON body
    - Validation: name required, description optional

### Phase 6: Products CRUD

24. **Products List**
    - MatTable: image (thumbnail), name, price, quantity, sold, categoryName, actions
    - Filter: category dropdown (load từ categories API) + search theo name
    - Delete → confirm → DELETE API

25. **Product Create/Edit Form**
    - Reactive Form: name, price (≥ 0), quantity (≥ 0), description, image upload + preview, categoryId (dropdown từ categories API)
    - POST/PUT multipart/form-data

### Phase 7: Categories CRUD

26. **Categories List**
    - MatTable: name, description, actions

27. **Category Create/Edit Form**
    - Reactive Form: name, description
    - POST/PUT JSON body

28. **Category Detail**
    - GET `/admin/categories/{id}` → hiển thị thông tin category + danh sách sản phẩm (MatTable hoặc MatCard)
    - Load kèm products từ API (backend đã trả sẵn trong CategoryDetailResponse)

### Phase 8: Coupons CRUD

29. **Coupons List**
    - MatTable: code, discount display (hiển thị percent hoặc amount), usageLimit, usedCount, actions
    - Delete → confirm → DELETE API

30. **Coupon Create/Edit Form**
    - Reactive Form: code, discountPercent, discountAmount, usageLimit
    - Validation: code required, chỉ được nhập 1 trong 2 discount fields (mutually exclusive)
    - POST/PUT JSON body

### Phase 9: Client Pages

31. **Home Page**
    - Hero banner (tuỳ chọn)
    - Product grid: hiển thị sản phẩm từ `/api/v1/products` (public endpoint)
    - Mỗi product card: hình ảnh, tên, giá, category, nút "Xem chi tiết", nút "Thêm vào giỏ"
    - Responsive grid (2-3-4 cột tùy màn hình)

32. **Product Detail Page**
    - Hiển thị chi tiết sản phẩm từ `/api/v1/products/{id}`
    - Layout: hình ảnh lớn bên trái, thông tin bên phải
    - Các trường: tên, giá, số lượng tồn, mô tả, category, hình ảnh
    - Nút "Thêm vào giỏ hàng"

33. **Cart Page**
    - Lấy cart từ localStorage (format: array of `{ productId, quantity }`)
    - Hiển thị danh sách sản phẩm trong giỏ, số lượng, tổng cộng
    - Các thao tác: tăng/giảm số lượng, xóa sản phẩm
    - Nút "Thanh toán" (chuyển tới trang hoàn thành nếu có API, hoặc chỉ show thông báo)

### Phase 10: Styling & Polish

34. **Global Styles**
    - `styles.css`: font cơ sở, biến màu từ Angular Material theme
    - Tùy chỉnh theme Angular Material (nếu cần)

35. **Component-level Styles**
    - Mỗi component có file `.scss` riêng cho styles cụ thể
    - Sử dụng `::ng-deep` khi cần sửa styles của Angular Material components (hạn chế)

36. **Loading States & Feedback**
    - Skeleton loaders cho tables/cards khi đang tải dữ liệu
    - Spinner buttons khi đang submit form
    - Toast notifications (MatSnackBar) cho success/error messages
    - MatDialog cho confirm actions (delete, etc.)

37. **Empty States**
    - Hiển thị thông báo友善 khi list trống (ví dụ: "Chưa có sản phẩm nào")
    - Kèm nút hành động (ví dụ: "Thêm sản phẩm đầu tiên")

38. **Responsive Adjustments**
    - Sử dụng Angular Flex-Layout hoặc các breakpoint helper của Angular Material
    - Sidebar collapse xem dưới 768px
    - Table chuyển sang card view trên mobile

### Phase 11: Testing

39. **Unit Tests** (Vitest hoặc Jest + Angular Testing Library)
    - Services: mock HttpClient, test request/response handling
    - Components: test form validation, UI interactions, API call mocking
    - Guards: test auth/permission logic
    - Interceptors: test token attach, 401 handling, response unwrapping

40. **End-to-End Tests** (Cypress - đề xuất)
    - Test luồng: login → dashboard → CRUD từng module → client pages
    - Test lỗi
    - Test 401 auto-refresh: đặt access token hết hạn thủ công, gọi API quan sát auto retry

### Phase 12: Build & Deploy

41. **Production Build**
    - `ng build --configuration production`
    - Kiểm tra bundle size, tối ưu nếu cần (lazy loading, code splitting)
   
    - Output tới thư mục `dist/`
    - Có thể phục vụ qua NGINX/Apache hoặc tích hợp với backend Spring Boot 

42. **Production Config**
    - Cập nhật `environment.prod.ts` với URLs production
    - Kiểm tra CORS config ở backend cho domain production

## Cấu trúc thư mục cuối cùng

```
src/
├── app/
│   ├── core/
│   │   ├── models/           # TypeScript interfaces
│   │   ├── utils/            # constants.ts, jwt.helper.ts
│   │   ├── services/         # api.service, auth.service, user.service, role.service, permission.service, product.service, category.service, coupon.service
│   │   ├── interceptors/     # jwt-interceptor
│   │   └── guards/           # admin-guard, auth-guard
│   ├── features/
│   │   ├── admin/
│   │   │   ├── layout/       # admin-layout, header, sidebar
│   │   │   └── pages/        # login, dashboard, users, products, categories, coupons, roles, permissions
│   │   └── client/
│   │       ├── pages/        # home, product-detail, cart
│   │       └── components/   # product-card, etc.
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.ts
├── environments/
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
├── styles.css
└── index.html
```

## Quyết định thiết kế quan trọng

1. **UI Library**: Angular Material 22 — theme Indigo/Pink, global typography + animations
2. **Form strategy**: Reactive Forms với FormBuilder + validators
3. **State management**: Signals (component state) + RxJS (HTTP streams)
4. **Table UI**: Hybrid MatTable desktop / MatCard mobile với `*ngIf` + `*ngFor`
5. **Confirm dialog**: MatDialog cho tất cả delete actions
6. **API response**: Unwrap `result` ở `ApiService` level, error propagate qua RxJS `catchError`
7. **Auth**: JWT trong localStorage, interceptor tự động gắn token + refresh khi 401
8. **Upload ảnh**: `FormData` + `HttpClient`, Angular tự set content-type boundary
9. **CORS dev**: `proxy.conf.json` proxy `/api` → `http://localhost:8080`
10. **Standalone components**: Tất cả components là standalone (không cần NgModule)
11. **Lazy loading**: Feature modules (admin, client) lazy-loaded qua routes

## Rủi ro & giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| CORS block dev API calls | Proxy config cho dev + CORS đã có ở backend |
| JWT parse sai role | Filter `scope` chỉ lấy items bắt đầu bằng `ROLE_`, strip prefix |
| Upload multipart lỗi | Dùng `FormData` + `HttpClient`, không set content-type thủ công |
| Lazy loading Category products | Backend trả `CategoryDetailResponse` với products đã load sẵn |
| Soft delete User | Hiển thị badge "Đã xóa" dựa trên `deletedAt != null`, disable edit/delete nếu đã xóa |
| Coupon discount validation | Frontend validate: chỉ được nhập 1 trong 2, đồng thời với backend validate |
| 401 interceptor race condition | Dùng `refreshTokenSubject` BehaviorSubject để chống concurrent refresh requests |
| Bundle size quá lớn | Lazy loading feature modules, sử dụng `trackBy` trong ngFor, tối ưu images |
| Phiên bản không đồng bộ giữa dev và prod | Lock versions trong package.json, sử dụng CI/CD pipeline để kiểm tra |

## Kế hoạch Kiểm thử (Validation Plan)

1. **Dev Server**
   - Chạy `ng serve` —確 到 http://localhost:4200
   - Kiểm tra proxy hoạt động: Network tab thấy request tới `/api/v1/*` được forward

2. **Test Luồng Chính**
   - Login với credentials hợp lệ → redirect `/admin/dashboard`
   - Dashboard hiển thị stats chính xác
   - CRUD Users: tạo → sửa → xóa (kèm confirm dialog)
   - CRUD Products: tạo (có upload ảnh) → sửa → xóa
   - CRUD Categories: tạo → xem detail (có products) → sửa → xóa
   - CRUD Coupons: tạo có discount percent/amount → sửa → xóa
   - CRUD Roles/Permissions: tạo → ghi quyền → thấy đúng trong role create/edit
   - Client pages: xem home → click sản phẩm vào detail → thêm vào giỏ → xem giỏ

3. **Test Tính Năng Bảo mật**
   - Truy cập trực tiếp `/admin/*` mà không login → được redirect login
   - Token hết hạn → API tự động refresh → không bị断开連接
   - Sai credentials → hiện lỗi login
   - Truy cập trang falta permission → được vẫn ở trang hiện tại hoặc redirect tùy cài đặt guard

4. **Test File Upload**
   - Tạo user có avatar → thấy hình trong user detail/list
   - Tạo product có image → thấy thumbnail trong product list
   - Kiểm tra dung lượng/file type giới hạn (nếu có)

5. **Test Responsive**
   - Desktop (≥ 1024px): sidebar mở, table hiển thị đầy đủ
   - Tablet (768-1023px): sidebar có thể collapse, tableswitch sang card view
   - Mobile (< 768px): sidebar collapse hoàn toàn, chỉ hiển thị icon menu, card view

6. **Test Tối ưu Hiệu suất**
   - Kiểm tra Network tab: không có request lạ, caching hoạt động (nếu được cấu hình)
   - Kiểm tra Lighthouse: performance score > 80 (dev), > 90 (production build)
  
    - CT producción: `ng build --configuration production` — 成功 후 배포 및 서버 테스트

7. **Код тесты**
    - `npm test` — Витest/Жест unit тесты проходят
    - Тестировать сервисы, компоненты, гварды, интерцепторы

## Вопросы, требующие уточнения (перед реализацией)

- Точный формат ответа для списков с пагинацией (если бекенд планирует добавить его позже)
+ Наличие у бекенда расширенных endpoints для поиска/фильтрации (сейчас возвращает полные списки)+
- Точная структура объектов ролей и разрешений в JWT (нужно ли учитывать префиксы и т.д.)
- Наличие эндпоинтов для сброса пароля и подтверждения email (можно добавить позже как отдельную feature)
- Конкретные лимиты на загрузку файлов (размер, типы) со стороны бекенда
- Нужно ли реализовать всплывающие уведомления (toast) или достаточно диалогов и инлайновых сообщений

## Оценка трудоёмкости

| Этап | Оценка (дни) |
|------|--------------|
| Фейз 1: Конфигурация и Core Infrastructure | 4 |
| Фейз 2: Админ-макет и Аутентификация | 3 |
| Фейз 3: Дашборд | 2 |
| Фейз 4: CRUD Пользователи | 5 |
| Фейз 5: CRUD Роли и Разрешения | 4 |
| Фейз 6: CRUD Товары | 5 |
| Фейз 7: CRUD Категории | 3 |
| Фейз 8: CRUD Купоны | 3 |
| Фейз 9: Клиентские страницы | 4 |
| Фейз 10: Стили и Полировка | 3 |
| Фейз 11: Тестирование | 4 |
| Фейз 12: Сборка и Развертывание | 2 |
| **Итого** | **42 рабочих дня** (≈ 8 недель) для одного разработчика |
| | Можно ускорить до 4-5 недель при параллельной работе двух разработчиков (фронтенд и бекенд интеграция) |

*Примечание: Оценки приблизительные и могут варьироваться в зависимости от опыта команды и конкретных требований бекенда.*