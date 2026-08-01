import { Injectable } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../core/utils/constants';
import { Observable } from 'rxjs';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleNames: string[];
  deletedAt: string | null;
}

export interface UserCreationRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleNames: string[];
  avatar?: File;
}

export interface UserUpdateRequest extends Omit<UserCreationRequest, 'password'> {
  id: number;
  password?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${API_ENDPOINTS.USERS}`;

  constructor(private api: ApiService) {}

  getUsers(): Observable<UserResponse[]> {
    return this.api.get<UserResponse[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.api.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  createUser(data: UserCreationRequest): Observable<UserResponse> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('fullName', data.fullName);
    data.roleNames.forEach(role => formData.append('roleNames', role));
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }
    return this.api.post<UserResponse, FormData>(this.apiUrl, formData);
  }

  updateUser(id: number, data: UserUpdateRequest): Observable<UserResponse> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('email', data.email);
    formData.append('fullName', data.fullName);
    if (data.roleNames) {
      data.roleNames.forEach(role => formData.append('roleNames', role));
    }
    if (data.password) {
      formData.append('password', data.password);
    }
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }
    return this.api.put<UserResponse, FormData>(`${this.apiUrl}/${id}`, formData);
  }

  deleteUser(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}