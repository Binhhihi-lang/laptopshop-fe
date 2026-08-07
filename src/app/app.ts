import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/services/theme.service'; // thêm service them light, dark

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('laptopshop-fe');
  private readonly themeService = inject(ThemeService);

  // Inject ThemeService to initialize theme on app startup
  constructor() {
    // ThemeService constructor auto-initializes theme
  }
}
