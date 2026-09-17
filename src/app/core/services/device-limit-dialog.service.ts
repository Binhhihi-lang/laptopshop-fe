import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { DeviceLimitDialogComponent } from '@shared/components/device-limit-dialog/device-limit-dialog.component';
import { DeviceInfo } from '@core/models/device.model';

/**
 * Mở dialog "đã đủ thiết bị đăng nhập" và trả về thiết bị user chọn để đăng xuất.
 *
 * Tách thành service để cả trang login admin lẫn client dùng chung, tránh lặp
 * logic mở dialog + xử lý kết quả ở 2 nơi.
 */
@Injectable({ providedIn: 'root' })
export class DeviceLimitDialogService {
  private readonly dialog = inject(MatDialog);

  /**
   * @returns Observable phát ra danh sách `deviceId` user chọn (multi-select),
   * hoặc `undefined` nếu hủy.
   */
  open(devices: DeviceInfo[], maxSessions: number): Observable<string[] | undefined> {
    const ref = this.dialog.open(DeviceLimitDialogComponent, {
      data: { devices, maxSessions },
      disableClose: true, // buộc chọn Hủy hoặc xác nhận, không đóng bằng ESC/backdrop
      autoFocus: false,
      panelClass: 'custom-dialog-container', // loại bỏ padding Material mặc định
      maxWidth: '90vw', // responsive trên mobile
    });
    return ref.afterClosed().pipe(map((result) => result ?? undefined));
  }
}
