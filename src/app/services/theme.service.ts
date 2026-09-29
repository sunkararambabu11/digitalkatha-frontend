import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'digitalkatha_theme';
  private currentThemeSubject = new BehaviorSubject<ThemeMode>(this.getStoredTheme());

  constructor() {
    this.applyTheme(this.currentThemeSubject.value);

    // Re-apply once DOM is fully parsed in case document.body was not ready yet
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.applyTheme(this.currentThemeSubject.value);
        });
      }
    }
  }

  get theme(): ThemeMode {
    return this.currentThemeSubject.value;
  }

  get isDark(): boolean {
    return this.currentThemeSubject.value === 'dark';
  }

  get theme$(): Observable<ThemeMode> {
    return this.currentThemeSubject.asObservable();
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.isDark ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: ThemeMode): void {
    this.currentThemeSubject.next(theme);
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (_) {}
    this.applyTheme(theme);
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (root) {
        root.setAttribute('data-theme', theme);
        if (theme === 'dark') {
          root.classList.add('dark');
          root.classList.add('dark-theme');
        } else {
          root.classList.remove('dark');
          root.classList.remove('dark-theme');
        }
      }
      if (document.body) {
        document.body.setAttribute('data-theme', theme);
        if (theme === 'dark') {
          document.body.classList.add('dark');
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark');
          document.body.classList.remove('dark-theme');
        }
      }
    }
  }

  private getStoredTheme(): ThemeMode {
    try {
      const stored = localStorage.getItem(this.THEME_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch (_) {}

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }
}
