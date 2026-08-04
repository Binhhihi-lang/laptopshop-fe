export interface PermissionResponse {
  id: string;
  name: string;
  description: string;
}

export interface PermissionCreationRequest {
  name: string;
  description: string;
}

export interface PermissionUpdateRequest {
  name?: string;
  description?: string;
}
