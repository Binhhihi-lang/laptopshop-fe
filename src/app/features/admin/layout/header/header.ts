import {
  Component,
  input,
  output,
  computed,
  inject,
  signal,
  effect,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { RouterModule, Router } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationBellComponent, UserMenuComponent } from '@shared/components';
import { UserInfo } from '@core/models/user.model';

interface RecentSearch {
  query: string;
  timestamp: number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MaterialModule,
    RouterModule,
    CommonModule,
    FormsModule,
    NotificationBellComponent,
    UserMenuComponent,
  ],
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

  // Theme
  readonly isDark = this.themeService.isDark;

  // Search state
  readonly searchQuery = signal('');
  readonly showSearchResults = signal(false);
  readonly recentSearches = signal<RecentSearch[]>([]);
  readonly searchFocused = signal(false);
  private searchDebounceTimer: any;

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

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
    const filtered = recent.filter((s) => s.query.toLowerCase() !== query.toLowerCase());
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

  // Theme handler
  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onLogout(): void {
    this.logout.emit();
  }

  // Click outside handlers
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container') && !this.searchFocused()) {
      this.showSearchResults.set(false);
    }
  }
}
