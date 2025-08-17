import type { TokenPair } from '../../lib/tokenizer';

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type RegisterRequestDto = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type RefreshTokenRequestDto = {
  refreshToken: string;
};

export type ChangePasswordRequestDto = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type AccountDto = {
  id: number;
  uuid: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
};

export type LoginResponseDto = {
  user: AccountDto;
  tokens: TokenPair;
};

export type RegisterResponseDto = {
  user: AccountDto;
  tokens: TokenPair;
};

export type RefreshTokenResponseDto = {
  tokens: TokenPair;
};

export type ChangePasswordResponseDto = {
  message: string;
};

export type CreateAccountInput = {
  uuid: string;
  username: string;
  password: string;
  passwordHashVersion?: 'bcrypt' | 'pbkdf2';
  passwordSalt?: string;
};

export type AccountRecord = {
  id: number;
  uuid: string;
  username: string;
  password: string;
  passwordHashVersion: 'bcrypt' | 'pbkdf2';
  passwordSalt: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
};

export type AuthErrorResponse = {
  error: string;
  message: string;
  details?: string;
};
