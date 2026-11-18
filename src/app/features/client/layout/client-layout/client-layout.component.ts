import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientCartService } from '@core/services/client-cart.service';
import { ThemeService } from '@core/services/theme.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import { NotificationBellComponent } from '@shared/components/client-components';
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
  private readonly document = inject(DOCUMENT);
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('mobileDrawer');
  /** overflow gốc của body — trả lại đúng giá trị khi đóng drawer. */
  private bodyOverflowBeforeLock: string | null = null;
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
    // Rời layout khi drawer còn mở (hiếm) vẫn phải trả lại cuộn cho body.
    this.destroyRef.onDestroy(() => this.unlockBodyScroll());
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
    if (this.mobileMenuOpen()) {
      this.closeMobileMenu();
      return;
    }
    this.userMenuOpen.set(false);
    this.mobileMenuOpen.set(true);
    this.lockBodyScroll();
    // Chờ panel render xong rồi đưa focus vào dialog (screen reader đọc được).
    setTimeout(() => this.drawerPanel()?.nativeElement.focus(), 0);
  }

  /** Đóng drawer; returnFocus=false khi đóng do resize/điều hướng. */
  closeMobileMenu(returnFocus = true): void {
    if (!this.mobileMenuOpen()) {
      return;
    }
    this.mobileMenuOpen.set(false);
    this.unlockBodyScroll();
    if (returnFocus) {
      this.menuToggle()?.nativeElement.focus();
    }
  }

  private lockBodyScroll(): void {
    if (this.bodyOverflowBeforeLock !== null) {
      return;
    }
    this.bodyOverflowBeforeLock = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.bodyOverflowBeforeLock === null) {
      return;
    }
    this.document.body.style.overflow = this.bodyOverflowBeforeLock;
    this.bodyOverflowBeforeLock = null;
  }

  /** Lên desktop thì hamburger biến mất — đóng drawer để không khóa cuộn. */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.mobileMenuOpen() && (this.document.defaultView?.innerWidth ?? 0) >= 768) {
      this.closeMobileMenu(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.mobileMenuOpen()) {
      this.closeMobileMenu();
      return;
    }
    this.userMenuOpen.set(false);
  }

  /** Focus trap cơ bản: Tab/Shift+Tab không thoát khỏi drawer đang mở. */
  @HostListener('document:keydown', ['$event'])
  onTabKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.mobileMenuOpen()) {
      return;
    }
    const panel = this.drawerPanel()?.nativeElement;
    if (!panel) {
      return;
    }
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  onSearch(): void {
    // Tìm từ drawer thì đóng drawer trước khi điều hướng.
    this.closeMobileMenu(false);
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
