import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { RoleResponse, RoleCreationRequest } from '@core/models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${API_ENDPOINTS.ROLES}`;

  constructor(private api: ApiService) {}

  getRoles(): Observable<RoleResponse[]> {
    return this.api.get<RoleResponse[]>(this.apiUrl);
  }

  getRoleById(id: number): Observable<RoleResponse> {
    return this.api.get<RoleResponse>(`${this.apiUrl}/${id}`);
  }

  createRole(data: RoleCreationRequest): Observable<RoleResponse> {
    return this.api.post<RoleResponse, RoleCreationRequest>(this.apiUrl, data);
  }

  updateRole(id: number, data: RoleCreationRequest): Observable<RoleResponse> {
    return this.api.put<RoleResponse, RoleCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deleteRole(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}
