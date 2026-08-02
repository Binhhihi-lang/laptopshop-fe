export interface PermissionResponse {
  id: number;
  name: string;
  description: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface PermissionCreationRequest {
  name: string;
  description: string;
}
