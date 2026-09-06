/**
 * DTOs cho nhánh client (storefront). Tách khỏi `auth.model.ts` của admin
 * để hai luồng hoàn toàn độc lập — admin token và customer token không
 * dùng chung localStorage, không lẫn session.
 *
 * Khớp với class tương ứng ở BE:
 * - {@link com.example.laptopshop.dto.request.Auth.AuthenticationRequest}
 * - {@link com.example.laptopshop.dto.request.User.UserCreationRequest}
 * - {@link com.example.laptopshop.dto.request.Client.ForgotPasswordRequest}
 * - {@link com.example.laptopshop.dto.request.Client.ResetPasswordRequest}
 * - {@link com.example.laptopshop.dto.request.Client.ClientChangePasswordRequest}
 */

export interface ClientLoginRequest {
  email: string;
  password: string;
}

export interface ClientRegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface ClientForgotPasswordRequest {
  email: string;
}

export interface ClientResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ClientChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * Response trả về khi login/refresh thành công. Trùng cấu trúc với
 * admin (BE dùng chung `AuthenticationResponse`) — đặt tên khác để FE phân
 * biệt được token customer với token admin khi đọc localStorage.
 */
export interface ClientLoginResponse {
  authenticated: boolean;
  token: string;
  refreshToken: string;
}

export interface ClientIntrospectResponse {
  authenticated: boolean;
}
