import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DeviceInfo } from '@core/models/device.model';

/**
 * Quản lý thiết bị đang đăng nhập.
 *
 * `mode` quyết định gọi nhánh API nào: admin (`/admin/auth/devices`) hay
 * storefront (`/client/auth/devices`). Hai nhánh có token/guard riêng nên
 * không dùng chung endpoint được, nhưng hình dạng dữ liệu giống hệt nhau.
 */
export type DeviceApiMode = 'admin' | 'client';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly api = inject(ApiService);

  private base(mode: DeviceApiMode): string {
    return mode === 'admin' ? '/admin/auth/devices' : '/client/auth/devices';
  }

  /** Danh sách thiết bị đang đăng nhập của chính user hiện tại. */
  getDevices(mode: DeviceApiMode): Observable<DeviceInfo[]> {
    return this.api.get<DeviceInfo[]>(this.base(mode));
  }

  /** Đăng xuất 1 thiết bị cụ thể. */
  revokeDevice(mode: DeviceApiMode, deviceId: string): Observable<void> {
    return this.api.delete<void>(`${this.base(mode)}/${encodeURIComponent(deviceId)}`);
  }

  /** Đăng xuất mọi thiết bị KHÁC (giữ thiết bị đang dùng). */
  revokeOthers(mode: DeviceApiMode): Observable<void> {
    return this.api.post<void, Record<string, never>>(`${this.base(mode)}/revoke-others`, {});
  }
}
