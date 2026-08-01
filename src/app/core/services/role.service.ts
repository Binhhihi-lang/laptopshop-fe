import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../utils/constants';
import { Observable } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  permissionNames: string[];
}

export interface RoleCreationRequest {
  name: string;
  permissionNames: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${API_ENDPOINTS.ROLES}`;

  constructor(private api: ApiService) {}

  getRoles(): Observable<Role[]> {
    return this.api.get<Role[]>(this.apiUrl);
  }

  getRoleById(id: number): Observable<Role> {
    return this.api.get<Role>(`${this.apiUrl}/${id}`);
  }

  createRole(data: RoleCreationRequest): Observable<Role> {
    return this.api.post<Role, RoleCreationRequest>(this.apiUrl, data);
  }

  updateRole(id: number, data: RoleCreationRequest): Observable<Role> {
    return this.api.put<Role, RoleCreationRequest>(`${this.apiUrl}/${id}`, data);
  }

  deleteRole(id: number): Observable<void> {
    return this.api.delete<void>(`${this.apiUrl}/${id}`);
  }
}