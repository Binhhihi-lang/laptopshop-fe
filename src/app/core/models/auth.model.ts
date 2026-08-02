export interface AuthenticationRequest {
  email: string;
  password: string;
}

export interface AuthenticationResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

interface AuthResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

export interface LoginResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

export interface IntrospectResponse {
  authenticated: boolean;
}
