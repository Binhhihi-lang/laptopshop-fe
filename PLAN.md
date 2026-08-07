## Kế hoạch chi tiết để đồng bộ giao diện từ mock-ui-angular vào laptopshop-fe

### Mục tiêu:
1. Đồng bộ giao diện header, sidebar, dashboard để giống hệt mock-ui-angular
2. Sử dụng Angular Material Icons kết hợp Tailwind CSS
3. Áp dụng Angular Signals cho trạng thái UI
4. Đảm bảo compatibility với services hiện tại (Observable-based)

### Phân tích sự khác biệt hiện tại:

#### Header:
- **Mock**: Sử dụng Lucide icons (Search, Bell) + Tailwind classes
- **Hiện tại**: Đã cập nhật để sử dụng Material icons + Tailwind (hoàn thành)

#### Sidebar:
- **Mock**: Uses Lucide icons (Menu, X, Laptop, ChevronLeft, etc.) + Signals for collapsed/mobileOpen + Tailwind
- **Hiện tại**: Cần cập nhật để sử dụng Signals và cấu trúc template như mock

#### Dashboard:
- **Mock**: 
  - Sử dụng Lucide icons + Signals (ChangeDetectionStrategy.OnPush)
  - Dữ liệu đồng bộ từ service methods getAll()
  - Template sử dụng @for, @if, lớp CSS cụ thể (Tailwind)
  - KPIs có structure: label, value, icon, tint, trend
- **Hiện tại**: 
  - Sử dụng subscription + Material icons
  - Dữ liệu từ forkJoin + observables
  - Cần cập nhật template để khớp với mock
  - Cần điều chỉnh cách hiển thị dữ liệu

### Các file cần cập nhật:

#### 1. Dashboard Component (`src/app/features/admin/pages/dashboard/`)
- **dashboard.ts**: 
  - Giữ approach hiện tại với forkJoin (do services trả về Observable)
  - Thay đổi cấu trúc KPI để khớp với mock
  - Cập nhật logic mapping data
  - Có thể chuyển sang sử dụng Signals nếu muốn tuân thủ nghiêm ngặt

- **dashboard.html**:
  - Hoàn toàn thay đổi template để khớp với mock
  - Giữ Angular Material icons nhưng thay đổi class names
  - Sử dụng cấu trúc `@for`, `@if` giống mock
  - Thêm các class Tailwind cụ thể từ mock

- **dashboard.css** (nếu cần):
  - Kiểm tra và cập nhật nếu cần thiết

#### 2. Sidebar Component (`src/app/features/admin/layout/sidebar/`)
- **sidebar.ts**: 
  - Chuyển đổi inputs/outputs sang sử dụng Signals
  - Thêm signal cho mobileOpen state
  - Cập nhật struct nav items

- **sidebar.html**:
  - Hoàn toàn thay đổi template để khớp với mock
  - Giữ cấu trúc HTML giống mock
  - Sử dụng Material icons thay thế Lucide

#### 3. Header Component (`src/app/features/admin/layout/header/`)
- **Đã hoàn thành** (từ bước trước)
  - Đã chuyển đổi sang sử dụng Signals
  - Template đã khớp với mock

#### 4. Global Styles & Configuration
- **styles.css**: Kiểm tra xem có cần thêm Tailwind base styles không
- **tailwind.config.js**: Kiểm tra cấu hình (nếu có)
- **angular.json**: Đảm bảo Tailwind được cấu hình đúng

### Quy trình triển khai:

#### Bước 1: Sidebar Component
1. Cập nhật sidebar.ts để sử dụng Signals
2. Thay thế sidebar.html hoàn toàn bằng template từ mock (adapt Material icons)
3. Kiểm tra và sửa sidebar.css nếu cần

#### Bước 2: Dashboard Component  
1. Cập nhật dashboard.html hoàn toàn bằng template từ mock
2. Cập nhật dashboard.ts để:
   - Giữ approche fetching data hiện tại (forkJoin + subscribe)
   - Ánh xạ dữ liệu sang 구조 KPI giống mock
   - Đảm bảo các thuộc tính như tint, trend được tính chính xác
3. Kiểm tra dashboard.css nếu cần

#### Bước 3: Kiểm tra toàn bộ
1. Chạy `ng build` để kiểm tra lỗi
2. Sửa tất cả lỗiTypeScript/CSS
3. Chạy `ng serve` để kiểm tra giao diện

### Lưu ý quan trọng:
- **Giữ nguyên API của components**: Inputs/Outputs phải không đổi để parent components (admin-layout) vẫn hoạt động
- **Không thay đổi services**: Services hiện tại trả về Observable, chúng ta sẽ làm việc với điều đó
- **Sử dụng Signals cho UI state**: collapsed, mobileOpen, etc. nhưng không bắt buộc phải dùng cho data fetching
- **Material Icons**: Thay thế Lucide icons bằng Material equivalents

### Các bước cụ thể để thực hiện:

**Sidebar:**
1. sidebar.ts: Chuyển sang sử dụng input()/output() signals
2. sidebar.html: Thay thế hoàn toàn bằng template từ mock-ui-angular
3. Điều chỉnh các class và event handlers

**Dashboard:**
1. dashboard.html: Thay thế hoàn toàn bằng template từ mock-ui-angular  
2. dashboard.ts: 
   - Giữ constructor và forkJoin logic
   - Cập nhât mapping data để tạo KPI array
   - Đảm bảo mỗi KPI có: label, value, string; icon, string (Material icon name); tint, string; trend, object
3. Kiểm tra và sửa các références đến services nếu cần

### CSS & Assets:
- Kiểm tra src/styles.css để đảm bảo có `@tailwind base; @tailwind components; @tailwind utilities;`
- Xác nhận tailwind.config.js có cấu hình content đúng
- Xác nhận angular.js cho phép Tailwind làm việc

### Kiểm tra cuối cùng:
- ng build phải thành công với 0 errors
- Giao diện phải trùng khớp visual với mock-ui-angular
- Tất cả chức năng (navigation, logout, toggle sidebar) phải vẫn hoạt động
