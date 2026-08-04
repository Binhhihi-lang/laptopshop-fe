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

  private buildFormData(data: UserCreationRequest | UserUpdateRequest, file?: File): FormData {
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
    if (data.roleNames) {
      data.roleNames.forEach((role) => formData.append('roleNames', role));
    }
    if (file) {
      formData.append('avatar', file);
    }

    return formData;
  }

  createUser(data: UserCreationRequest, file?: File): Observable<UserResponse> {
    return this.api.post<UserResponse, FormData>(this.apiUrl, this.buildFormData(data, file));
  }

  updateUser(id: string, data: UserUpdateRequest, file?: File): Observable<UserResponse> {
    return this.api.put<UserResponse, FormData>(
      `${this.apiUrl}/${id}`,
      this.buildFormData(data, file),
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
