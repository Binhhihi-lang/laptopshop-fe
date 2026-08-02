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

interface IntrospectResponse {
  authenticated: boolean;
}
