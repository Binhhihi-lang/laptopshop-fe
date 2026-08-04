import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { PermissionResponse, PermissionCreationRequest } from '@core/models/permission.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private apiUrl = `${API_ENDPOINTS.PERMISSIONS}`;

  constructor(private api: ApiService) {}

  getPermissions(): Observable<PermissionResponse[]> {
    return this.api.get<PermissionResponse[]>(this.apiUrl);
  }

  getPermissionById(id: number): Observable<PermissionResponse> {
    return this.api.get<PermissionResponse>(`${this.apiUrl}/${id}`);
  }

  createPermission(data: PermissionCreationRequest): Observable<PermissionResponse> {
    return this.api.post<PermissionResponse, PermissionCreationRequest>(this.apiUrl, data);
  }

  updatePermission(id: number, data: PermissionCreationRequest): Observable<PermissionResponse> {
    return this.api.put<PermissionResponse, PermissionCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deletePermission(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
