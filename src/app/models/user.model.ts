export interface User {
  id: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
}
