import { Component, input, output, signal, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { UserInfo, getInitials, getPrimaryRole } from '@core/models/user.model';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, AvatarComponent, BadgeComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
})
export class UserMenuComponent {
  private readonly router = inject(Router);

  // User tóm tắt truyền từ layout (Header/Sidebar/Client)
  user = input<UserInfo | null>(null);
  // Phát sự kiện logout — layout cha sẽ gọi AuthService.logout()
  logout = output<void>();

  readonly showMenu = signal(false);
  readonly initials = computed(() => getInitials(this.user()?.fullName));
  readonly displayName = computed(() => this.user()?.fullName || 'Quản trị viên');
  readonly roleName = computed(() => getPrimaryRole(this.user()?.roleNames));

  toggle(): void {
    this.showMenu.update((v) => !v);
  }

  close(): void {
    this.showMenu.set(false);
  }

  navigate(path: string): void {
    this.router.navigate([path]);
    this.close();
  }

  onLogout(): void {
    this.logout.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.close();
    }
  }
}
