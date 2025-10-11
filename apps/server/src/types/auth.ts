import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
  message: string;
}