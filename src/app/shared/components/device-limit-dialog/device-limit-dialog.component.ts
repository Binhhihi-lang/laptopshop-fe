import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { DeviceInfo } from '@core/models/device.model';

/**
 * Dialog hiện khi user login nhưng đã đủ số thiết bị tối đa.
 *
 * User chọn 1 thiết bị trong danh sách rồi bấm "Đăng xuất thiết bị đã chọn";
 * BE sẽ đá thiết bị đó và trả token cho thiết bị đang xin đăng nhập.
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
  imports: [CommonModule, FormsModule, MatIconModule, MatRadioModule],
  templateUrl: './device-limit-dialog.component.html',
  styleUrl: './device-limit-dialog.component.css',
})
export class DeviceLimitDialogComponent {
  /** deviceId đang được chọn; khởi tạo là thiết bị cũ nhất (đăng nhập sớm nhất). */
  selectedDeviceId: string | null;

  constructor(
    private dialogRef: MatDialogRef<DeviceLimitDialogComponent, string | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: { devices: DeviceInfo[]; maxSessions: number },
  ) {
    const selectable = this.selectableDevices();
    this.selectedDeviceId = selectable.length > 0 ? selectable[0].deviceId : null;
  }

  /** Thiết bị được phép chọn: loại thiết bị hiện tại ra. */
  selectableDevices(): DeviceInfo[] {
    return this.data.devices.filter((d) => !d.current);
  }

  /** True khi không còn thiết bị nào để đá (vd danh sách chỉ có thiết bị hiện tại). */
  get hasSelectable(): boolean {
    return this.selectableDevices().length > 0;
  }

  onConfirm(): void {
    if (this.selectedDeviceId) {
      this.dialogRef.close(this.selectedDeviceId);
    }
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}
