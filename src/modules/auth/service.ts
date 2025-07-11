import { randomUUID } from 'node:crypto';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
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
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from './password';
import { AuthRepository } from './repository';

export class AuthService {
  private repository: AuthRepository;
  private c: AppContext;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.c = c;
    this.repository = new AuthRepository(c);
    this.logger = getLogger(c, 'auth-service');
  }

  async register(input: RegisterRequestDto): Promise<RegisterResponseDto> {
    this.logger.info(
      { username: input.username },
      'Attempting user registration'
    );

    if (await this.repository.usernameExists(input.username)) {
      this.logger.warn(
        { username: input.username },
        'Registration failed: username already exists'
      );
      throw new ConflictError('Username already exists', {
        username: input.username,
      });
    }

    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.isValid) {
      this.logger.warn(
        { username: input.username, errors: passwordValidation.errors },
        'Registration failed: password validation failed'
      );
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        { errors: passwordValidation.errors }
      );
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
      this.logger.error(
        { uuid, username: input.username },
        'Failed to find created account'
      );
      throw new NotFoundError('Failed to find created account');
    }

    const tokens = await generateTokenPair(this.c, {
      userUUID: uuid,
      username: input.username,
    });

    this.logger.info(
      { uuid, username: input.username },
      'User registration successful'
    );

    return {
      user: this.toAccountDto(createdAccount),
      tokens,
    };
  }

  async login(input: LoginRequestDto): Promise<LoginResponseDto> {
    this.logger.info({ username: input.username }, 'Attempting user login');

    const account = await this.repository.findAccountByUsername(input.username);
    if (!account) {
      this.logger.warn(
        { username: input.username },
        'Login failed: account not found'
      );
      throw new AuthenticationError('Invalid username or password');
    }

    const isPasswordValid = await verifyPassword(
      input.password,
      account.password
    );
    if (!isPasswordValid) {
      this.logger.warn(
        { username: input.username, uuid: account.uuid },
        'Login failed: invalid password'
      );
      throw new AuthenticationError('Invalid username or password');
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

    this.logger.info(
      { username: input.username, uuid: account.uuid },
      'User login successful'
    );

    return {
      user: this.toAccountDto(updatedAccount),
      tokens,
    };
  }

  async refreshToken(
    input: RefreshTokenRequestDto
  ): Promise<RefreshTokenResponseDto> {
    this.logger.info('Attempting token refresh');

    const validationResult = await validateRefreshToken(
      this.c,
      input.refreshToken
    );

    if (!validationResult.isValid) {
      this.logger.warn(
        'Token refresh failed: invalid or expired refresh token'
      );
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    if (!validationResult.payload) {
      this.logger.warn('Token refresh failed: invalid token payload');
      throw new AuthenticationError('Invalid token payload');
    }

    const account = await this.repository.findAccountByUuid(
      validationResult.payload.userUUID
    );
    if (!account) {
      this.logger.warn(
        { userUUID: validationResult.payload.userUUID },
        'Token refresh failed: account not found'
      );
      throw new NotFoundError('Account not found');
    }

    const tokens = await refreshAccessToken(this.c, input.refreshToken);
    if (!tokens) {
      this.logger.error(
        { userUUID: validationResult.payload.userUUID },
        'Token refresh failed: failed to refresh tokens'
      );
      throw new AuthenticationError('Failed to refresh tokens');
    }

    this.logger.info(
      { userUUID: validationResult.payload.userUUID },
      'Token refresh successful'
    );

    return { tokens };
  }

  async getCurrentUser(userUUID: string): Promise<AccountDto> {
    this.logger.info({ userUUID }, 'Fetching current user');

    const account = await this.repository.findAccountByUuid(userUUID);
    if (!account) {
      this.logger.warn(
        { userUUID },
        'Current user fetch failed: account not found'
      );
      throw new NotFoundError('Account not found');
    }

    this.logger.info({ userUUID }, 'Current user fetch successful');

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
