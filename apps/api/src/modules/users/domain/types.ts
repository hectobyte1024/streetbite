export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  VENDOR_OWNER = 'VENDOR_OWNER',
  ADMIN = 'ADMIN',
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileInput {
  displayName?: string | null;
}
