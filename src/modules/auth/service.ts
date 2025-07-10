import { randomUUID } from 'node:crypto';
import {
  generateTokenPair,
  refreshAccessToken,
  validateRefreshToken,
} from '../../lib/tokenizer';
import type { AppContext } from '../../types';
import type {
  AccountDto,
  AccountRecord,
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from './dto';
import { hashPassword, validatePasswordStrength, verifyPassword } from './password';
import { AuthRepository } from './repository';

export class AuthService {
  private repository: AuthRepository;
  private c: AppContext;

  constructor(c: AppContext) {
    this.c = c;
    this.repository = new AuthRepository(c);
  }

  async register(input: RegisterRequestDto): Promise<RegisterResponseDto> {
    if (await this.repository.usernameExists(input.username)) {
      throw new Error('Username already exists');
    }

    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const hashedPassword = await hashPassword(input.password);
    const uuid = randomUUID();

    await this.repository.createAccount({
      uuid,
      username: input.username,
      password: hashedPassword,
    });

    const createdAccount = await this.repository.findAccountByUuid(uuid);
    if (!createdAccount) {
      throw new Error('Failed to create account');
    }

    const tokens = await generateTokenPair(this.c, {
      userUUID: uuid,
      username: input.username,
    });

    return {
      user: this.toAccountDto(createdAccount),
      tokens,
    };
  }

  async login(input: LoginRequestDto): Promise<LoginResponseDto> {
    const account = await this.repository.findAccountByUsername(input.username);
    if (!account) {
      throw new Error('Invalid username or password');
    }

    const isPasswordValid = await verifyPassword(
      input.password,
      account.password
    );
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    await this.repository.updateLastLogin(account.uuid);

    const updatedAccount = {
      ...account,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    const tokens = await generateTokenPair(this.c, {
      userUUID: account.uuid,
      username: account.username,
    });

    return {
      user: this.toAccountDto(updatedAccount),
      tokens,
    };
  }

  async refreshToken(
    input: RefreshTokenRequestDto
  ): Promise<RefreshTokenResponseDto> {
    const validationResult = await validateRefreshToken(
      this.c,
      input.refreshToken
    );

    if (!validationResult.isValid) {
      throw new Error('Invalid or expired refresh token');
    }

    if (!validationResult.payload) {
      throw new Error('Invalid token payload');
    }

    const account = await this.repository.findAccountByUuid(
      validationResult.payload.userUUID
    );
    if (!account) {
      throw new Error('Account not found');
    }

    const tokens = await refreshAccessToken(this.c, input.refreshToken);
    if (!tokens) {
      throw new Error('Failed to refresh tokens');
    }

    return { tokens };
  }

  async getCurrentUser(userUUID: string): Promise<AccountDto> {
    const account = await this.repository.findAccountByUuid(userUUID);
    if (!account) {
      throw new Error('Account not found');
    }

    return this.toAccountDto(account);
  }

  private toAccountDto(account: AccountRecord): AccountDto {
    return {
      id: account.id,
      uuid: account.uuid,
      username: account.username,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      lastLoginAt: account.lastLoginAt,
    };
  }
}