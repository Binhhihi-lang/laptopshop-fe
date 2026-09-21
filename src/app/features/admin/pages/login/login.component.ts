import { Component } from '@angular/core';
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
  loading = false;
  errorMessage = '';
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
      this.errorMessage = 'Vui lòng nhập email và mật khẩu';
      return;
    }
    if (!this.isEmailValid()) {
      this.emailTouched = true;
      this.errorMessage = 'Email không hợp lệ';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Chốt chặn thứ hai sau adminGuard: trang này dành riêng cho quản trị nên
        // token không có ROLE_ADMIN/ROLE_STAFF (vd CUSTOMER) bị dọn phiên ngay,
        // không đi tiếp vào dashboard.
        if (!this.authService.hasRole('ADMIN') && !this.authService.hasRole('STAFF')) {
          this.loading = false;
          this.errorMessage = 'Tài khoản này không có quyền truy cập trang quản trị';
          this.authService.clearTokens();
          this.authService.clearUserInfo();
          return;
        }

        // Login successful, redirect to admin dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.loading = false;
        // Handle error
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Email hoặc mật khẩu không đúng';
        }
      },
    });
  }
}
