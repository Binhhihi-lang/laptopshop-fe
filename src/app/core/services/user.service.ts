import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { UserCreationRequest, UserResponse, UserUpdateRequest } from '@core/models/user.model';

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
}
