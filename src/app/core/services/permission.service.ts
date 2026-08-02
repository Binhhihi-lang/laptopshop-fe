import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { Permission, PermissionCreationRequest } from '@core/models/permission.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private apiUrl = `${API_ENDPOINTS.PERMISSIONS}`;

  constructor(private api: ApiService) {}

  getPermissions(): Observable<Permission[]> {
    return this.api.get<Permission[]>(this.apiUrl);
  }

  getPermissionById(id: number): Observable<Permission> {
    return this.api.get<Permission>(`${this.apiUrl}/${id}`);
  }

  createPermission(data: PermissionCreationRequest): Observable<Permission> {
    return this.api.post<Permission, PermissionCreationRequest>(this.apiUrl, data);
  }

  updatePermission(id: number, data: PermissionCreationRequest): Observable<Permission> {
    return this.api.put<Permission, PermissionCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deletePermission(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
