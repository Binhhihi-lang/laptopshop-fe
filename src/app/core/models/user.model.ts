export interface UserResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleNames: string[];
  deletedAt: string | null;
}

export interface UserCreationRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleNames: string[];
  avatar?: File;
}

export interface UserUpdateRequest extends Omit<UserCreationRequest, 'password'> {
  id: number;
  password?: string;
}