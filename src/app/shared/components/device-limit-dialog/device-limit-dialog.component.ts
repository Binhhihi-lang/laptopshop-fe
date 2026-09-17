import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DeviceInfo } from '@core/models/device.model';

/**
 * Dialog hiện khi user login nhưng đã đủ số thiết bị tối đa.
 *
 * User chọn MỘT HOẶC NHIỀU thiết bị rồi bấm "Đăng xuất thiết bị đã chọn";
 * BE sẽ đá các thiết bị đó và trả token cho thiết bị đang xin đăng nhập —
 * tất cả trong cùng 1 request (vé dùng 1 lần nên không thể gọi nhiều lần).
 *
 * KHÔNG cho chọn thiết bị hiện tại: nếu chọn chính nó thì vừa đá vừa đăng nhập
 * cùng lúc, vô nghĩa. Những thiết bị như vậy bị disable.
 *
 * Dialog này tuân theo design system của dự án (Tailwind + CSS Variables),
 * KHÔNG sử dụng Material Dialog directives (mat-dialog-title, mat-dialog-content).
 */
@Component({
  selector: 'app-device-limit-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatCheckboxModule],
  templateUrl: './device-limit-dialog.component.html',
  styleUrl: './device-limit-dialog.component.css',
})
export class DeviceLimitDialogComponent {
  /** Các deviceId user đang tích chọn để đăng xuất. */
  selectedDeviceIds: string[] = [];

  constructor(
    private dialogRef: MatDialogRef<DeviceLimitDialogComponent, string[] | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: { devices: DeviceInfo[]; maxSessions: number },
  ) {}

  /** Thiết bị được phép chọn: loại thiết bị hiện tại ra. */
  selectableDevices(): DeviceInfo[] {
    return this.data.devices.filter((d) => !d.current);
  }

  /** True khi không còn thiết bị nào để đá (vd danh sách chỉ có thiết bị hiện tại). */
  get hasSelectable(): boolean {
    return this.selectableDevices().length > 0;
  }

  isSelected(deviceId: string): boolean {
    return this.selectedDeviceIds.includes(deviceId);
  }

  toggleSelected(deviceId: string, checked: boolean): void {
    this.selectedDeviceIds = checked
      ? [...this.selectedDeviceIds, deviceId]
      : this.selectedDeviceIds.filter((id) => id !== deviceId);
  }

  /** True khi đã tích hết thiết bị chọn được (dùng cho link "Chọn tất cả"). */
  selectAllChecked(): boolean {
    const selectable = this.selectableDevices();
    return selectable.length > 0 && this.selectedDeviceIds.length === selectable.length;
  }

  toggleAll(checked: boolean): void {
    this.selectedDeviceIds = checked
      ? this.selectableDevices().map((d) => d.deviceId)
      : [];
  }

  onConfirm(): void {
    if (this.selectedDeviceIds.length > 0) {
      this.dialogRef.close(this.selectedDeviceIds);
    }
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}