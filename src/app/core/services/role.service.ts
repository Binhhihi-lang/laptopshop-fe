import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import {
  RoleResponse,
  RoleCreationRequest,
  RoleUpdateRequest,
  RoleBulkDeleteRequest,
  RoleBulkStatusRequest,
} from '@core/models/role.model';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private apiUrl = `${API_ENDPOINTS.ROLES}`;

  constructor(private api: ApiService) {}

  getRoles(): Observable<RoleResponse[]> {
    return this.api.get<RoleResponse[]>(this.apiUrl);
  }

  getRoleById(id: string): Observable<RoleResponse> {
    return this.api.get<RoleResponse>(`${this.apiUrl}/${id}`);
  }

  createRole(data: RoleCreationRequest): Observable<RoleResponse> {
    return this.api.post<RoleResponse, RoleCreationRequest>(this.apiUrl, data);
  }

  updateRole(id: string, data: RoleUpdateRequest): Observable<RoleResponse> {
    return this.api.put<RoleResponse, RoleUpdateRequest>(`${this.apiUrl}/${id}`, data);
  }

  deleteRole(id: string): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDeleteRoles(ids: string[]): Observable<void> {
    return this.api.post<void, RoleBulkDeleteRequest>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  bulkUpdateRoleStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, RoleBulkStatusRequest>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }
}
