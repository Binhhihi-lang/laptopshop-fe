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

/**
 * Thông tin tóm tắt của user ĐANG ĐĂNG NHẬP, decode từ JWT và lưu ở
 * localStorage (khác với `UserResponse` — bản đầy đủ lấy từ API /me).
 *
 * ⚠️ Phải khớp với object `buildUserInfo()` trả về trong AuthService
 * (`userId | fullName | roleNames | permissions`), không chứa firstName /
 * lastName / role / email như interface cũ từng khai báo (gây initials luôn
 * là "AD", role luôn là "ADMIN").
 */
export interface UserInfo {
  /** JWT claim `userId` — JwtHelper decode dạng số nên cho phép number. */
  userId?: string | number;
  fullName?: string;
  email?: string;
  roleNames?: string[];
  permissions?: string[];
  avatar?: string;
}

/** Lấy chữ viết tắt (tối đa 2 ký tự) từ họ tên, ví dụ "Nguyễn Văn A" → "NA". */
export function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Lấy vai trò chính (phần tử đầu) để hiển thị, mặc định "Người dùng". */
export function getPrimaryRole(roleNames?: string[]): string {
  return roleNames && roleNames.length > 0 ? roleNames[0] : 'Người dùng';
}
