import { Component } from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { Header } from '@features/admin/layout/header/header';
import { Sidebar } from '@features/admin/layout/sidebar/sidebar';

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
  isSidebarOpen = true;
  userInfo: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Get user info from auth service
    this.userInfo = this.authService.getUserInfo();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout() {
    this.authService.logout();
  }
}