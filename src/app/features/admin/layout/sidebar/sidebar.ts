import { Component, input, output, effect, signal, computed, inject } from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MaterialModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // Input/Output signals for parent communication
  collapsedInput = input(false);
  collapsedChange = output<boolean>();
  mobileOpenInput = input(false);
  mobileOpenChange = output<boolean>();

  // Internal signals
  private collapsedSignal = signal(false);
  readonly collapsed = this.collapsedSignal.asReadonly();
  readonly mobileOpen = this.mobileOpenInput;

  // Nav items:
  // - Vai trò/Quyền: chỉ hiện khi có MANAGE_ROLES_PERMISSIONS (STAFF không có → ẩn).
  // - Người dùng (Quản lý người dùng): chỉ hiện khi có READ_USER. STAFF THIẾU
  //   READ_USER (xem DataInitializer) nên menu này bị ẩn hoàn toàn với STAFF,
  //   tương tự như Vai trò/Quyền. STAFF chỉ truy cập được "Hồ sơ cá nhân"
  //   (/admin/profile) để xem/sửa thông tin của chính mình.
  readonly nav = computed<NavItem[]>(() => {
    const canManage = this.authService.hasPermission('MANAGE_ROLES_PERMISSIONS');
    const canViewUsers = this.authService.hasPermission('READ_USER');
    const all: NavItem[] = [
      { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', badge: 'new' },
      { path: '/admin/users', label: 'Người dùng', icon: 'people' },
      { path: '/admin/products', label: 'Sản phẩm', icon: 'inventory_2' },
      { path: '/admin/categories', label: 'Danh mục', icon: 'category' },
      { path: '/admin/coupons', label: 'Mã giảm giá', icon: 'local_offer' },
      { path: '/admin/roles', label: 'Vai trò', icon: 'shield' },
      { path: '/admin/permissions', label: 'Quyền', icon: 'key' },
    ];
    return all.filter((item) => {
      if (item.path === '/admin/roles' || item.path === '/admin/permissions') {
        return canManage;
      }
      if (item.path === '/admin/users') {
        return canViewUsers;
      }
      return true;
    });
  });

  constructor() {
    // Sync input signal to internal signal
    effect(() => {
      this.collapsedSignal.set(this.collapsedInput());
    });

    // Emit changes to parent
    effect(() => {
      this.collapsedChange.emit(this.collapsedSignal());
    });
  }

  toggleCollapse(): void {
    this.collapsedSignal.set(!this.collapsedSignal());
  }

  closeMobile(): void {
    this.mobileOpenChange.emit(false);
  }

  userInitials(): string {
    const user = this.authService.getUserInfo();
    if (!user) return 'AD';
    const first = user.firstName ? user.firstName[0] : '';
    const last = user.lastName ? user.lastName[0] : '';
    return (first + last || 'AD').toUpperCase();
  }

  userName(): string {
    const user = this.authService.getUserInfo();
    return user?.fullName || 'Administrator';
  }

  userRole(): string {
    const user = this.authService.getUserInfo();
    return user?.role || 'ADMIN';
  }

  navigateToProfile(): void {
    this.router.navigate(['/admin/profile']);
    this.closeMobile();
  }
}
