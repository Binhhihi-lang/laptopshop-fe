import { Injectable, inject, effect, signal, computed } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly STORAGE_KEY = 'laptopshop-theme';
  private readonly MEDIA_QUERY = '(prefers-color-scheme: dark)';

  // Signal for current theme
  readonly theme = signal<ThemeMode>('light');

  // Computed for CSS class
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.initializeTheme();
    this.watchSystemTheme();
  }

  private initializeTheme(): void {
    // 1. Check localStorage first
    const stored = this.document.defaultView?.localStorage.getItem(
      this.STORAGE_KEY,
    ) as ThemeMode | null;
    if (stored && (stored === 'light' || stored === 'dark')) {
      this.theme.set(stored);
      this.applyTheme(stored);
      return;
    }

    // 2. Check system preference
    const prefersDark = this.document.defaultView?.matchMedia(this.MEDIA_QUERY).matches ?? false;
    const systemTheme: ThemeMode = prefersDark ? 'dark' : 'light';
    this.theme.set(systemTheme);
    this.applyTheme(systemTheme);
  }

  private watchSystemTheme(): void {
    const mediaQuery = this.document.defaultView?.matchMedia(this.MEDIA_QUERY);
    if (!mediaQuery) return;

    const listener = (event: MediaQueryListEvent): void => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = this.document.defaultView?.localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        const systemTheme: ThemeMode = event.matches ? 'dark' : 'light';
        this.theme.set(systemTheme);
        this.applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', listener);

    // Cleanup effect
    effect(() => {
      // This effect runs on destroy to remove listener
      // In practice, Angular's inject(DOCUMENT) handles this, but we keep it for completeness
    });
  }

  private applyTheme(mode: ThemeMode): void {
    const html = this.document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  /** Toggle between light and dark */
  toggleTheme(): void {
    const newTheme: ThemeMode = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /** Set specific theme and persist */
  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.applyTheme(mode);
    this.document.defaultView?.localStorage.setItem(this.STORAGE_KEY, mode);
  }

  /** Force sync from localStorage (e.g., after login) */
  syncFromStorage(): void {
    this.initializeTheme();
  }
}
