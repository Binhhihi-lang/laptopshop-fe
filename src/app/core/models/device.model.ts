/**
 * Model cho tính năng giới hạn thiết bị đăng nhập.
 *
 * Khớp với DTO phía BE:
 * - {@link com.example.laptopshop.dto.response.DeviceInfoResponse}
 * - {@link com.example.laptopshop.dto.response.DeviceLimitResponse}
 * - {@link com.example.laptopshop.dto.request.Auth.RevokeDeviceLoginRequest}
 */

export interface DeviceInfo {
  deviceId: string;
  /** Tên hiển thị do BE parse từ User-Agent, vd "Chrome - Windows". */
  deviceName: string;
  ipAddress?: string;
  /** Lần đăng nhập đầu tiên của thiết bị này (ISO string). */
  createdAt?: string;
  /** Hoạt động gần nhất (ISO string). */
  lastActiveAt?: string;
  /** Thiết bị đang gửi request — FE đánh dấu và không cho tự đá. */
  current: boolean;
}

/**
 * Payload trả kèm lỗi 1013 (vượt giới hạn thiết bị). Nằm trong
 * `error.error.result`, KHÔNG phải `result` thông thường vì đây là response lỗi.
 */
export interface DeviceLimitPayload {
  devices: DeviceInfo[];
  /** Vé dùng 1 lần để gọi /devices/revoke-and-login mà không cần mật khẩu. */
  revokeTicket: string;
  maxSessions: number;
}

/** Kết quả dialog giới hạn thiết bị trả về cho component gọi. */
export type DeviceLimitDialogResult = 'revoked' | 'cancelled';
