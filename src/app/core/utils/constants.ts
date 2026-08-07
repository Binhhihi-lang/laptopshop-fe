export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/admin/auth/login',
    INTROSPECT: '/admin/auth/introspect',
    LOGOUT: '/admin/auth/logout',
    REFRESH: '/admin/auth/admin/auth/refresh'
  },

  USERS: '/admin/users',
  ROLES: '/admin/roles',
  PERMISSIONS: '/admin/permissions',
  PRODUCTS: '/admin/products',
  CATEGORIES: '/admin/categories',
  COUPONS: '/admin/coupons',
  ORDERS: '/admin/orders'
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info'
};