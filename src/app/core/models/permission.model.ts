export interface PermissionResponse {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface PermissionCreationRequest {
  name: string;
  description: string;
}

export interface PermissionUpdateRequest {
  name?: string;
  description?: string;
}

export interface PermissionBulkDeleteRequest {
  ids: string[];
}

export interface PermissionBulkStatusRequest {
  ids: string[];
  active: boolean;
}
