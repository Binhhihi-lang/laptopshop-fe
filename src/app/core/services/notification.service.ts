import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'info' | 'warn';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 2000): void {
    this.show(message, 'info', duration);
  }

  warn(message: string, duration = 3000): void {
    this.show(message, 'warn', duration);
  }

  /** Trích xuất message thân thiện từ HttpErrorResponse hoặc lỗi bất kỳ. */
  extractError(error: any): string {
    return error?.error?.message || error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.';
  }

  private show(message: string, type: NotificationType, duration: number): void {
    this.snackBar.open(message, 'Đóng', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`app-snackbar-${type}`],
    });
  }
}
