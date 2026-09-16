import { STORAGE_KEYS } from './constants';

/**
 * Sinh và lưu `deviceId` — định danh THIẾT BỊ (không phải phiên đăng nhập).
 *
 * Vì sao không dùng jti của refresh token: mỗi lần login tạo 1 phiên mới, nên
 * mở 2 tab Chrome sẽ ra 2 "thiết bị" hiển thị giống hệt nhau. Dùng UUID lưu
 * localStorage thì 2 tab cùng browser dùng CHUNG 1 id -> đúng nghĩa thiết bị.
 *
 * Hạn chế đã biết: user xóa localStorage -> sinh id mới -> chiếm thêm slot.
 * Chấp nhận được (chỉ gây bất tiện, không phải lỗ hổng bảo mật).
 */
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  } catch {
    // localStorage bị chặn (chế độ riêng tư nghiêm ngặt) -> dùng id tạm cho
    // phiên làm việc hiện tại. BE vẫn hoạt động, chỉ là mỗi lần tải lại trang
    // sẽ tính là thiết bị mới.
    return generateDeviceId();
  }
}

/**
 * UUID v4. Dùng crypto.randomUUID khi có, fallback cho môi trường không hỗ trợ.
 * Định dạng chỉ gồm chữ, số và dấu gạch ngang để khớp whitelist phía BE.
 */
function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
