import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientAuthService } from '@core/services/client-auth.service';
import { UserInfo, getInitials, getPrimaryRole } from '@core/models/user.model';

/**
 * Storefront layout — header + outlet + footer. Đơn giản hơn admin:
 * - KHÔNG có sidebar.
 * - Header: logo + search + cart icon + user menu (nếu đã login) hoặc
 *   link "Đăng nhập / Đăng ký" (nếu chưa).
 * - Footer: thông tin cơ bản.
 *
 * Lưu ý: search bar chỉ là UI (Sprint 1) — submit sẽ navigate về
 * `/client/products?keyword=...`. Cart icon đếm số item guest (Sprint 2
 * sẽ sync với server cart sau login).
 */
@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MatIconModule],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.css',
})
export class ClientLayoutComponent {
  private readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);

  readonly userInfo = signal<UserInfo | null>(this.auth.getUserInfo());
  readonly isAuthenticated = signal<boolean>(this.auth.isAuthenticated());
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly userMenuOpen = signal<boolean>(false);
  readonly searchKeyword = signal<string>('');

  getInitials = getInitials;
  getPrimaryRole = getPrimaryRole;

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  onSearch(): void {
    const keyword = this.searchKeyword().trim();
    if (!keyword) {
      this.router.navigate(['/products']);
      return;
    }
    this.router.navigate(['/products'], { queryParams: { keyword } });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.isAuthenticated.set(false);
        this.userInfo.set(null);
        this.userMenuOpen.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        // Dù lỗi, vẫn clear local và điều hướng (FE fail-safe)
        this.isAuthenticated.set(false);
        this.userInfo.set(null);
        this.userMenuOpen.set(false);
        this.router.navigate(['/']);
      },
    });
  }
}
