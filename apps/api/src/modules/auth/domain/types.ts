export type UserId = string;

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  VENDOR_OWNER = 'VENDOR_OWNER',
  ADMIN = 'ADMIN',
}

export interface UserEntity {
  id: UserId;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: UserId;
  role: UserRole;
}
