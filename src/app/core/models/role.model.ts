export interface RoleResponse {
  id: string;
  name: string;
  description: string | undefined;
  permissionNames: string[];
}

export interface RoleCreationRequest {
  name: string;
  permissionNames: string[];
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string | undefined;
  permissionNames?: string[];
}
