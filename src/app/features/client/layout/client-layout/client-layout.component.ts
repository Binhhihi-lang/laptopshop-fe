import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { ThemeService } from '@core/services/theme.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import { NotificationBellComponent } from '@shared/components';
import { UserInfo, getInitials } from '@core/models/user.model';

/** Storefront layout: header (search + cart + user) + outlet + footer. */
@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MatIconModule, NotificationBellComponent],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.css',
})
export class ClientLayoutComponent {
  private readonly auth = inject(ClientAuthService);
  private readonly cartService = inject(ClientCartService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly theme = inject(ThemeService);

  readonly userInfo = signal<UserInfo | null>(this.auth.getUserInfo());
  readonly isAuthenticated = signal<boolean>(this.auth.isAuthenticated());
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly userMenuOpen = signal<boolean>(false);
  readonly searchKeyword = signal<string>('');
  readonly cartCount = signal<number>(0);

  getInitials = getInitials;

  constructor() {
    // Sync khi auth state đổi (login / logout / register).
    this.auth.isAuthenticated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.isAuthenticated.set(this.auth.isAuthenticated());
      this.userInfo.set(this.auth.getUserInfo());
      // Delay 1 tick để đảm bảo token đã được lưu vào localStorage và
      // JwtInterceptor đọc được token mới trước khi gọi API getCart().
      setTimeout(() => this.refreshCartCount(), 0);
    });
    // Sync khi userInfo đổi (profile update fullName/avatar).
    this.auth.userInfo$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((info) => {
      this.userInfo.set(info);
    });
    // Badge giỏ hàng realtime.
    this.cartService.cartCount$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((count) => {
      this.cartCount.set(count);
    });
    this.refreshCartCount();
  }

  /** Đã login thì đếm từ server, chưa login thì đếm từ localStorage. */
  private refreshCartCount(): void {
    if (this.auth.isAuthenticated()) {
      this.cartService.getCart().subscribe({
        next: (cart) => this.cartService.setCount(cart.totalItems),
        error: () => this.cartService.setCount(0),
      });
    } else {
      this.cartService.setCount(this.cartService.countGuestItems());
    }
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

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

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  logout(): void {
    // Hỏi xác nhận trước khi đăng xuất — mất phiên không hoàn tác được.
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: 'Đăng xuất',
        message: 'Bạn có chắc muốn đăng xuất khỏi tài khoản?',
      },
    });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.auth.logout().subscribe({
          next: () => this.handleLogoutSuccess(),
          error: () => this.handleLogoutSuccess(),
        });
      });
  }

  private handleLogoutSuccess(): void {
    this.isAuthenticated.set(false);
    this.userInfo.set(null);
    this.userMenuOpen.set(false);
    // Về giỏ guest (localStorage) thay vì giỏ server của user vừa logout.
    this.cartService.setCount(this.cartService.countGuestItems());
    this.router.navigate(['/']);
  }
}
