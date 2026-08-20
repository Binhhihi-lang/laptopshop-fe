export interface RoleResponse {
  id: string;
  name: string;
  description: string | undefined;
  permissionNames: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleCreationRequest {
  name: string;
  description?: string;
  permissionNames: string[];
  active?: boolean;
}

export interface RoleUpdateRequest {
  name: string;
  description: string | undefined;
  permissionNames: string[];
  active?: boolean;
}

export interface RoleBulkDeleteRequest {
  ids: string[];
}

export interface RoleBulkStatusRequest {
  ids: string[];
  active: boolean;
}
