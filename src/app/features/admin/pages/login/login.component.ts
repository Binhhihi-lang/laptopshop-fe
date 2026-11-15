import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { ButtonComponent, FormFieldComponent, InputComponent } from '@shared/components';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    MatIconModule,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
  ],
})
export class LoginComponent {
  email = '';
  password = '';
  // loading/errorMessage là signal: callback lỗi HTTP chạy ngoài change detection
  // nên nếu là biến thường thì view không vẽ lại (nút quay mãi, không hiện lỗi
  // cho tới khi user chạm vào input).
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  // Cờ touched để chỉ hiện lỗi sau khi user rời ô, không hiện ngay khi mở trang.
  emailTouched = false;
  passwordTouched = false;

  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  /** Nội dung panel trái — phong cách quản trị, khác perk của storefront. */
  readonly perks = [
    { icon: 'inventory_2', label: 'Quản lý sản phẩm, danh mục và tồn kho' },
    { icon: 'receipt_long', label: 'Xử lý đơn hàng và trạng thái giao vận' },
    { icon: 'verified_user', label: 'Phân quyền, khóa tài khoản và nhật ký' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.emailTouched = true;
      this.passwordTouched = true;
      this.errorMessage.set('Vui lòng nhập email và mật khẩu');
      return;
    }
    if (!this.isEmailValid()) {
      this.emailTouched = true;
      this.errorMessage.set('Email không hợp lệ');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Chốt chặn thứ hai sau adminGuard: trang này dành riêng cho quản trị nên
        // token không có ROLE_ADMIN/ROLE_STAFF (vd CUSTOMER) bị dọn phiên ngay,
        // không đi tiếp vào dashboard.
        if (!this.authService.hasRole('ADMIN') && !this.authService.hasRole('STAFF')) {
          this.loading.set(false);
          this.errorMessage.set('Tài khoản này không có quyền truy cập trang quản trị');
          this.authService.clearTokens();
          this.authService.clearUserInfo();
          return;
        }

        // Login successful, redirect to admin dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error?.error?.message || 'Email hoặc mật khẩu không đúng',
        );
      },
    });
  }
}
