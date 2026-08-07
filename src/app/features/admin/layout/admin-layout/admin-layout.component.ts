import { Component, effect, inject, signal, HostListener } from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { Header } from '@features/admin/layout/header/header';
import { Sidebar } from '@features/admin/layout/sidebar/sidebar';
import { ThemeService } from '@core/services/theme.service';

interface UserInfo {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    MaterialModule,
    RouterModule,
    Header,
    Sidebar
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  // Sidebar state signals
  readonly isSidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);

  // User info
  userInfo: UserInfo | null = null;

  // Screen width for responsive handling
  readonly screenWidth = signal(window.innerWidth);

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.screenWidth.set((event.target as Window).innerWidth);
    // Auto-close mobile sidebar on resize to desktop
    if (this.screenWidth() >= 1024) {
      this.mobileSidebarOpen.set(false);
    }
  }

  constructor() {
    this.userInfo = this.authService.getUserInfo();

    // Sync sidebar state from Sidebar component
    effect(() => {
      // This effect will run when sidebar state changes
      // Could add persistence logic here
    });
  }

  onSidebarCollapsedChange(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }

  onMobileSidebarChange(open: boolean): void {
    this.mobileSidebarOpen.set(open);
  }

  onToggleSidebar(): void {
    // On mobile, toggle mobile overlay
    // On desktop, toggle collapsed state
    if (this.screenWidth() < 1024) {
      this.mobileSidebarOpen.set(!this.mobileSidebarOpen());
    } else {
      this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }

  // Computed classes for main content area
  get mainContentClasses(): string {
    const base = 'flex flex-col min-h-screen lg:pl-0 transition-all duration-300';
    const desktopPadding = this.isSidebarCollapsed() ? 'lg:pl-20' : 'lg:pl-64';
    return `${base} ${desktopPadding}`;
  }
}