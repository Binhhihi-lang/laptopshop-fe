import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { UserProfileUpdateRequest, UserResponse } from '@core/models/user.model';

/**
 * Storefront: hồ sơ cá nhân customer.
 * Tách khỏi `UserService` (admin) vì backend endpoint khác path
 * (`/api/v1/client/users/me` thay vì `/api/v1/admin/users/me` — admin path
 * chỉ ADMIN/STAFF được vào).
 */
@Injectable({ providedIn: 'root' })
export class ClientUserService {
  private readonly api = inject(ApiService);

  getMyProfile(): Observable<UserResponse> {
    return this.api.get<UserResponse>('/client/users/me');
  }

  /**
   * Cập nhật hồ sơ — gửi multipart nếu có avatar, ngược lại gửi JSON.
   * Dùng FormData để giống pattern UserService.updateMyProfile (admin).
   */
  updateMyProfile(data: UserProfileUpdateRequest): Observable<UserResponse> {
    const formData = new FormData();
    if (data.fullName !== undefined) formData.append('fullName', data.fullName);
    if (data.phone !== undefined) formData.append('phone', data.phone);
    if (data.address !== undefined) formData.append('address', data.address);
    if (data.avatar instanceof File) {
      formData.append('inputFile', data.avatar);
    }
    return this.api.put<UserResponse, FormData>('/client/users/me', formData);
  }
}
