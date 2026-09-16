# Hướng dẫn Shared Components — LaptopShop Admin

> **Mục đích**: Tài liệu này giúp bạn **tự chỉnh sửa** các trang Admin (trang **Users** và **User Form**) mà **không cần** sự trợ giúp của Claude. Nó giải thích đầy đủ 14 shared components đang dùng trong `src/app/shared/components/`, 3 cơ chế ghép nối quan trọng, 2 case study thực tế, và bộ công thức (cookbook) sửa đổi kèm ví dụ trước/sau.

---

## Mục lục

1. [Giới thiệu & điều kiện tiên quyết](#1-giới-thiệu--điều-kiện-tiên-quyết)
2. [Bảng tra cứu nhanh 14 components](#2-bảng-tra-cứu-nhanh-14-components)
3. [Coding standards ("style rules")](#3-coding-standards-style-rules)
4. [Chi tiết từng component](#4-chi-tiết-từng-component)
5. [Cơ chế A — Custom column template của bảng](#5-cơ-chế-a--custom-column-template-của-bảng)
6. [Cơ chế B — Form-field wrapping](#6-cơ-chế-b--form-field-wrapping)
7. [Cơ chế C — Table actions kebab menu](#7-cơ-chế-c--table-actions-kebab-menu)
8. [Case study 1 — Trang Users (danh sách)](#8-case-study-1--trang-users-danh-sách)
9. [Case study 2 — Trang User Form](#9-case-study-2--trang-user-form)
10. [Cookbook — Các thao tác sửa đổi thường gặp](#10-cookbook--các-thao-tác-sửa-đổi-thường-gặp)
11. [Checklist tự sửa đổi (8 mục)](#11-checklist-tự-sửa-đổi-8-mục)
12. [Xác minh `ng build` (0 lỗi) + các lỗi thường gặp](#12-xác-minh-ng-build-0-lỗi--các-lỗi-thường-gặp)

---

## 1. Giới thiệu & điều kiện tiên quyết

### 1.1 Tổng quan kiến trúc

Frontend `laptopshop-fe/` là một dự án **Angular 22** (TypeScript, Signals, Material UI, Tailwind CSS). Các trang Admin được xây dựng từ **shared components** nằm trong thư mục:

```
laptopshop-fe/src/app/shared/components/
```

Mỗi shared component là một **standalone component** (`standalone: true`) dùng **signal inputs/outputs** (`input()`, `output()`) — **không** dùng decorator `@Input()` / `@Output()` (trừ một file "chết" cũ sẽ được cảnh báo ở §4.10).

### 1.2 Path aliases (tsconfig.json)

Khai báo trong `laptopshop-fe/tsconfig.json` → mục `compilerOptions.paths`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@core/*": ["./src/app/core/*"],
      "@shared/*": ["./src/app/shared/*"],
      "@features/*": ["./src/app/features/*"],
      "@environments/*": ["./src/environments/*"]
    }
  }
}
```

**Khi import trong code, bạn luôn dùng các alias này**, không dùng đường dẫn tương đối dài.

### 1.3 Thông tin môi trường (package.json)

| Phụ thuộc | Phiên bản |
|---|---|
| `@angular/core` | ^22.0.0 |
| `@angular/material` | ^22.1.0 |
| `@angular/cli` | ^22.0.0 (dựng `ng build`, `ng serve`) |
| `typescript` | ~6.0.2 |
| `rxjs` | ~7.8.0 |
| `zone.js` | ^0.16.2 |
| `tailwindcss` | ^3.4.19 |
| `vitest` | ^4.0.8 |

### 1.4 Các lệnh làm việc

```bash
# Chạy dev server
ng serve                # → http://localhost:4200/

# Build production (kiểm tra lỗi trước khi bàn giao)
ng build

# Chạy unit test
ng test
```

> **Quan trọng**: Theo quy trình project, sau khi sửa code bạn **bắt buộc phải chạy `ng build`** và đạt **0 lỗi** mới được coi là hoàn thành (xem §12). Có proxy `proxy.conf.json` forward `/api` về backend `localhost:8080` khi dev.

---

## 2. Bảng tra cứu nhanh 14 components

| # | Selector | Class | File nguồn | Inputs chính | Outputs | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | `app-button` | `ButtonComponent` | `button/button.component.ts` | `label`, `variant`, `size`, `type`, `disabled`, `loading`, `icon`, `iconOnly`, `ariaLabel` | — | 6 variants, 4 sizes |
| 2 | `app-input` | `InputComponent` | `input/input.component.ts` | `id`*, `type`, `value`, `error`, `hint`, `showPasswordToggle`, `passwordVisible` | `valueChange`, `blurEvent`, `focusEvent`, `passwordToggle` | CVA — 8 input types |
| 3 | `app-select` | `SelectComponent` | `select/select.component.ts` | `id`*, `options`*, `multiple`, `error`, `hint`, `icon` | `valueChange`, `blurEvent`, `focusEvent` | CVA — dropdown đơn/đa |
| 4 | `app-form-field` | `FormFieldComponent` | `form-field/form-field.component.ts` | `id`*, `label`, `required`, `error`, `hint`, `horizontal` | — | Bọc ngoài input/select, `id` phải trùng |
| 5 | `app-card` | `CardComponent` | `card/card.component.ts` | `variant`, `padding`, `border`, `shadow`, `compact` | — | Có header/footer qua content projection |
| 6 | `app-card-header` | `CardHeaderComponent` | `card/card.component.ts` | `title`, `subtitle`, `icon` | — | Đi kèm Card |
| 7 | `app-card-footer` | `CardFooterComponent` | `card/card.component.ts` | — | — | Đi kèm Card |
| 8 | `app-badge` | `BadgeComponent` | `badge/badge.component.ts` | `label`*, `variant`, `icon`, `size`, `dot` | — | ⚠️ `dot` không render |
| 9 | `app-table` | `TableComponent` | `table/table.component.ts` | `data`*, `columns`*, `actions`, `loading`, `selectable`, `density`, `empty*` | `selectionChange`, `sortChange`, `rowClick`, `prevPage`, `nextPage`, `emptyActionClick` | Generic `<T>` |
| 10 | `app-loading` | `LoadingComponent` | `loading/loading.component.ts` | `type`, `size`, `color`, `text`, `width`, `height`, `borderRadius` | — | 4 kiểu, 4 cỡ |
| 11 | `app-empty-state` | `EmptyStateComponent` | `empty-state/empty-state.component.ts` | `icon`, `title`, `description`, `actionLabel`, `actionIcon`, `actionVariant`, `variant` | `actionClick` | 4 variants |
| 12 | `app-page-header` | `PageHeaderComponent` | `page-header/page-header.component.ts` | `title`*, `subtitle`, `hasActions` | — | ⚠️ Có file legacy trùng selector |
| 13 | `app-avatar` | `AvatarComponent` | `avatar/avatar.component.ts` | `src`, `alt`, `initials`, `size`, `shape`, `shadow` | — | Tự xử lý loading/error |
| 14 | `app-info-item` | `InfoItemComponent` | `info-item/info-item.component.ts` | `label`*, `value`, `icon`, `mono`, `format`, `emptyText` | — | Format số/tiền VND |
| 15 | `app-stat-card` | `StatCardComponent` | `stat-card/stat-card.component.ts` | `label`*, `value`*, `icon`, `iconClass`, `trendUp`, `trendText` | — | Thẻ KPI Dashboard (dùng ở dashboard) |
| 16 | `app-notification-bell` | `NotificationBellComponent` | `notification-bell/notification-bell.component.ts` | — | — | Chuông thông báo + dropdown, data từ `UserNotificationService` |
| 17 | `app-user-menu` | `UserMenuComponent` | `user-menu/user-menu.component.ts` | `user` (`UserInfo \| null`), `logout` (output) | `logout` | Avatar + dropdown hồ sơ/cài đặt/đăng xuất, tái dùng được cho client |

(* = bắt buộc)

> **Mới (2026-08)**: 3 component 15–17 tách ra từ Header khi refactor header/sidebar/dashboard. Model `UserInfo` dùng chung nằm ở `@core/models/user.model.ts` (shape khớp JWT: `userId`, `fullName`, `roleNames`, `permissions`) kèm helper `getInitials()` / `getPrimaryRole()` — KHÔNG tự khai báo interface UserInfo cục bộ nữa. Dữ liệu mẫu chi tiết các component mới sẽ bổ sung sau.

---

## 3. Coding standards ("style rules")

### 3.1 Tất cả component là standalone

Mỗi shared component (và mỗi trang) khai báo `standalone: true` và liệt kê component/module cần dùng vào mảng `imports`:

```ts
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, MatIconModule], // import TRỰC TIẾP vào component, không qua module cha
  templateUrl: './my.component.html',
  styleUrl: './my.component.css',
})
export class MyComponent {}
```

### 3.2 Signal inputs/outputs (KHÔNG dùng @Input/@Output)

```ts
import { Component, input, output } from '@angular/core';

@Component({ ... })
export class MyComponent {
  // input có giá trị mặc định
  label = input<string>('');

  // input bắt buộc (phải truyền từ ngoài)
  title = input.required<string>();

  // output phát sự kiện
  valueChange = output<string>();

  onClick() {
    this.valueChange.emit(this.label());
  }
}
```

- **Đọc giá trị input trong TypeScript** phải gọi như hàm: `this.label()`.
- **KHÔNG viết** `@Input() label = ''` hay `@Output() valueChange = new EventEmitter()` (trừ file legacy cảnh báo ở §4.10).

### 3.3 Control flow hiện đại trong template

```html
@if (isLoading()) {
  <p>Đang tải...</p>
} @else if (users().length === 0) {
  <p>Không có dữ liệu</p>
} @else {
  @for (user of users(); track user.id) {
    <span>{{ user.fullName }}</span>
  }
}
```

- Dùng `@if` / `@else if` / `@else`, `@for (x of xs; track x.id)`, `@switch` / `@case` / `@default`.
- **TUYỆT ĐỐI không dùng** `*ngIf`, `*ngFor` (sẽ không biên dịch được với Angular 22).
- **Bắt buộc có `track`** trong `@for` — thường là `track x.id` (hoặc `track x` nếu danh sách nguyên thủy).

### 3.4 Gọi signal bằng dấu ngoặc `()` trong template

Trong HTML, signal được gọi với `()`:

```html
<!-- ✅ ĐÚNG -->
<h2>{{ pageTitle() }}</h2>
<app-button [loading]="isSubmitting()" [label]="submitButtonText()" />

<!-- ❌ SAI — thiếu (), template không cập nhật -->
<h2>{{ pageTitle }}</h2>
```

### 3.5 Icon dùng Angular Material

```html
<mat-icon class="w-4 h-4">person_add</mat-icon>
```

Tên icon theo [Material Icons](https://fonts.google.com/icons). Nhớ import `MatIconModule` vào mảng `imports` của component.

### 3.6 Styling — Tailwind + class tùy biến trong styles.css

- Class tiện ích Tailwind dùng trực tiếp trong template: `px-4 py-3 rounded-lg flex items-center gap-2 ...`
- Một số class "thiết kế" được định nghĩa trong `src/styles.css` qua `@apply`, ví dụ:

```css
@layer components {
  .input-label {
    @apply block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5;
  }
  .input-error-text { @apply text-xs text-danger-600 dark:text-danger-400 mt-1; }
  .input-hint       { @apply text-xs text-slate-500 dark:text-slate-400 mt-1; }
  .form-group       { @apply mb-4; }
  .form-row         { @apply grid gap-4 md:grid-cols-2; }
  .table-container  { @apply overflow-x-auto; }
  .table-compact th, .table-compact td { @apply px-3 py-1.5; }
  .table-spacious th, .table-spacious td { @apply px-6 py-4; }
}
```

> Khi cần chỉnh giao diện shared component, **đa số** bạn chỉ đổi class Tailwind trong template của component đó. Chỉ đụng `styles.css` khi cần thêm class tái sử dụng toàn cục.

### 3.7 ControlValueAccessor (CVA) — dùng cho form

`app-input` và `app-select` triển khai `ControlValueAccessor` để hoạt động với `formControlName` / `ngModel`. Cấu trúc chuẩn:

```ts
import { Component, forwardRef, input, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  standalone: true,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MyInputComponent), multi: true },
  ],
})
export class MyInputComponent implements ControlValueAccessor {
  protected _value = signal('');
  private _onChange: (v: string) => void = () => {};
  private _onTouched: () => void = () => {};

  writeValue(v: string) { this._value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void) { this._onChange = fn; }
  registerOnTouched(fn: () => void) { this._onTouched = fn; }
  setDisabledState(d: boolean) { /* xử lý disabled */ }
}
```

Bạn **không cần** viết lại CVA cho trang của mình — chỉ cần **đặt `formControlName` lên thẻ `app-input` / `app-select`** là form tự hoạt động (xem §6).

---

## 4. Chi tiết từng component

### 4.1 `app-button` — ButtonComponent

**File nguồn**: `src/app/shared/components/button/button.component.ts`

**Types**:

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `label` | `string` | `''` |
| `variant` | `ButtonVariant` | `'primary'` |
| `size` | `ButtonSize` | `'default'` |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `icon` | `string` | `''` |
| `iconOnly` | `boolean` | `false` |
| `ariaLabel` | `string` | `''` |

> ⚠️ **BẪY #2**: input `type` chỉ nhận **3 giá trị** `'button' | 'submit' | 'reset'` — **không phải** giá trị HTML đầy đủ. Muốn submit form, truyền `type="submit"`.

**Outputs**: không có — dùng `(click)` thông thường.

**Snippet dùng**:

```html
<app-button variant="primary" icon="person_add" label="Thêm người dùng"
            (click)="createUser()" />
<app-button variant="ghost" icon="arrow_back" label="Quay lại"
            (click)="onCancel()" [disabled]="isSubmitting()" />
<app-button variant="secondary" icon="close" label="Hủy" (click)="onCancel()" />
<app-button variant="primary" [icon]="isEditMode() ? 'save' : 'person_add'"
            [label]="submitButtonText()" type="submit" [loading]="isSubmitting()" />
```

> **Sửa gì trong file nào**: style/icon nút do template của `button.component.ts` quyết định. **Trong trang của bạn**, bạn chỉ chọn `variant`, `size`, `icon`, `label` — không sửa file component trừ khi đổi giao diện chung toàn hệ thống.

---

### 4.2 `app-input` — InputComponent

**File nguồn**: `src/app/shared/components/input/input.component.ts`

**Types**:

```ts
export type InputType =
  | 'text' | 'email' | 'password' | 'number'
  | 'tel' | 'url' | 'search' | 'textarea';
```

**Inputs (signal)**:

| Input | Type | Mặc định | Ghi chú |
|---|---|---|---|
| `id` | `string` | **bắt buộc** | Phải trùng `id` của `app-form-field` bọc ngoài |
| `name` | `string` | `''` | |
| `type` | `InputType` | `'text'` | `'textarea'` sẽ render thẻ `<textarea>` |
| `value` | `string` | `''` | One-way binding khi KHÔNG dùng form |
| `placeholder` | `string` | `''` | |
| `disabled` / `readonly` | `boolean` | `false` | |
| `required` | `boolean` | `false` | |
| `min` / `max` / `step` / `pattern` | `string` | `''` | Attribute HTML |
| `minLength` / `maxLength` | `number \| null` | `null` | |
| `autocomplete` | `string` | `'off'` | |
| `icon` | `string` | `''` | Icon bên trái |
| `prefix` / `suffix` | `string` | `''` | Text cố định 2 đầu |
| `showPasswordToggle` | `boolean` | `false` | Hiện nút 👁 bên phải khi type=password |
| `passwordVisible` | `boolean \| undefined` | `undefined` | Điều khiển hiện/ẩn mật khẩu từ ngoài |
| `error` | `string` | `''` | Text lỗi (đỏ) |
| `hint` | `string` | `''` | Text gợi ý (xám) |
| `ariaLabel` | `string` | `''` | |
| `rows` | `number` | `3` | Chỉ dùng khi `type="textarea"` |

**Outputs**:

| Output | Type |
|---|---|
| `valueChange` | `string` (giá trị mới) |
| `blurEvent` / `focusEvent` | `void` |
| `passwordToggle` | `void` |

**CVA**: triển khai `ControlValueAccessor` → dùng được với `formControlName`.

> ⚠️ **BẪY #10 (phần 1)**: component này đặt tên input trợ năng là **`ariaLabel`** (viết liền, không dấu gạch). Component `app-table` lại dùng tên **`ariaLabelPrefix`** — không nhất quán, đừng nhầm lẫn.

**Snippet dùng**:

```html
<!-- Tìm kiếm, không dùng form -->
<app-input id="user-search"
           [value]="searchTerm()"
           [icon]="'search'"
           [ariaLabel]="'Tìm kiếm người dùng'"
           (valueChange)="searchTerm.set($event); onSearchChange()" />

<!-- Trong form (formControlName đặt trên app-input) -->
<app-form-field id="email" label="Email" [required]="true">
  <app-input id="email" formControlName="email" type="email"
             [readonly]="isEditMode()"
             [error]="hasError('email','required') ? 'Email là bắt buộc'
                    : hasError('email','email') ? 'Email không hợp lệ' : ''"
             [hint]="isEditMode() ? 'Email không thể thay đổi sau khi tạo tài khoản' : ''" />
</app-form-field>

<!-- Password có nút show/hide -->
<app-input id="password" formControlName="password"
           [type]="showPassword() ? 'text' : 'password'"
           [showPasswordToggle]="true"
           [passwordVisible]="showPassword()"
           (passwordToggle)="showPassword.set(!showPassword())" />

<!-- Textarea -->
<app-input id="address" formControlName="address" type="textarea" [rows]="3" />
```

> **Sửa gì trong file nào**: đổi giao diện ô input → sửa `input.component.ts` + CSS. **Trong trang của bạn**, bạn chỉ truyền `type`, `icon`, `error`, `hint`, `showPasswordToggle`... theo nhu cầu.

---

### 4.3 `app-select` — SelectComponent

**File nguồn**: `src/app/shared/components/select/select.component.ts`

**Types**:

```ts
export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `id` | `string` | **bắt buộc** |
| `options` | `SelectOption[]` | **bắt buộc** |
| `multiple` | `boolean` | `false` |
| `error` | `string` | `''` |
| `hint` | `string` | `''` |
| `icon` | `string` | `''` |

**Outputs**: `valueChange`, `blurEvent`, `focusEvent`.

**CVA**: triển khai `ControlValueAccessor` → dùng được với `formControlName`. Icon mở dropdown là `expand_more`.

**Snippet dùng**:

```ts
// Trong component.ts — tạo danh sách option từ data
roleOptions = computed<SelectOption[]>(() =>
  this.roles().map((r) => ({ value: r.name, label: r.name })),
);
```

```html
<!-- Lọc danh sách, không dùng form -->
<app-select id="role-filter"
            [options]="roleOptions()"
            [placeholder]="'Lọc theo vai trò'"
            [value]="roleFilter()"
            [icon]="'badge'"
            (valueChange)="roleFilter.set($event); onRoleChange()" />

<!-- Trong form -->
<app-form-field id="role" label="Vai trò">
  <app-select id="role" formControlName="role" [options]="roleOptions()" />
</app-form-field>
```

> **Sửa gì trong file nào**: đổi giao diện dropdown → `select.component.ts`. Trong trang, chỉ chuẩn bị `options` từ data và bind `formControlName` / `value`.

---

### 4.4 `app-form-field` — FormFieldComponent

**File nguồn**: `src/app/shared/components/form-field/form-field.component.ts`

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `id` | `string` | **bắt buộc** |
| `label` | `string` | `''` |
| `required` | `boolean` | `false` |
| `error` | `string` | `''` |
| `hint` | `string` | `''` |
| `horizontal` | `boolean` | `false` |

**Outputs**: không có.

**Template** (tóm tắt):

```html
<div class="form-group space-y-1.5">
  @if (label()) {
    <label [for]="id()" class="input-label">
      {{ label() }}
      @if (required()) { <span class="text-red-500 ml-1">*</span> }
    </label>
  }
  <div class="relative">
    <ng-content></ng-content>   <!-- app-input / app-select được bọc ở đây -->
  </div>
  @if (error()) {
    <p class="input-error-text" role="alert">{{ error() }}</p>
  } @else if (hint() && !hasError()) {
    <p class="input-hint">{{ hint() }}</p>
  }
</div>
```

> **Ưu tiên hiển thị**: `error` luôn được ưu tiên hơn `hint` — khi có lỗi, hint bị ẩn.

> ⚠️ **Quy tắc `id` trùng nhau** (nền tảng của cơ chế B, xem §6): `id` của `app-form-field` **phải giống hệt** `id` của `app-input`/`app-select` bên trong để thẻ `<label for>` nhảy đúng vào ô nhập khi click.

**Snippet dùng**:

```html
<app-form-field id="fullName" label="Họ và tên" [required]="true"
                [error]="hasError('fullName','required') ? 'Họ và tên là bắt buộc' : ''">
  <app-input id="fullName" formControlName="fullName" placeholder="Nguyễn Văn A" />
</app-form-field>
```

> **Sửa gì trong file nào**: đổi giao diện label/error/hint → `form-field.component.ts`. Trong trang, chỉ truyền `label`, `required`, `error`, `hint`.

---

### 4.5 `app-card`, `app-card-header`, `app-card-footer` — CardComponent

**File nguồn**: `src/app/shared/components/card/card.component.ts` (3 component chung 1 file)

**Types**:

```ts
export type CardVariant = 'default' | 'hover' | 'compact' | 'spacious';
export type CardPadding = 'none' | 'sm' | 'default' | 'lg';
```

**CardComponent inputs**:

| Input | Type | Mặc định |
|---|---|---|
| `variant` | `CardVariant` | `'default'` |
| `padding` | `CardPadding` | `'default'` |
| `border` | `boolean` | `true` |
| `shadow` | `boolean` | `false` |
| `compact` | `boolean` | `false` |

- `compact=true` → padding nội dung luôn `p-3` (bỏ qua `padding`).
- Ngược lại: `none`→`p-0`, `sm`→`p-3`, `default`→`p-5`, `lg`→`p-6`.

**CardHeaderComponent inputs**: `title`, `subtitle`, `icon`.

**CardFooterComponent**: không có input.

**Cách ghép header/footer** (content projection):

```html
<app-card>
  <app-card-header title="Thông tin tài khoản" subtitle="Cập nhật thông tin cá nhân"
                   icon="account_circle" />
  <!-- Nội dung card -->
  <app-card-footer>
    <app-button variant="primary" label="Lưu" />
  </app-card-footer>
</app-card>
```

> ⚠️ **BẪY #5**: CardComponent phát hiện header/footer qua `contentChild()` — chỉ khi trong card **có thẻ `<app-card-header>`/`<app-card-footer>` thực sự**. Trang User Form hiện import `CardHeaderComponent` nhưng HTML **không dùng** thẻ này (dùng div header thủ công) → `hasHeader()` luôn `false`, header manual không có padding chuẩn của card. Nếu bạn thêm `app-card-header` vào, nhớ kiểm tra padding không bị trùng.

> **Sửa gì trong file nào**: giao diện khung card → `card.component.ts`. Trong trang, chỉ chọn `variant`/`padding`/`compact` và bố trí content.

---

### 4.6 `app-badge` — BadgeComponent

**File nguồn**: `src/app/shared/components/badge/badge.component.ts`

**Types**:

```ts
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `label` | `string` | **bắt buộc** |
| `variant` | `BadgeVariant` | `'neutral'` |
| `icon` | `string` | `''` |
| `size` | `'sm' \| 'default'` | `'default'` |
| `dot` | `boolean` | `false` |

> ⚠️ **BẪY #4**: input **`dot` được khai báo nhưng KHÔNG được render** trong template — gán `[dot]="true"` sẽ không có tác dụng gì. Ngoài ra, variant **`info` và `primary` map cùng một class Tailwind** → trông giống hệt nhau. Đừng lạm dụng một trong hai.

**Snippet dùng**:

```html
<app-badge [label]="roleName"
           [variant]="getRoleVariant(roleName)"
           [size]="'sm'" />

<app-badge [label]="getStatusText(user)"
           [variant]="(user.active ?? true) ? 'success' : 'danger'"
           [icon]="(user.active ?? true) ? 'check_circle' : 'cancel'"
           [size]="'default'" />
```

> **Sửa gì trong file nào**: đổi màu sắc từng variant → `badge.component.ts`. Trong trang, bạn viết hàm map giá trị → variant (ví dụ `getRoleVariant` ở §8).

---

### 4.7 `app-table` — TableComponent (generic `<T>`)

**File nguồn**: `src/app/shared/components/table/table.component.ts`

**Types**:

```ts
export interface Column<T> {
  key: string;
  label: string;
  visible?: boolean;              // false → ẩn cột (vẫn giữ cấu hình)
  width?: string;                 // ví dụ '60px', '180px'
  sortable?: boolean;
  template?: TemplateRef<{ $implicit: T }>;  // custom cell, xem §5
  align?: 'left' | 'center' | 'right';
}

export interface TableAction<T> {
  label: string;
  icon: string;
  handler: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';   // ⚠️ chỉ 4 giá trị
  disabled?: (row: T) => boolean;
  tooltip?: string;
}
```

> ⚠️ **BẪY #3**: `TableAction.variant` chỉ nhận **4 giá trị** `'primary' | 'secondary' | 'ghost' | 'danger'` — **KHÔNG phải** đủ 6 giá trị `ButtonVariant`. Viết `variant: 'success'` sẽ **lỗi TypeScript**.

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `data` | `T[]` | **bắt buộc** |
| `columns` | `Column<T>[]` | **bắt buộc** |
| `trackByFn` | `(row: T) => any` | `(row) => row.id` |
| `loading` | `boolean` | `false` |
| `loadingText` | `string` | `'Đang tải...'` |
| `selectable` | `boolean` | `false` |
| `selectedRows` | `T[]` | `[]` |
| `actions` | `TableAction<T>[]` | `[]` |
| `paginated` | `boolean` | `false` |
| `currentPage` / `pageSize` / `totalItems` | `number` | `1` / `10` / `0` |
| `sortColumn` / `sortDirection` | `string` / `'asc'\|'desc'` | `''` / `'asc'` |
| `density` | `'comfortable' \| 'compact' \| 'spacious'` | `'comfortable'` |
| `ariaLabelPrefix` | `string` | `''` |
| `emptyIcon` / `emptyTitle` / `emptyDescription` | `string` | `'inventory_2'` / `'Không tìm thấy dữ liệu'` / `'Thử thay đổi bộ lọc hoặc thêm mới'` |
| `emptyActionLabel` / `emptyActionIcon` | `string` | `''` |

**Outputs**:

| Output | Type |
|---|---|
| `selectionChange` | `T[]` (danh sách hàng đang chọn) |
| `sortChange` | `{ column: string; direction: 'asc' \| 'desc' }` |
| `rowClick` | `T` |
| `prevPage` / `nextPage` | `void` |
| `emptyActionClick` | `void` |

**Các điểm cần nhớ về cơ chế bên trong**:

- **Cột ẩn**: `visibleColumns = computed(() => this.columns().filter((c) => c.visible !== false))`.
- **Custom cell**: nếu `column.template` tồn tại → render qua `ngTemplateOutlet` với context `{ $implicit: row }` (xem §5).
- **Cell mặc định**: `getCellValue(row, key)` → `row[key]`.
- **Checkbox chọn hàng**: `isSelected(row)` so khớp qua `trackByFn()` — nghĩa là `selectedRows` phải là chính các object trong `data` (hoặc object cùng giá trị trackBy).
- **Kebab menu**: quản lý bằng signal `openMenuRow` + `@HostListener('document:click')` để đóng khi click ra ngoài (xem §7).
- **Pagination**: tự tính `totalPages = Math.ceil(totalItems / pageSize)`, chỉ hiện footer khi `paginated && showPagination` (tổng > 1 trang).

> ⚠️ **BẪY #6**: mật độ bảng được áp qua `densityClass()` trên **`div.table-container`** (class `table-compact`/`table-spacious`), **không phải** trên thẻ `<table>`. Class này do `styles.css` định nghĩa để điều chỉnh padding `th`/`td`.

> ⚠️ **BẪY #7**: `trackByFn` mặc định = `(row) => (row as any).id`. Nếu model của bạn không có trường `id`, **phải truyền `trackByFn` riêng** (trang Users truyền `trackByUserId`).

> ⚠️ **BẪY #10 (phần 2)**: input trợ năng của bảng tên là **`ariaLabelPrefix`** — dùng cho checkbox "Chọn tất cả" / "Chọn <tên>".

**Snippet dùng (tối thiểu)**:

```html
<app-table [data]="filteredUsers()"
           [columns]="columns()"
           [loading]="isLoading()"
           [loadingText]="'Đang tải người dùng...'"
           [actions]="actions"
           [trackByFn]="trackByUserId"
           [selectable]="true"
           [selectedRows]="selectedUsers()"
           (selectionChange)="onSelectionChange($event)" />
```

> **Sửa gì trong file nào**: giao diện bảng (độ rộng, màu header, kebab...) → `table.component.ts`. **Trong trang của bạn**, bạn khai báo `columns`, `actions`, `data`, `trackByFn` và các template cột (xem §5, §8).

---

### 4.8 `app-loading` — LoadingComponent

**File nguồn**: `src/app/shared/components/loading/loading.component.ts`

**Types**:

```ts
export type LoadingType = 'spinner' | 'skeleton' | 'dots' | 'pulse';
export type LoadingSize = 'sm' | 'default' | 'lg' | 'xl';
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `type` | `LoadingType` | `'spinner'` |
| `size` | `LoadingSize` | `'default'` |
| `color` | `'primary' \| 'secondary' \| 'muted'` | `'primary'` |
| `text` | `string` | `''` |
| `width` | `string` | `'100%'` |
| `height` | `string` | `'1rem'` |
| `borderRadius` | `string` | `'rounded'` |

Template dùng `@switch` / `@case` / `@default` để render theo `type`.

**Snippet dùng**:

```html
<app-loading size="xl" text="Đang tải dữ liệu..." />
```

> **Sửa gì trong file nào**: giao diện từng kiểu loading → `loading.component.ts`. Trong trang, chỉ chọn `type`/`size`/`text`.

---

### 4.9 `app-empty-state` — EmptyStateComponent

**File nguồn**: `src/app/shared/components/empty-state/empty-state.component.ts`

**Types**:

```ts
export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'permission';
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `variant` | `EmptyStateVariant` | `'no-data'` |
| `icon` | `string` | `'inventory_2'` |
| `title` | `string` | `'Không có dữ liệu'` |
| `description` | `string` | `'Hiện tại chưa có dữ liệu nào'` |
| `actionLabel` | `string` | `''` |
| `actionIcon` | `string` | `'add'` |
| `actionVariant` | `'primary' \| 'secondary' \| 'ghost' \| 'outline'` | `'primary'` |

**Outputs**: `actionClick` (`void`).

> ⚠️ **BẪY #8**: `actionVariant` chỉ nhận **4 giá trị** `'primary' | 'secondary' | 'ghost' | 'outline'` — **không phải** đủ 6 `ButtonVariant`.

**Snippet dùng**:

```html
<app-empty-state icon="people_outline"
                 title="Không tìm thấy người dùng"
                 description="Thử thay đổi bộ lọc hoặc thêm người dùng mới"
                 actionLabel="Tạo người dùng đầu tiên"
                 actionIcon="person_add"
                 (actionClick)="createUser()" />
```

> **Lưu ý**: khi dùng `app-table`, các input `empty*` của bảng sẽ được truyền thẳng xuống `app-empty-state` bên trong — **không cần** tự đặt `app-empty-state` cạnh bảng.

> **Sửa gì trong file nào**: giao diện empty state → `empty-state.component.ts`.

---

### 4.10 `app-page-header` — PageHeaderComponent (HIỆN ĐẠI)

**File nguồn**: `src/app/shared/components/page-header/page-header.component.ts`

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `title` | `string` | **bắt buộc** |
| `subtitle` | `string` | `''` |
| `hasActions` | `boolean` | `false` |

**Snippet dùng**:

```html
<app-page-header title="Quản lý người dùng"
                 [subtitle]="'Tìm kiếm, lọc và quản lý tài khoản người dùng (' +
                             filteredUsers().length + '/' + users().length + ')'"
                 [hasActions]="true">
  <app-button variant="primary" icon="person_add" label="Thêm người dùng"
              (click)="createUser()" />
</app-page-header>
```

> Khi `hasActions="true"`, các phần tử con (thường là nút) được render ở bên phải tiêu đề.

> 🚨 **BẪY #1 — File legacy (dead code)**: trong `src/app/shared/components/` còn một file **`page-header.component.ts`** cũ có **cùng selector `app-page-header`** nhưng dùng `@Input()` truyền thống:
>
> ```ts
> // page-header.component.ts (LEGACY — KHÔNG được dùng)
> @Input() title = '';
> @Input() subtitle?: string;
> @Input() actions = false;   // ← tên input KHÁC
> ```
>
> - File này **không được import ở bất kỳ đâu** — barrel `index.ts` trỏ tới file hiện đại trong `page-header/`.
> - **KHÔNG sửa** file legacy này.
> - Khi dùng trong trang, luôn viết **`[hasActions]`**, không viết `[actions]`.
> - Nó **có thể xóa an toàn** nếu muốn dọn dẹp.

> **Sửa gì trong file nào**: giao diện header trang → `page-header/page-header.component.ts` (bản hiện đại). Trong trang, chỉ truyền `title`/`subtitle`/`hasActions`.

---

### 4.11 `app-avatar` — AvatarComponent

**File nguồn**: `src/app/shared/components/avatar/avatar.component.ts`

**Types**:

```ts
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'rounded' | 'circle';
export type AvatarShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `src` | `string` | `''` |
| `alt` | `string` | `'avatar'` |
| `initials` | `string` | `''` |
| `size` | `AvatarSize` | `'md'` |
| `shape` | `AvatarShape` | `'rounded'` |
| `shadow` | `AvatarShadow` | `'none'` |

**Hành vi**: tự quản lý `isLoading`/`hasError`. Khi `src` rỗng → hiện `initials` (hoặc icon person mặc định). Khi ảnh lỗi → fallback icon.

**Snippet dùng**:

```html
<app-avatar [src]="user.avatar"
            [alt]="user.fullName || 'Người dùng'"
            [initials]="getInitials(user.fullName)"
            size="sm" shape="circle" [shadow]="'sm'" class="mx-auto" />
```

> **Sửa gì trong file nào**: giao diện avatar → `avatar.component.ts`. Trong trang, chỉ truyền `src`/`initials`/`size`/`shape`/`shadow`.

---

### 4.12 `app-info-item` — InfoItemComponent

**File nguồn**: `src/app/shared/components/info-item/info-item.component.ts`

**Types**:

```ts
export type InfoItemFormat = 'text' | 'number' | 'money';
```

**Inputs (signal)**:

| Input | Type | Mặc định |
|---|---|---|
| `label` | `string` | **bắt buộc** |
| `value` | `string \| number \| null \| undefined` | `''` |
| `icon` | `string` | `''` |
| `mono` | `boolean` | `false` |
| `format` | `InfoItemFormat` | `'text'` |
| `emptyText` | `string` | `'—'` |

**Hành vi `displayValue`**:

- `value` = `null`/`undefined`/`''` → hiện `emptyText`.
- `format='number'` → `Intl.NumberFormat('vi-VN')` (dấu phân cách hàng nghìn).
- `format='money'` → định dạng tiền tệ **VND** (không lẻ).

**Snippet dùng**:

```html
<app-info-item label="Tổng doanh thu" [value]="stats.revenue" format="money" />
<app-info-item label="Mã đơn hàng" [value]="order.code" mono="true" />
```

> **Sửa gì trong file nào**: giao diện label/value → `info-item.component.ts`. Trong trang, chỉ chọn `format`/`mono`/`emptyText`.

---

### 4.13 Barrel `@shared/components` & 2 kiểu import

**File nguồn**: `src/app/shared/components/index.ts`

Barrel xuất tất cả 14 component class + các type liên quan:

```ts
export { ButtonComponent } from './button/button.component';
export type { ButtonVariant, ButtonSize } from './button/button.component';
export { InputComponent } from './input/input.component';
export type { InputType } from './input/input.component';
export { SelectComponent } from './select/select.component';
export type { SelectOption } from './select/select.component';
export { FormFieldComponent } from './form-field/form-field.component';
export { CardComponent, CardHeaderComponent, CardFooterComponent } from './card/card.component';
export type { CardVariant, CardPadding } from './card/card.component';
export { BadgeComponent } from './badge/badge.component';
export type { BadgeVariant } from './badge/badge.component';
export { TableComponent } from './table/table.component';
export type { Column, TableAction } from './table/table.component';
export { LoadingComponent } from './loading/loading.component';
export type { LoadingType, LoadingSize } from './loading/loading.component';
export { EmptyStateComponent } from './empty-state/empty-state.component';
export type { EmptyStateVariant } from './empty-state/empty-state.component';
export { PageHeaderComponent } from './page-header/page-header.component';
export { AvatarComponent } from './avatar/avatar.component';
export type { AvatarSize, AvatarShape, AvatarShadow } from './avatar/avatar.component';
export { InfoItemComponent } from './info-item/info-item.component';
export type { InfoItemFormat } from './info-item/info-item.component';
```

> ⚠️ **BẪY #11**: barrel **KHÔNG xuất** file legacy `page-header.component.ts` — vì vậy import từ `@shared/components` luôn nhận bản hiện đại. Ngoài ra có sub-barrel `@shared/components/form-field` re-export đúng `FormFieldComponent`, `InputComponent`, `SelectComponent` — không có xung đột tên.

**Hai kiểu import đang tồn tại trong codebase**:

**① Mixed (trang Users)** — import từng path riêng, chỉ lấy PageHeader + Avatar từ barrel:

```ts
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import { PageHeaderComponent, AvatarComponent } from '@shared/components';
```

**② Pure barrel (trang User Form)** — lấy tất cả từ `@shared/components`:

```ts
import {
  CardComponent,
  CardHeaderComponent,
  BadgeComponent,
  ButtonComponent,
  InputComponent,
  SelectOption,
  FormFieldComponent,
  PageHeaderComponent,
  AvatarComponent,
  LoadingComponent,
} from '@shared/components';
```

> **Cả hai cách đều hoạt động tốt** (không xung đột). Khi **thêm component mới**, hãy theo kiểu import đang có sẵn trong file bạn đang sửa. Nếu bạn chọn kiểu mixed, nhớ cập nhật **cả mảng `imports`** của `@Component`.

---

## 5. Cơ chế A — Custom column template của bảng

Khi cột bảng cần hiển thị **không chỉ là text đơn giản** (avatar, badge, nút, HTML tùy biến), bạn khai báo một `<ng-template>` trong HTML của trang, rồi "gắn" nó vào cột tương ứng qua `@ViewChild`.

### 5.1 Recipe 8 bước

**Bước 1 — Trong HTML, khai báo template với biến row**:

```html
<ng-template #nameColumn let-user>
  <div class="flex items-center gap-2">
    <app-avatar [src]="user.avatar" [initials]="getInitials(user.fullName)"
                size="sm" shape="circle" />
    <span class="font-medium">{{ user.fullName }}</span>
  </div>
</ng-template>
```

- `let-user` = biến nhận dữ liệu của hàng hiện tại (tên biến tùy bạn chọn).
- Tên template `#nameColumn` phải **khớp key cột** (hoặc tự bạn map thủ công ở bước 4).

**Bước 2 — Trong component.ts, khai báo cột** (chưa có template):

```ts
columns = signal<Column<UserResponse>[]>([
  { key: 'fullName', label: 'Họ và tên', sortable: true },
  // ...
]);
```

**Bước 3 — Khai báo `@ViewChild` với `{ static: true }`**:

```ts
@ViewChild('nameColumn', { static: true }) nameColumn?: TemplateRef<{ $implicit: UserResponse }>;
```

> `{ static: true }` là bắt buộc — cho phép truy cập template ngay trong `ngAfterViewInit`.

**Bước 4 — Map template vào cột trong `ngAfterViewInit()`**:

```ts
ngAfterViewInit(): void {
  const templateMap: Record<string, TemplateRef<{ $implicit: UserResponse }>> = {
    fullName: this.nameColumn!,   // key cột : template
    email: this.emailColumn!,
    // ...
  };

  this.columns.update((cols) =>
    cols.map((col) => (templateMap[col.key] ? { ...col, template: templateMap[col.key] } : col)),
  );
}
```

**Bước 5 — Bảng tự render template** (đây là code bên trong `table.component.ts`, bạn không cần sửa):

```ts
// Trong template của TableComponent:
@if (column.template) {
  <ng-container [ngTemplateOutlet]="column.template"
                [ngTemplateOutletContext]="{ $implicit: row }" />
} @else {
  {{ getCellValue(row, column.key) }}
}
```

**Bước 6 — (Tùy chọn) Cột ẩn hiện**: set `visible: false` thì bảng bỏ qua cột (template vẫn giữ).

**Bước 7 — (Tùy chọn) Căn chỉnh**: `align: 'center'`, `width: '60px'`.

**Bước 8 — Kiểm tra**: chạy `ng build` (xem §12). Nếu template không hiện, kiểm tra (a) tên `@ViewChild` khớp `#tênTemplate`, (b) key trong `templateMap` khớp `col.key`, (c) `{ static: true }`.

---

## 6. Cơ chế B — Form-field wrapping

`app-form-field` đóng vai trò **khung label + error/hint**, bọc ngoài `app-input` hoặc `app-select`.

### 6.1 Quy tắc quan trọng

1. **`id` phải trùng nhau** giữa `app-form-field` và `app-input`/`app-select` bên trong — giúp thẻ `<label for>` focus đúng ô nhập khi click vào label.
2. **`formControlName` đặt trên `app-input`/`app-select`**, không đặt trên `app-form-field`.
3. **`error` ưu tiên hơn `hint`** — khi có lỗi, hint tự bị ẩn.
4. Trong form, thường dùng **`hasError(controlName, errorName)`** của trang để tính text lỗi từ `FormGroup` (xem §9).

### 6.2 Mẫu chuẩn

```html
<app-form-field id="fullName" label="Họ và tên" [required]="true"
                [error]="hasError('fullName', 'required') ? 'Họ và tên là bắt buộc'
                       : hasError('fullName', 'minlength') ? 'Tối thiểu 2 ký tự' : ''">
  <app-input id="fullName" formControlName="fullName"
             placeholder="Nguyễn Văn A" />
</app-form-field>
```

### 6.3 Mẫu password show/hide

```html
<app-form-field id="password" label="Mật khẩu" [required]="true"
                [error]="hasError('password','required') ? 'Mật khẩu là bắt buộc'
                       : hasError('password','minlength') ? 'Tối thiểu 6 ký tự' : ''">
  <app-input id="password" formControlName="password"
             [type]="showPassword() ? 'text' : 'password'"
             [showPasswordToggle]="true"
             [passwordVisible]="showPassword()"
             (passwordToggle)="showPassword.set(!showPassword())" />
</app-form-field>
```

- `showPassword` là một `signal<boolean>` trong trang.
- `showPasswordToggle` hiện nút 👁; `passwordToggle` bắn sự kiện để trang đổi trạng thái.

### 6.4 Mẫu textarea

```html
<app-form-field id="address" label="Địa chỉ">
  <app-input id="address" formControlName="address" type="textarea" [rows]="3" />
</app-form-field>
```

### 6.5 Layout 2 cột

Dùng class `form-row` (grid 2 cột trên màn hình lớn) + `form-group`:

```html
<div class="form-row">
  <div class="form-group">
    <app-form-field id="fullName" label="Họ và tên" [required]="true">
      <app-input id="fullName" formControlName="fullName" />
    </app-form-field>
  </div>
  <div class="form-group">
    <app-form-field id="phone" label="Số điện thoại">
      <app-input id="phone" formControlName="phone" type="tel" />
    </app-form-field>
  </div>
</div>
```

---

## 7. Cơ chế C — Table actions kebab menu

Mỗi hàng của bảng có một nút `⋮` (kebab) mở dropdown các thao tác. Toàn bộ trạng thái mở/đóng do `TableComponent` tự quản lý.

### 7.1 Cách hoạt động (bên trong TableComponent)

```ts
openMenuRow = signal<T | null>(null);                 // hàng đang mở menu

@HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent): void {
  const open = this.openMenuRow();
  if (open === null) return;
  const target = event.target as HTMLElement;
  const inMenu = this.menuContainer?.nativeElement?.contains(target) ?? false;
  const inTrigger = !!target.closest('.table-action-trigger');
  if (!inMenu && !inTrigger) {
    this.openMenuRow.set(null);                       // click ngoài → đóng menu
  }
}

toggleRowMenu(row: T): void { /* mở/đóng cho 1 hàng, so khớp bằng trackByFn */ }
runAction(action: TableAction<T>, row: T): void {
  this.openMenuRow.set(null);                         // đóng menu rồi gọi handler
  action.handler(row);
}
```

### 7.2 Khai báo actions trong trang

Trong component.ts của trang:

```ts
actions: TableAction<UserResponse>[] = [
  {
    label: 'Xem chi tiết',
    icon: 'visibility',
    variant: 'ghost',
    handler: (user) => this.viewUser(user),
  },
  {
    label: 'Chỉnh sửa',
    icon: 'edit',
    variant: 'ghost',
    handler: (user) => this.editUser(user),
  },
  {
    label: 'Xóa',
    icon: 'delete',
    variant: 'danger',          // chỉ 4 giá trị: primary|secondary|ghost|danger
    handler: (user) => this.deleteUser(user),
  },
  {
    label: 'Khóa tài khoản',
    icon: 'block',
    variant: 'ghost',
    disabled: (user) => !user.active,   // tùy chọn: vô hiệu hóa theo điều kiện
    handler: (user) => this.toggleUserStatus(user),
  },
];
```

Trong HTML:

```html
<app-table [data]="filteredUsers()" [columns]="columns()"
           [actions]="actions" [trackByFn]="trackByUserId" />
```

> Chỉ cần có mảng `actions` (độ dài > 0), bảng tự hiện cột "Thao tác" và nút `⋮`. Không cần code thêm trong HTML.

---

## 8. Case study 1 — Trang Users (danh sách)

**Files**: `src/app/features/admin/pages/users/users.component.ts`, `users.component.html`, `users.component.css`

> Chú ý: tên file là `users.component.ts` / `users.component.html` (có đuôi `.component`), **không** phải `users.ts` / `users.html`.

### 8.1 Luồng dữ liệu

```
UserService.getUsers() → signal users()
                        → filteredUsers() (computed sau khi lọc/tìm/sort)
                        → app-table [data]="filteredUsers()"
```

### 8.2 Các signal chính

```ts
users            = signal<UserResponse[]>([]);        // dữ liệu gốc từ API
roles            = signal<RoleResponse[]>([]);        // danh sách vai trò cho filter
isLoading        = signal(false);
searchTerm       = signal('');                        // từ khóa tìm kiếm
roleFilter       = signal('');                        // lọc theo vai trò (1 value)
statusFilter     = signal<'all' | 'active' | 'inactive'>('all');
selectedUserIds  = signal<string[]>([]);
columns          = signal<Column<UserResponse>[]>([]);
filteredUsers    = computed<UserResponse[]>(() => { ... });
```

### 8.3 Khai báo cột — BẪY #9 (chiều rộng)

```ts
columns = signal<Column<UserResponse>[]>([
  { key: 'avatar',    label: 'Avatar',    visible: true,  width: '60px',  align: 'center' },
  { key: 'fullName',  label: 'Họ và tên', sortable: true },                       // không width
  { key: 'email',     label: 'Email',     sortable: true },                       // không width
  { key: 'phone',     label: 'Số điện thoại' },                                   // không width
  { key: 'roles',     label: 'Vai trò',   width: '180px' },
  { key: 'status',    label: 'Trạng thái', width: '170px', align: 'center' },
  { key: 'lastLogin', label: 'Đăng nhập cuối', visible: false, sortable: true, align: 'center' },
  { key: 'createdAt', label: 'Ngày tạo',  visible: false, sortable: true, align: 'center' },
]);
```

> ⚠️ **BẪY #9**: chiều rộng cố định đã đặt: **avatar `60px`**, **roles `180px`**, **status `170px`**; `fullName`/`email`/`phone` **không** đặt `width` (tự chia đều). `lastLogin`/`createdAt` để `visible: false` — cột bị ẩn nhưng cấu hình (sortable, template) vẫn giữ.

### 8.4 Custom templates (cơ chế A)

8 template tương ứng 8 cột, mỗi template đặt `#tênTemplate`:

```html
<!-- Avatar -->
<ng-template #avatarColumn let-user>
  <app-avatar [src]="user.avatar"
              [alt]="user.fullName || 'Người dùng'"
              [initials]="getInitials(user.fullName)"
              size="sm" shape="circle" [shadow]="'sm'" class="mx-auto" />
</ng-template>

<!-- Tên + email -->
<ng-template #nameColumn let-user>
  <div class="font-medium text-slate-900 dark:text-white">{{ user.fullName }}</div>
</ng-template>

<!-- Vai trò: vòng lặp badge -->
<ng-template #rolesColumn let-user>
  <div class="flex flex-wrap gap-1">
    @for (roleName of (user.roleNames || []); track roleName) {
      <app-badge [label]="roleName"
                 [variant]="getRoleVariant(roleName)"
                 [size]="'sm'" />
    }
    @if (!user.roleNames || user.roleNames.length === 0) {
      <app-badge label="Chưa có vai trò" variant="neutral" size="sm" />
    }
  </div>
</ng-template>

<!-- Trạng thái -->
<ng-template #statusColumn let-user>
  <app-badge [label]="getStatusText(user)"
             [variant]="(user.active ?? true) ? 'success' : 'danger'"
             [icon]="(user.active ?? true) ? 'check_circle' : 'cancel'"
             [size]="'default'" />
</ng-template>
```

Trong component.ts:

```ts
@ViewChild('avatarColumn', { static: true }) avatarColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('nameColumn',   { static: true }) nameColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('emailColumn',  { static: true }) emailColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('phoneColumn',  { static: true }) phoneColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('rolesColumn',  { static: true }) rolesColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('statusColumn', { static: true }) statusColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('lastLoginColumn', { static: true }) lastLoginColumn?: TemplateRef<{ $implicit: UserResponse }>;
@ViewChild('createdAtColumn', { static: true }) createdAtColumn?: TemplateRef<{ $implicit: UserResponse }>;

ngAfterViewInit(): void {
  const templateMap: Record<string, TemplateRef<{ $implicit: UserResponse }>> = {
    avatar: this.avatarColumn!,
    fullName: this.nameColumn!,
    email: this.emailColumn!,
    phone: this.phoneColumn!,
    roles: this.rolesColumn!,
    status: this.statusColumn!,
    lastLogin: this.lastLoginColumn!,
    createdAt: this.createdAtColumn!,
  };
  this.columns.update((cols) =>
    cols.map((col) => (templateMap[col.key] ? { ...col, template: templateMap[col.key] } : col)),
  );
}
```

### 8.5 Các hàm helper

```ts
trackByUserId(user: UserResponse): string {
  return user.id;
}

getRoleVariant(roleName: string): BadgeVariant {
  const roleVariants: Record<string, BadgeVariant> = {
    ADMIN: 'danger', STAFF: 'warning', USER: 'primary',
    MANAGER: 'info', SUPER_ADMIN: 'danger',
  };
  return roleVariants[roleName] || 'neutral';
}

getStatusText(user: UserResponse): string {
  return (user.active ?? true) ? 'Đang hoạt động' : 'Ngừng hoạt động';
}

formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

getInitials(fullName: string): string {
  if (!fullName) return 'NA';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
```

### 8.6 Cấu trúc HTML tổng thể

```html
<!-- 1. Page header -->
<app-page-header title="Quản lý người dùng"
                 [subtitle]="'Tìm kiếm, lọc và quản lý tài khoản người dùng (' +
                             filteredUsers().length + '/' + users().length + ')'"
                 [hasActions]="true">
  <app-button variant="primary" icon="person_add" label="Thêm người dùng"
              (click)="createUser()" />
</app-page-header>

<!-- 2. Card bộ lọc -->
<app-card [padding]="'sm'" [compact]="true">
  <div class="grid gap-3 md:grid-cols-4">
    <app-input id="user-search" [value]="searchTerm()" [icon]="'search'"
               [ariaLabel]="'Tìm kiếm người dùng'"
               (valueChange)="searchTerm.set($event); onSearchChange()" />
    <app-select id="role-filter" [options]="roleOptions()"
                [placeholder]="'Lọc theo vai trò'" [value]="roleFilter()"
                [icon]="'badge'" [ariaLabel]="'Lọc theo vai trò'"
                (valueChange)="roleFilter.set($event); onRoleChange()" />
    <!-- ... select trạng thái + nút "Xóa bộ lọc", "Cột", "Bộ lọc" ... -->
  </div>
</app-card>

<!-- 3. Bảng -->
<app-card [padding]="'none'">
  <app-table [data]="filteredUsers()"
             [columns]="columns()"
             [loading]="isLoading()"
             [loadingText]="'Đang tải người dùng...'"
             [actions]="actions"
             [trackByFn]="trackByUserId"
             [selectable]="true"
             [selectedRows]="selectedUsers()"
             (selectionChange)="onSelectionChange($event)"
             [emptyIcon]="'people_outline'"
             [emptyTitle]="'Không tìm thấy người dùng'"
             [emptyDescription]="'Thử thay đổi bộ lọc hoặc thêm người dùng mới'"
             [emptyActionLabel]="'Tạo người dùng đầu tiên'"
             [emptyActionIcon]="'person_add'"
             (emptyActionClick)="createUser()">
    <!-- 8 ng-template cột ở đây -->
  </app-table>
</app-card>
```

> **Chỗ nào thêm/sửa cột, action, màu badge**:
> - **Thêm/sửa cột** → §8.3 (mảng `columns`) + §8.4 (template mới + `templateMap`).
> - **Thêm/sửa action** → mảng `actions` (xem §7.2).
> - **Đổi màu badge vai trò/trạng thái** → hàm `getRoleVariant` / `getStatusText`.
> - **Đổi text rỗng/lỗi của bảng** → các input `empty*` trong thẻ `app-table`.

---

## 9. Case study 2 — Trang User Form

**Files**: `src/app/features/admin/pages/user-form/user-form.component.ts`, `user-form.component.html`, `user-form.component.css`

> Trang này dùng **kiểu import pure barrel** (xem §4.13) và **chỉ** các component: Card, CardHeader, Badge, Button, Input, SelectOption, FormField, PageHeader, Avatar, Loading.

### 9.1 FormGroup

```ts
userForm: FormGroup = this.fb.group({
  email:    ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]],
  fullName: ['', [Validators.required, Validators.minLength(2)]],
  phone:    ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
  address:  [''],
  roleNames: [[], [Validators.required]],
  active:   [true],
});
```

**Chế độ edit/create** (computed):

```ts
isEditMode = computed(() => !!this.userId());
pageTitle = computed(() =>
  this.isEditMode() ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới');
pageSubtitle = computed(() =>
  this.isEditMode() ? 'Cập nhật thông tin tài khoản người dùng'
                    : 'Điền thông tin để tạo tài khoản người dùng mới');
submitButtonText = computed(() =>
  this.isEditMode() ? 'Cập nhật' : 'Tạo người dùng');
```

**Password linh hoạt theo mode** (effect):

```ts
private readonly passwordEffect = effect(() => {
  const passwordControl = this.userForm.get('password');
  if (this.isEditMode()) {
    passwordControl?.clearValidators();                       // edit: mật khẩu không bắt buộc
  } else {
    passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
  }
  passwordControl?.updateValueAndValidity({ emitEvent: false });
});
```

**Helper kiểm tra lỗi** (dùng cho cả `app-form-field.error` lẫn `app-input.error`):

```ts
hasError(controlName: string, errorName: string): boolean {
  const control = this.userForm.get(controlName);
  return (control?.touched && control?.hasError(errorName)) ?? false;
}
```

### 9.2 Cấu trúc HTML

```html
<!-- Loading overlay -->
@if (isLoading()) {
  <div class="flex justify-center py-20">
    <app-loading size="xl" text="Đang tải dữ liệu..." />
  </div>
} @else {
  <form [formGroup]="userForm" (ngSubmit)="onSubmit()">

    <!-- Page header -->
    <app-page-header [title]="pageTitle()" [subtitle]="pageSubtitle()" [hasActions]="true">
      <app-button variant="ghost" icon="arrow_back" label="Quay lại"
                  (click)="onCancel()" [disabled]="isSubmitting()" />
    </app-page-header>

    <!-- Section: Thông tin tài khoản -->
    <app-card>
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h2 class="text-title font-semibold text-slate-900 dark:text-white">
          <mat-icon class="w-5 h-5 text-primary align-middle mr-2">account_circle</mat-icon>
          Thông tin tài khoản
        </h2>
      </div>
      <div class="p-5">
        <div class="form-row">
          <div class="form-group">
            <app-form-field id="email" label="Email" [required]="true"
                            [error]="hasError('email','required') ? 'Email là bắt buộc'
                                   : hasError('email','email') ? 'Email không hợp lệ' : ''">
              <app-input id="email" formControlName="email" type="email"
                         [readonly]="isEditMode()"
                         [hint]="isEditMode() ? 'Email không thể thay đổi sau khi tạo tài khoản' : ''" />
            </app-form-field>
          </div>
          <div class="form-group">
            <app-form-field id="fullName" label="Họ và tên" [required]="true"
                            [error]="hasError('fullName','required') ? 'Họ và tên là bắt buộc' : ''">
              <app-input id="fullName" formControlName="fullName" />
            </app-form-field>
          </div>
        </div>

        <!-- Password: chỉ hiện khi TẠO MỚI -->
        @if (!isEditMode()) {
          <div class="form-group">
            <app-form-field id="password" label="Mật khẩu" [required]="true"
                            [error]="hasError('password','required') ? 'Mật khẩu là bắt buộc'
                                   : hasError('password','minlength') ? 'Tối thiểu 6 ký tự' : ''">
              <app-input id="password" formControlName="password"
                         [type]="showPassword() ? 'text' : 'password'"
                         [showPasswordToggle]="true"
                         [passwordVisible]="showPassword()"
                         (passwordToggle)="showPassword.set(!showPassword())" />
            </app-form-field>
          </div>
        }

        <div class="form-row">
          <div class="form-group">
            <app-form-field id="phone" label="Số điện thoại"
                            [error]="hasError('phone','pattern') ? 'Số điện thoại không hợp lệ' : ''">
              <app-input id="phone" formControlName="phone" type="tel" />
            </app-form-field>
          </div>
          <div class="form-group">
            <app-form-field id="address" label="Địa chỉ">
              <app-input id="address" formControlName="address" type="textarea" [rows]="3" />
            </app-form-field>
          </div>
        </div>
      </div>
    </app-card>

    <!-- Section: Vai trò + trạng thái -->
    <!-- ... các app-card khác, mỗi card dùng header div THỦ CÔNG ... -->

    <!-- Actions -->
    <div class="flex justify-end gap-2">
      <app-button variant="secondary" icon="close" label="Hủy" (click)="onCancel()" />
      <app-button variant="primary"
                  [icon]="isEditMode() ? 'save' : 'person_add'"
                  [label]="submitButtonText()"
                  type="submit" [loading]="isSubmitting()" />
    </div>

  </form>
}
```

### 9.3 Field "Vai trò" dạng checkbox

```html
<app-form-field id="roleNames" label="Vai trò" [required]="true"
                [error]="hasError('roleNames','required') ? 'Vui lòng chọn ít nhất một vai trò' : ''">
  @for (role of roles(); track role.id) {
    <label class="flex items-center gap-2 py-1 cursor-pointer">
      <input type="checkbox"
             [checked]="isRoleSelected(role.name)"
             (change)="onRoleToggle(role.name, $event)" />
      <app-badge [label]="role.name"
                 [variant]="getRoleVariant(role.name)"
                 [size]="'sm'" />
    </label>
  }
</app-form-field>
```

### 9.4 Submit payload

```ts
// Edit mode
const userData: UserUpdateRequest = {
  email: formValue.email,
  fullName: formValue.fullName,
  phone: formValue.phone || undefined,
  address: formValue.address || undefined,
  roleNames: formValue.roleNames,
  active: formValue.active,
  ...(formValue.password ? { password: formValue.password } : {}),   // mật khẩu tùy chọn khi edit
  ...(this.selectedAvatar() ? { avatar: this.selectedAvatar()! } : {}),
};

// Create mode
const userData: UserCreationRequest = {
  email: formValue.email,
  password: formValue.password,
  fullName: formValue.fullName,
  phone: formValue.phone || undefined,
  address: formValue.address || undefined,
  roleNames: formValue.roleNames,
  ...(this.selectedAvatar() ? { avatar: this.selectedAvatar()! } : {}),
};
```

> ⚠️ **BẪY #5 — Áp dụng tại đây**: component.ts **imports `CardHeaderComponent`** và đưa vào mảng `imports`, **nhưng** HTML không dùng thẻ `<app-card-header>` — các section dùng div header thủ công. Hệ quả: `hasHeader()` của CardComponent luôn `false`. Khi bạn thêm `<app-card-header>` thật, hãy bỏ div thủ công để tránh trùng border/padding.

> **Chỗ nào thêm/đổi tên field form**:
> 1. Thêm control vào `userForm` (§9.1) — kèm validators.
> 2. Thêm helper `hasError('tênControl', 'validator')` nếu cần.
> 3. Thêm block `app-form-field` + `app-input`/`app-select` trong HTML (§9.2).
> 4. Cập nhật payload trong `onSubmit()` (§9.4) nếu field gửi lên backend.
> 5. **Cross-check backend**: mở DTO tương ứng trong `laptopshop-be/` (xem §1.5 / CLAUDE.md) — tên field và kiểu dữ liệu phải khớp.

### 9.5 Nhắc cross-check API (quy tắc bắt buộc của project)

Khi sửa form, luôn mở các file Backend để đối chiếu trước:

- **Controller**: `laptopshop-be/src/main/java/.../controller/UserController.java` → đường dẫn `@RequestMapping`, method `@PostMapping/@PutMapping`.
- **DTO**: `UserCreationRequest` / `UserUpdateRequest` → danh sách field, kiểu, validation (`@NotBlank`, `@Email`...).
- **Response**: `UserResponse` → cấu trúc trả về (để đối chiếu model Angular ở `src/app/core/models/user.model.ts`).

---

## 10. Cookbook — Các thao tác sửa đổi thường gặp

> Mỗi thao tác gồm **Trước → Sau** (diff). Dấu `-` là dòng bị xóa, dấu `+` là dòng được thêm.

### 10.1 Thêm một cột mới (Users)

**Ví dụ**: thêm cột "Ngày sinh" (birthDate).

**Trước**:

```ts
// users.component.ts — columns
{ key: 'phone', label: 'Số điện thoại' },
```

**Sau**:

```ts
// users.component.ts — columns
{ key: 'phone',     label: 'Số điện thoại' },
{ key: 'birthDate', label: 'Ngày sinh', sortable: true },
```

```html
<!-- users.component.html — thêm template -->
<ng-template #birthDateColumn let-user>
  {{ user.birthDate ? formatDate(user.birthDate) : '—' }}
</ng-template>
```

```ts
// users.component.ts — @ViewChild + templateMap
@ViewChild('birthDateColumn', { static: true }) birthDateColumn?: TemplateRef<{ $implicit: UserResponse }>;

// trong templateMap:
birthDate: this.birthDateColumn!,
```

> Nhớ đảm bảo model `UserResponse` có field `birthDate` (và backend trả về) — cross-check với BE.

### 10.2 Ẩn / hiện một cột (Users)

**Ví dụ**: ẩn cột "Email" tạm thời.

**Trước**:

```ts
{ key: 'email', label: 'Email', sortable: true },
```

**Sau**:

```ts
{ key: 'email', label: 'Email', sortable: true, visible: false },
```

> Cấu hình vẫn giữ nguyên (sortable, template), chỉ không render. Đổi lại `true` (hoặc bỏ `visible`) để hiện lại.

### 10.3 Đổi label cột (Users)

**Trước**:

```ts
{ key: 'status', label: 'Trạng thái', width: '170px', align: 'center' },
```

**Sau**:

```ts
{ key: 'status', label: 'Tình trạng hoạt động', width: '170px', align: 'center' },
```

### 10.4 Đổi màu badge vai trò (Users)

**Ví dụ**: role `MANAGER` đổi từ `info` sang `warning`.

**Trước**:

```ts
getRoleVariant(roleName: string): BadgeVariant {
  const roleVariants: Record<string, BadgeVariant> = {
    ADMIN: 'danger', STAFF: 'warning', USER: 'primary',
    MANAGER: 'info', SUPER_ADMIN: 'danger',
  };
  return roleVariants[roleName] || 'neutral';
}
```

**Sau**:

```ts
getRoleVariant(roleName: string): BadgeVariant {
  const roleVariants: Record<string, BadgeVariant> = {
    ADMIN: 'danger', STAFF: 'warning', USER: 'primary',
    MANAGER: 'warning', SUPER_ADMIN: 'danger',   // đổi info → warning
  };
  return roleVariants[roleName] || 'neutral';
}
```

> Nhớ **BẪY #4**: `info` và `primary` trông giống hệt nhau — tránh map 2 role khác nhau vào 2 variant này nếu muốn phân biệt màu.

### 10.5 Thêm một field vào form (User Form)

**Ví dụ**: thêm field `note` (ghi chú).

**Trước**:

```ts
// user-form.component.ts — FormGroup
address: [''],
```

**Sau**:

```ts
// user-form.component.ts — FormGroup
address: [''],
note:    [''],                                    // field mới, không bắt buộc
```

```html
<!-- user-form.component.html — thêm block trong section phù hợp -->
<div class="form-group">
  <app-form-field id="note" label="Ghi chú">
    <app-input id="note" formControlName="note" type="textarea" [rows]="2" />
  </app-form-field>
</div>
```

```ts
// user-form.component.ts — onSubmit(): thêm vào payload
note: formValue.note || undefined,
```

> **Cross-check backend**: nếu DTO `UserUpdateRequest`/`UserCreationRequest` chưa có field `note`, bạn phải thêm ở Backend trước, nếu không request sẽ bị bỏ qua hoặc lỗi validation.

### 10.6 Thêm một table action (Users)

**Ví dụ**: thêm action "Đặt lại mật khẩu".

**Trước**:

```ts
actions: TableAction<UserResponse>[] = [
  { label: 'Xem chi tiết', icon: 'visibility', variant: 'ghost', handler: (u) => this.viewUser(u) },
  { label: 'Chỉnh sửa', icon: 'edit', variant: 'ghost', handler: (u) => this.editUser(u) },
  { label: 'Xóa', icon: 'delete', variant: 'danger', handler: (u) => this.deleteUser(u) },
  { label: 'Khóa tài khoản', icon: 'block', variant: 'ghost', handler: (u) => this.toggleUserStatus(u) },
];
```

**Sau**:

```ts
actions: TableAction<UserResponse>[] = [
  { label: 'Xem chi tiết', icon: 'visibility', variant: 'ghost', handler: (u) => this.viewUser(u) },
  { label: 'Chỉnh sửa', icon: 'edit', variant: 'ghost', handler: (u) => this.editUser(u) },
  { label: 'Đặt lại mật khẩu', icon: 'key', variant: 'ghost', handler: (u) => this.resetPassword(u) },
  { label: 'Xóa', icon: 'delete', variant: 'danger', handler: (u) => this.deleteUser(u) },
  { label: 'Khóa tài khoản', icon: 'block', variant: 'ghost', handler: (u) => this.toggleUserStatus(u) },
];
```

Và thêm method trong component:

```ts
resetPassword(user: UserResponse): void {
  // mở dialog hoặc gọi API userService.resetPassword(user.id)...
}
```

### 10.7 Đổi mật độ bảng (Users)

**Ví dụ**: chuyển từ `comfortable` sang `compact`.

**Trước**:

```html
<app-table [data]="filteredUsers()" [columns]="columns()" ...>
```

**Sau**:

```html
<app-table [data]="filteredUsers()" [columns]="columns()"
           [density]="'compact'" ...>
```

> Nhớ **BẪY #6**: mật độ áp qua class `table-compact` trên `div.table-container` (styles.css) — nếu bảng trông không đổi, kiểm tra class trong `styles.css` chứ không phải thẻ `<table>`.

---

## 11. Checklist tự sửa đổi (8 mục)

Trước khi báo "xong", duyệt lại toàn bộ:

1. **☐ Modern syntax**: mọi vòng lặp dùng `@for (...; track ...)`, điều kiện dùng `@if/@else` — **không** có `*ngIf`, `*ngFor`, `*if`.
2. **☐ Signal calls `()`**: trong template, mọi signal được gọi với `()` (`{{ title() }}`, `[data]="filteredUsers()"`).
3. **☐ Imports đúng nơi**: nếu thêm component, thêm vào **cả** lệnh import lẫn mảng `imports` của `@Component`.
4. **☐ `trackByFn` đúng model**: nếu model không có `id`, truyền `trackByFn` riêng (không dùng mặc định).
5. **☐ Variant hợp lệ**: `TableAction.variant` (4 giá trị), `EmptyState.actionVariant` (4 giá trị), `Button.variant` (6 giá trị) — không nhầm lẫn.
6. **☐ `id` trùng nhau**: `app-form-field` và `app-input`/`app-select` bên trong có cùng `id`.
7. **☐ Cross-check backend**: field/path/method khớp Controller + DTO ở `laptopshop-be/`.
8. **☐ `ng build` = 0 lỗi**: chạy build theo §12 và sửa triệt để lỗi trước khi bàn giao.

---

## 12. Xác minh `ng build` (0 lỗi) + các lỗi thường gặp

### 12.1 Quy trình chuẩn

```bash
# Từ thư mục laptopshop-fe/
ng build
```

- **Kết quả mong muốn**: kết thúc bằng dòng tương tự `✔ Initial chunk files ...` và **không có** `Error` / `WARNING` đỏ nào.
- Theo quy trình project (CLAUDE.md §5), **chỉ báo hoàn thành khi `ng build` đạt 0 lỗi**. Nếu lỗi, đọc dòng `Error:` đầu tiên, sửa, rồi build lại.

### 12.2 Các lỗi thường gặp và cách sửa

**① Lỗi template: `NG0303` / "is not a known element"**

```
Can't bind to 'columns' since it isn't a known property of 'app-table'.
```

→ Component chưa được import vào mảng `imports` của trang. Thêm import + khai báo (xem §3.1, §4.13).

**② Lỗi `track` trong `@for`**

```
Cannot use @for without specifying a track expression.
```

→ Thêm `track` vào vòng lặp: `@for (x of xs; track x.id)`.

**③ Lỗi `actions` variant**

```
Type '"success"' is not assignable to type '"primary" | "secondary" | "ghost" | "danger"'.
```

→ **BẪY #3**: đổi `variant` của `TableAction` về 1 trong 4 giá trị hợp lệ.

**④ Lỗi `type` của Button**

```
Type '"date"' is not assignable to type '"button" | "submit" | "reset"'.
```

→ **BẪY #2**: `app-button` không nhận type input đầy đủ — chỉ `button|submit|reset`. Muốn input date hãy dùng `app-input type="..."`.

**⑤ Lỗi `ariaLabel` / `ariaLabelPrefix`**

```
Can't bind to 'ariaLabel' since it isn't a known property of 'app-table'.
```

→ **BẪY #10**: Bảng dùng `ariaLabelPrefix`, không dùng `ariaLabel`. `ariaLabel` chỉ tồn tại trên `app-button`, `app-input`, `app-select`.

**⑥ Lỗi signal không gọi `()`**

```
Property 'filteredUsers' does not exist on type '...'. Did you mean 'filteredUsers()'?
```

→ Trong template phải viết `filteredUsers()` (có dấu ngoặc).

**⑦ Lỗi "Property 'id' does not exist on type" (trackByFn)**

→ **BẪY #7**: model không có `id`. Truyền `[trackByFn]` riêng, ví dụ `[trackByFn]="trackByUserId"`.

**⑧ Lỗi `dot` badge không có tác dụng**

→ **BẪY #4**: không phải lỗi build — `dot` chưa được render. Đừng dựa vào nó; nếu cần chấm tròn, dùng icon hoặc sửa `badge.component.ts`.

### 12.3 Sau khi build xong

- Chạy thử bằng `ng serve` → mở `http://localhost:4200/` → kiểm tra trang Users và User Form hiển thị đúng.
- Test nhanh: tìm kiếm, lọc theo vai trò, chọn nhiều hàng, mở kebab menu, mở form tạo/sửa người dùng, kiểm tra validation lỗi đỏ.

---

## Phụ lục A — Bản đồ file nhanh

| Bạn muốn làm gì | Sửa file nào |
|---|---|
| Đổi giao diện nút | `shared/components/button/button.component.ts` |
| Đổi giao diện ô input / select | `shared/components/input/input.component.ts`, `select/select.component.ts` |
| Đổi label/error/hint của form field | `shared/components/form-field/form-field.component.ts` |
| Đổi màu badge | `shared/components/badge/badge.component.ts` (+ `styles.css`) |
| Đổi bảng (header, kebab, mật độ) | `shared/components/table/table.component.ts` (+ `styles.css`) |
| Đổi loading / empty state | `loading/loading.component.ts`, `empty-state/empty-state.component.ts` |
| Đổi header trang | `shared/components/page-header/page-header.component.ts` (bản hiện đại) |
| Thêm/sửa cột, action của trang Users | `features/admin/pages/users/users.component.ts` + `.html` |
| Thêm/sửa field của form người dùng | `features/admin/pages/user-form/user-form.component.ts` + `.html` |
| Thêm class thiết kế chung | `src/styles.css` |
| Thêm/đổi API service | `src/app/core/services/*` + **cross-check** `laptopshop-be/` |

---

_Tài liệu soạn cho LaptopShop Admin. Mọi selector, input, output, type trong tài liệu đều đối chiếu trực tiếp với source code trong `src/app/shared/components/`._
