export interface User {
  id: number;
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

// Login API returns: { userId, shopName, token, message }
export interface LoginResponse {
  userId: number;
  shopName: string;
  token: string;
  message: string;
}

// Signup API returns: { id, shopName, ownerName, mobile, email } — no token
export interface SignupResponse {
  id: number;
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
}
