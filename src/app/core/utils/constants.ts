export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/admin/auth/login',
    INTROSPECT: '/admin/auth/introspect',
    LOGOUT: '/admin/auth/logout',
    REFRESH: '/admin/auth/refresh',
    // Quản lý thiết bị đăng nhập (admin). Client dùng path /client/auth/... riêng.
    DEVICES: '/admin/auth/devices',
    DEVICES_REVOKE_AND_LOGIN: '/admin/auth/devices/revoke-and-login',
  },

  USERS: '/admin/users',
  ROLES: '/admin/roles',
  PERMISSIONS: '/admin/permissions',
  PRODUCTS: '/admin/products',
  CATEGORIES: '/admin/categories',
  COUPONS: '/admin/coupons',
  ORDERS: '/admin/orders',
  DASHBOARD: '/admin/dashboard',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  // Định danh THIẾT BỊ (UUID, không phải phiên). Dùng CHUNG cho cả admin lẫn
  // client: cùng 1 máy + browser = cùng 1 thiết bị, nhất quán với cách BE đếm.
  DEVICE_ID: 'device_id',
};

/**
 * Header FE gửi kèm để BE nhận diện thiết bị. PHẢI khớp hằng số
 * `DeviceRequestUtils.DEVICE_ID_HEADER` phía backend.
 */
export const DEVICE_ID_HEADER = 'X-Device-Id';
