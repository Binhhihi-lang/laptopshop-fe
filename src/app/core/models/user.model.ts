export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  avatar: string;
  roleNames: string[];
  active?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UserCreationRequest {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  address?: string;
  roleNames?: string[];
  avatar?: string | File;
  active?: boolean;
}

export interface UserUpdateRequest{
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  roleNames?: string[];
  active?: boolean;
  avatar?: string | File;
}
