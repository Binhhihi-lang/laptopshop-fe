import { Component, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  UserNotificationService,
  AppNotification,
  AppNotificationType,
} from '@core/services/user-notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent {
  private readonly svc = inject(UserNotificationService);

  readonly notifications = this.svc.notifications;
  readonly unreadCount = this.svc.unreadCount;
  readonly showNotifications = signal(false);

  markAsRead(id: string): void {
    this.svc.markAsRead(id);
  }

  markAllAsRead(): void {
    this.svc.markAllAsRead();
  }

  toggle(): void {
    this.showNotifications.update((v) => !v);
  }

  close(): void {
    this.showNotifications.set(false);
  }

  onNotificationClick(notification: AppNotification): void {
    if (!notification.read) {
      this.markAsRead(notification.id);
    }
    this.close();
  }

  getIcon(type: AppNotificationType): string {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }

  getIconClass(type: AppNotificationType): string {
    switch (type) {
      case 'warning':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'success':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'error':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notifications-container')) {
      this.close();
    }
  }
}
