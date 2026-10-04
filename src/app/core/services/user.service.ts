import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { Page } from '@core/models/page.model';
import {
  UserCreationRequest,
  UserProfileUpdateRequest,
  UserResponse,
  UserUpdateRequest,
} from '@core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${API_ENDPOINTS.USERS}`;

  constructor(private api: ApiService) {}

  getUsers(): Observable<UserResponse[]> {
    return this.api.get<UserResponse[]>(this.apiUrl);
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.api.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tìm khách cho picker (gán voucher...). Chỉ trả tài khoản đang hoạt động.
   * Phân trang để không phải tải hết danh sách khi shop nhiều tài khoản.
   */
  searchForPicker(keyword: string, page = 0, size = 20): Observable<Page<UserResponse>> {
    return this.api.get<Page<UserResponse>>(`${this.apiUrl}/search`, {
      keyword: keyword?.trim() || undefined,
      page,
      size,
    });
  }

  private buildFormData(data: UserCreationRequest | UserUpdateRequest): FormData {
    const formData = new FormData();

    if ('email' in data && data.email !== undefined) {
      formData.append('email', data.email);
    }
    if ('password' in data && data.password !== undefined) {
      formData.append('password', data.password);
    }
    if (data.fullName !== undefined) formData.append('fullName', data.fullName);
    if (data.phone !== undefined) formData.append('phone', data.phone);
    if (data.address !== undefined) formData.append('address', data.address);
    // Địa chỉ 2 cấp — gửi ở trường riêng, KHÔNG ghép vào address
    if (data.provinceCode !== undefined) formData.append('provinceCode', data.provinceCode);
    if (data.provinceName !== undefined) formData.append('provinceName', data.provinceName);
    if (data.communeCode !== undefined) formData.append('communeCode', data.communeCode);
    if (data.communeName !== undefined) formData.append('communeName', data.communeName);
    if ('active' in data && data.active !== undefined) {
      formData.append('active', String(data.active));
    }
    if (data.roleNames) {
      data.roleNames.forEach((role) => formData.append('roleNames', role));
    }
    // Đọc file trực tiếp từ data.avatar, khớp tên field backend đang chờ (inputFile)
    if (data.avatar instanceof File) {
      formData.append('inputFile', data.avatar);
    }

    return formData;
  }

  createUser(data: UserCreationRequest): Observable<UserResponse> {
    return this.api.post<UserResponse, FormData>(this.apiUrl, this.buildFormData(data));
  }

  updateUser(id: string, data: UserUpdateRequest): Observable<UserResponse> {
    return this.api.put<UserResponse, FormData>(`${this.apiUrl}/${id}`, this.buildFormData(data));
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDeleteUsers(ids: string[]): Observable<void> {
    return this.api.post<void, { ids: string[] }>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  bulkUpdateUserStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }

  // Lấy hồ sơ cá nhân của chính user đang đăng nhập (gọi GET /admin/users/me)
  getMyProfile(): Observable<UserResponse> {
    return this.api.get<UserResponse>(`${this.apiUrl}/me`);
  }

  // Cập nhật hồ sơ cá nhân (gọi PUT /admin/users/me). Gửi fullName/email/phone/
  // address/province/commune/avatar lên backend — KHÔNG gửi role/active/password.
  updateMyProfile(data: UserProfileUpdateRequest): Observable<UserResponse> {
    return this.api.put<UserResponse, FormData>(
      `${this.apiUrl}/me`,
      this.buildProfileFormData(data),
    );
  }

  private buildProfileFormData(data: UserProfileUpdateRequest): FormData {
    const formData = new FormData();
    if (data.fullName !== undefined) formData.append('fullName', data.fullName);
    if (data.email !== undefined) formData.append('email', data.email);
    if (data.phone !== undefined) formData.append('phone', data.phone);
    if (data.address !== undefined) formData.append('address', data.address);
    if (data.provinceCode !== undefined) formData.append('provinceCode', data.provinceCode);
    if (data.provinceName !== undefined) formData.append('provinceName', data.provinceName);
    if (data.communeCode !== undefined) formData.append('communeCode', data.communeCode);
    if (data.communeName !== undefined) formData.append('communeName', data.communeName);
    // Đọc file trực tiếp từ data.avatar, khớp tên field backend đang chờ (inputFile)
    if (data.avatar instanceof File) {
      formData.append('inputFile', data.avatar);
    }
    return formData;
  }
}
