export interface RoleResponse {
  id: number;
  name: string;
  permissionNames: string[];
}

export interface Role {
  id: number;
  name: string;
  permissionNames: string[];
}

export interface RoleCreationRequest {
  name: string;
  permissionNames: string[];
}
