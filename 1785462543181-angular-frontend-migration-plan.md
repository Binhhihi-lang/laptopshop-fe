# Kế hoạch phát triển Frontend Angular — Laptopshop (v2)

## Tóm tắt

Frontend Angular 22 (standalone components) thay thế toàn bộ static HTML/Bootstrap/JS trong backend Spring Boot. Giao tiếp qua REST API `/api/v1/**` với response wrapper `{ code, message, result }`.

## Quyết định thiết kế (đã xác nhận với backend)

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
| CORS | Cấu hình ở backend Spring Boot |
| Pagination | Chưa có — backend trả list đầy đủ |

## Backend API (đã xác nhận)

```
Auth:
  POST /api/v1/admin/auth/login     body: { email, password } → { authenticated, token, refreshToken }

Admin:
  GET    /api/v1/admin/roles        → List<RoleResponse { id, name }>
  GET    /api/v1/admin/users        → List<UserResponse>
  GET    /api/v1/admin/users/{id}   → UserResponse
  POST   /api/v1/admin/users        → UserResponse (multipart, có avatar)
  PUT    /api/v1/admin/users/{id}   → UserResponse (multipart, có avatar)
  DELETE /api/v1/admin/users/{id}   → void

  GET    /api/v1/admin/products     → List<ProductResponse>
  GET    /api/v1/admin/products/{id}→ ProductResponse
  POST   /api/v1/admin/products   → ProductResponse (multipart, có image)
  PUT    /api/v1/admin/products/{id} → ProductResponse (multipart)
  DELETE /api/v1/admin/products/{id} → void

  GET    /api/v1/admin/categories   → List<CategoryResponse>
  GET    /api/v1/admin/categories/{id} → CategoryDetailResponse (có products)
  POST   /api/v1/admin/categories  → CategoryResponse
  PUT    /api/v1/admin/categories/{id} → CategoryResponse
  DELETE /api/v1/admin/categories/{id} → void

  GET    /api/v1/admin/coupons      → List<CouponResponse>
  GET    /api/v1/admin/coupons/{id} → CouponResponse
  POST   /api/v1/admin/coupons      → CouponResponse
  PUT    /api/v1/admin/coupons/{id} → CouponResponse
  DELETE /api/v1/admin/coupons/{id} → void

Public (client):
  GET    /api/v1/admin/products     → List<ProductResponse> (public GET)
  GET    /api/v1/admin/categories   → List<CategoryResponse> (public GET)
```

## JWT structure (đã xác nhận backend)

```
Claims:
  sub: fullName (String)
  userId: user ID (Number)
  scope: "ROLE_ADMIN ROLE_STAFF ..." (roles có prefix ROLE_ + permissions, cách nhau bởi space)
  exp: expiration timestamp
  iat: issued-at timestamp
  iss: "laptopsp.com"

buildScope(): thêm "ROLE_" + role.getName() + tất cả permission.getName()
JwtAuthenticationConverter: setAuthorityPrefix(""), authoritiesClaimName("scope")
→ Spring Security parse scope thành authorities tự động

Frontend parse:
  roleNames = scope.split(' ').filter(s => s.startsWith('ROLE_')).map(s => s.replace('ROLE_', ''))
  → ["ADMIN", "STAFF", ...]
```

## Model interfaces

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
│   │   ├── services/        # api.service, auth.service, user.service, product.service, category.service, coupon.service, role.service
│   │   ├── interceptors/    # jwt-interceptor
│   │   ├── guards/          # admin-guard
│   │   └── utils/           # constants.ts (API endpoints, storage keys, JWT helpers)
│   ├── features/
│   │   ├── admin/
│   │   │   ├── layout/      # admin-layout, header, sidebar
│   │   │   └── pages/       # login, dashboard, users, products, categories, coupons, roles
│   │   └── client/
│   │       └── pages/       # home, product-detail, cart
│   ├── app.config.ts        # cập nhật
│   ├── app.routes.ts        # cập nhật
│   └── app.ts               # giữ nguyên
├── environments/
│   ├── environment.ts       # dev
│   └── environment.prod.ts  # prod
├── styles.css
└── index.html
```

## Các bước thực hiện

### Phase 1: Cấu hình & Core layer

1. **Cài đặt Angular Material**
   - `ng add @angular/material`
   - Theme: indigo-pink, bật global typography + animations

2. **Environment files**
   - `src/environments/environment.ts`: `apiUrl: 'http://localhost:8080/api/v1'`
   - `src/environments/environment.prod.ts`: `apiUrl: '<production-url>'`

3. **Proxy config** (dev only)
   - `proxy.conf.json`: proxy `/api` → `http://localhost:8080`
   - Cập nhật `angular.json` serve config

4. **app.config.ts**
   - Thêm `provideHttpClient(withInterceptorsFromDi())`
   - Thêm `HTTP_INTERCEPTORS: [{ provide: HTTP_INTERCEPTORS, useExisting: JwtInterceptor, multi: true }]`

5. **Model interfaces** — tạo tất cả interfaces theo bảng trên

6. **Enums**
   - `UserRole` (ADMIN, STAFF, USER)
   - `ErrorCode` (mã lỗi backend — dùng để mapping message)

7. **utils/constants.ts**
   - `API_ENDPOINTS` object (auth, users, products, categories, coupons, roles)
   - `STORAGE_KEYS` (TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY)
   - `jwtHelper.ts`: `decodeToken()`, `getRolesFromToken()`, `isTokenExpired()`

8. **core/services/api.service.ts**
   - Generic HTTP methods: `get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`
   - Return `Observable<T>` (unwrapped từ ApiResponse)
   - Error handling: bắn ra error để component xử lý

9. **core/interceptors/jwt-interceptor.ts**
   - Gắn `Authorization: Bearer <token>` từ localStorage
   - Response interceptor: unwrap `ApiResponse.result` → trả về `T`
   - Error interceptor: bắt 401 → logout + redirect login; bắt lỗi khác → throw error message

10. **core/services/auth.service.ts**
    - `login(email, password)` → POST `/auth/login` → lưu token + refreshToken + parse JWT để lấy user info → lưu vào localStorage
    - `logout()` → xóa localStorage → redirect login
    - `getToken()`, `getRoles()`, `getUserInfo()` (từ localStorage hoặc parse JWT)
    - `isAuthenticated()` → kiểm tra token tồn tại + không hết hạn
    - `hasRole(role)` → kiểm tra role trong token

11. **core/guards/admin-guard.ts**
    - Kiểm tra `authService.isAuthenticated()`
    - Nếu không auth → redirect `/login`
    - Nếu có `data.roles` → kiểm tra user có role đó không
    - Return `boolean | RedirectCommand`

### Phase 2: Routing & Auth flow

12. **app.routes.ts**
    ```
    { path: 'login', component: LoginComponent }
    { path: '', component: AdminLayoutComponent, canActivate: [adminGuard], children: [
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
    ]}
    { path: '', component: HomeComponent }  // client
    { path: 'product/:id', component: ProductDetailComponent }
    { path: 'cart', component: CartComponent }
    { path: '**', redirectTo: '' }
    ```

13. **Admin layout**
    - `admin-layout.ts`: `<mat-sidenav-container>` + `<mat-sidenav>` (sidebar) + `<mat-toolbar>` (header) + `<router-outlet>`
    - `header.ts`: Toolbar với tên user, avatar, nút logout
    - `sidebar.ts`: List `<a mat-list-item>` navigate tới từng page

14. **Login page**
    - Reactive Form: email + password
    - POST `/auth/login` → lưu token + parse JWT → redirect `/admin/dashboard`
    - Hiển thị lỗi từ ApiResponse.message

### Phase 3: Admin pages — Users

15. **Users list** (`users.ts`)
    - Signal `users = signal<UserResponse[]>()`
    - Load data trong `ngOnInit` hoặc `effect`
    - MatTable (desktop) / MatCard (mobile) — dùng `NgIf` + `NgForOf`
    - Cột: username, email, fullName, roles (chips), deletedAt (badge "Đã xóa"), actions
    - Search box filter client-side
    - Delete → MatDialog confirm → DELETE → refresh

16. **User create form** (`user-create.ts`)
    - Reactive Form: username, email, password, fullName, roleNames (checkbox multi-select)
    - Load roles từ `roleService.getAll()`
    - multipart/form-data (có avatar)
    - POST → navigate về list

17. **User edit form** (`user-edit.ts`)
    - Load user data từ `userById(id)`
    - Populate form với existing values
    - PUT → navigate về list

18. **User detail** (`user-detail.ts`)
    - GET `/users/{id}` → hiển thị thông tin + roles (chips)
    - Nút edit → navigate tới edit form

### Phase 4: Admin pages — Products

19. **Products list**
    - MatTable: image (thumbnail), name, price, quantity, sold, category, actions
    - Filter theo category dropdown + search theo name

20. **Product create/edit form**
    - Reactive Form: name, price, quantity, description, image (file upload + preview), categoryId (dropdown)
    - Load categories từ `categoryService.getAll()`
    - multipart/form-data

### Phase 5: Admin pages — Categories

21. **Categories list**
    - MatTable: name, description, productCount (tính từ CategoryDetailResponse hoặc từ response list)

22. **Category create/edit form**
    - Reactive Form: name, description (đơn giản, không có ảnh)

23. **Category detail**
    - GET `/categories/{id}` → hiển thị thông tin + danh sách products (MatTable/Card)

### Phase 6: Admin pages — Coupons

24. **Coupons list**
    - MatTable: code, discountPercent/amount, usageLimit, usedCount, actions

25. **Coupon create/edit form**
    - Reactive Form: code, discountPercent, discountAmount, usageLimit
    - Validation: chỉ được nhập 1 trong 2 discount (mutually exclusive)
    - JSON body (không có ảnh)

### Phase 7: Admin pages — Roles & Dashboard

26. **Roles list**
    - MatTable: id, name

27. **Dashboard**
    - Card thống kê: tổng user, tổng product, tổng category, tổng coupon
    - (Backend chưa có endpoint thống kê → tính từ list APIs)

### Phase 8: Client pages

28. **Home page**
    - GET `/products` (public) → hiển thị product cards
    - Mỗi card: image, name, price, category → click → `/product/:id`

29. **Product detail page**
    - GET `/products/{id}` → hiển thị chi tiết
    - Nút "Thêm vào giỏ hàng" → lưu vào localStorage

30. **Cart page**
    - Lấy cart từ localStorage
    - Hiển thị danh sách sản phẩm, số lượng, tổng cộng
    - Nút checkout (gọi API nếu có)

### Phase 9: Services

31. **Service implementations**:
    - `role.service.ts`: `getAll()` → GET `/admin/roles`
    - `user.service.ts`: `getAll()`, `getById(id)`, `create(req)`, `update(id, req)`, `delete(id)`
    - `product.service.ts`: `getAll()`, `getById(id)`, `create(req)`, `update(id, req)`, `delete(id)`
    - `category.service.ts`: `getAll()`, `getDetail(id)`, `create(req)`, `update(id, req)`, `delete(id)`
    - `coupon.service.ts`: `getAll()`, `getById(id)`, `create(req)`, `update(id, req)`, `delete(id)`

### Phase 10: Testing

32. **Unit tests** (Vitest):
    - `jwt-interceptor.spec.ts`: unwrap response, attach token, 401 logout
    - `auth.service.spec.ts`: login flow, token parsing, role extraction
    - `admin-guard.spec.ts`: auth check, role check
    - Component specs: form validation, API call mocking

## Rủi ro & giải pháp

| Rủi ro | Giải pháp |
|---|---|
| CORS block dev API calls | Cấu hình backend CORS + proxy.conf.json cho dev |
| JWT parse sai role | Filter `scope` chỉ lấy items bắt đầu bằng `ROLE_`, strip prefix |
| Upload multipart lỗi | Dùng `FormData` + `HttpClient` (Angular tự set content-type) |
| Category detail có products lazy load | Backend trả `CategoryDetailResponse` với products đã load |
| Soft delete User | Hiển thị badge "Đã xóa" dựa trên `deletedAt != null`, disable edit/delete nếu đã xóa |
| Coupon discount validation | Frontend validate: chỉ được nhập 1 trong 2, đồng thời với backend |

## Validation plan

1. `ng serve` — dev server localhost:4200
2. Test flow: login → dashboard → CRUD users → CRUD products → CRUD categories → CRUD coupons → roles
3. `npm test` — Vitest unit tests
4. `ng build --configuration production` — production build

## Open questions (để implement giải quyết)

- RoleResponse có trường gì ngoài id, name? (giả định: chỉ có id + name)
- Category list response có chứa productCount không? (nếu không, tính từ detail hoặc bỏ cột)
- Dashboard có endpoint thống kê riêng không? (giả định: không, tính từ list APIs)
- Product có trường nào khác image URL không? (giả định: đủ các trường trong model)