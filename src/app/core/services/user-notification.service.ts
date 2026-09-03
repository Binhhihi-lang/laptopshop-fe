import { Injectable, computed, signal } from '@angular/core';

export type AppNotificationType = 'info' | 'warning' | 'success' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: AppNotificationType;
}

// Dữ liệu mẫu thay cho mảng hardcode trước đây nằm trong Header.
// Khi có API thông báo, chỉ cần gán stream từ backend vào _notifications.
const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    title: 'Đơn hàng mới',
    message: 'Đơn #ORD-2024-001 từ Nguyễn Văn A',
    time: '2 phút trước',
    read: false,
    type: 'info',
  },
  {
    id: '2',
    title: 'Cảnh báo tồn kho',
    message: 'MacBook Pro 14" chỉ còn 3 sản phẩm',
    time: '15 phút trước',
    read: false,
    type: 'warning',
  },
  {
    id: '3',
    title: 'Người dùng mới',
    message: 'Trần Thị B đăng ký với vai trò STAFF',
    time: '1 giờ trước',
    read: true,
    type: 'success',
  },
  {
    id: '4',
    title: 'Hệ thống',
    message: 'Bản cập nhật bảo mật đã được áp dụng',
    time: '3 giờ trước',
    read: true,
    type: 'info',
  },
  {
    id: '5',
    title: 'Mã giảm giá',
    message: 'SUMMER20 sắp hết hạn trong 2 ngày',
    time: '5 giờ trước',
    read: false,
    type: 'warning',
  },
];

@Injectable({ providedIn: 'root' })
export class UserNotificationService {
  private readonly _notifications = signal<AppNotification[]>(SEED_NOTIFICATIONS);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  markAsRead(id: string): void {
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllAsRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }
}
