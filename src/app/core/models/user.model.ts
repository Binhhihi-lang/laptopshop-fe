export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  avatar: string;
  roleNames: string[];
  active?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  roleLocked?: boolean;
}

export interface UserCreationRequest {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  address?: string;
  roleNames?: string[];
  avatar?: string | File;
  active?: boolean;
}

export interface UserUpdateRequest {
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  roleNames?: string[];
  active?: boolean;
  avatar?: string | File;
}

// Chỉ các trường cho phép cập nhật ở trang "Hồ sơ cá nhân" (/admin/profile).
// KHÔNG có email / roleNames / active / password — bảo vệ không cho user tự
// đổi email hay vai trò của chính mình.
export interface UserProfileUpdateRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  avatar?: string | File;
}
