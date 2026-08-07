import { Component, input, output, computed, inject, signal, effect, HostListener, ViewChild, ElementRef } from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { RouterModule, Router } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UserInfo {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MaterialModule, RouterModule, CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Input/Output signals
  userInfo = input<UserInfo | null>(null);
  readonly logout = output<void>();
  readonly toggleSidebar = output<void>();

  // Computed for initials
  readonly initials = computed(() => {
    const user = this.userInfo();
    if (!user) return 'AD';
    const first = user.firstName ? user.firstName[0] : '';
    const last = user.lastName ? user.lastName[0] : '';
    return (first + last || 'AD').toUpperCase();
  });

  // Theme
  readonly isDark = this.themeService.isDark;

  // Search state
  readonly searchQuery = signal('');
  readonly showSearchResults = signal(false);
  readonly recentSearches = signal<RecentSearch[]>([]);
  readonly searchFocused = signal(false);
  private searchDebounceTimer: any;

  // Notifications state
  readonly showNotifications = signal(false);
  readonly notifications = signal<Notification[]>([
    { id: '1', title: 'Đơn hàng mới', message: 'Đơn #ORD-2024-001 từ Nguyễn Văn A', time: '2 phút trước', read: false, type: 'info' },
    { id: '2', title: 'Cảnh báo tồn kho', message: 'MacBook Pro 14" chỉ còn 3 sản phẩm', time: '15 phút trước', read: false, type: 'warning' },
    { id: '3', title: 'Người dùng mới', message: 'Trần Thị B đăng ký với vai trò STAFF', time: '1 giờ trước', read: true, type: 'success' },
    { id: '4', title: 'Hệ thống', message: 'Bản cập nhật bảo mật đã được áp dụng', time: '3 giờ trước', read: true, type: 'info' },
    { id: '5', title: 'Mã giảm giá', message: 'SUMMER20 sắp hết hạn trong 2 ngày', time: '5 giờ trước', read: false, type: 'warning' },
  ]);

  // User menu state
  readonly showUserMenu = signal(false);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  // Unread count
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  // Filtered notifications
  readonly filteredNotifications = computed(() => this.notifications());

  // Get notification icon class
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'error': return 'error';
      default: return 'info';
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'warning': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'success': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'error': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    }
  }

  // Get relative time display
  getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  }

  constructor() {
    // Load recent searches from localStorage
    effect(() => {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        try {
          this.recentSearches.set(JSON.parse(stored));
        } catch {
          this.recentSearches.set([]);
        }
      }
    });

    // Save recent searches to localStorage
    effect(() => {
      localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches()));
    });
  }

  // Search handlers
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.showSearchResults.set(value.length > 0);

    // Debounce search
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch(value);
    }, 300);
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
    if (this.recentSearches().length > 0 && !this.searchQuery()) {
      this.showSearchResults.set(true);
    }
  }

  onSearchBlur(): void {
    this.searchFocused.set(false);
    // Delay to allow click on results
    setTimeout(() => this.showSearchResults.set(false), 200);
  }

  performSearch(query: string): void {
    if (query.trim()) {
      // Navigate to search results page or emit event
      this.router.navigate(['/admin/search'], { queryParams: { q: query } });
      this.addToRecentSearches(query.trim());
      this.searchQuery.set('');
      this.showSearchResults.set(false);
    }
  }

  addToRecentSearches(query: string): void {
    const recent = this.recentSearches();
    const filtered = recent.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    const updated = [{ query, timestamp: Date.now() }, ...filtered].slice(0, 5);
    this.recentSearches.set(updated);
  }

  selectRecentSearch(search: RecentSearch): void {
    this.router.navigate(['/admin/search'], { queryParams: { q: search.query } });
    this.showSearchResults.set(false);
  }

  clearRecentSearches(): void {
    this.recentSearches.set([]);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.performSearch(this.searchQuery());
    } else if (event.key === 'Escape') {
      this.showSearchResults.set(false);
      this.searchInputRef?.nativeElement?.blur();
    }
  }

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInputRef?.nativeElement?.focus();
    }
  }

  // Notification handlers
  toggleNotifications(): void {
    this.showNotifications.set(!this.showNotifications());
    this.showUserMenu.set(false);
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  markAsRead(notification: Notification): void {
    this.notifications.update(notifs =>
      notifs.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
  }

  markAllAsRead(): void {
    this.notifications.update(notifs =>
      notifs.map(n => ({ ...n, read: true }))
    );
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.markAsRead(notification);
    }
    // Navigate based on notification type
    this.closeNotifications();
  }

  // Theme handler
  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }

  // User menu handlers
  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
    this.showNotifications.set(false);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  onLogout(): void {
    this.logout.emit();
  }

  navigateToProfile(): void {
    this.router.navigate(['/admin/profile']);
    this.closeUserMenu();
  }

  navigateToSettings(): void {
    this.router.navigate(['/admin/settings']);
    this.closeUserMenu();
  }

  // Click outside handlers
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container') && !this.searchFocused()) {
      this.showSearchResults.set(false);
    }
    if (!target.closest('.notifications-container')) {
      this.showNotifications.set(false);
    }
    if (!target.closest('.user-menu-container')) {
      this.showUserMenu.set(false);
    }
  }
}