import { randomUUID } from 'node:crypto';
import { container, inject, injectable } from 'tsyringe';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  PasswordMigrationRequiredError,
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
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
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
import AuthRepository from './repository';

@injectable()
export default class AuthService {
  constructor(
    @inject(AuthRepository)
    private readonly repository: AuthRepository
  ) {}

  register = async (
    c: AppContext,
    input: RegisterRequestDto
  ): Promise<RegisterResponseDto> => {
    const logger = getLogger(c, 'auth-service');

    logger.info({ username: input.username }, 'Attempting user registration');

    if (await this.repository.usernameExists(c, input.username)) {
      logger.warn(
        { username: input.username },
        'Registration failed: username already exists'
      );
      throw new ConflictError('Username already exists', {
        username: input.username,
      });
    }

    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.isValid) {
      logger.warn(
        { username: input.username, errors: passwordValidation.errors },
        'Registration failed: password validation failed'
      );
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        { errors: passwordValidation.errors }
      );
    }

    const passwordHashResult = await hashPassword(input.password, 'pbkdf2');
    const uuid = randomUUID();

    await this.repository.createAccount(c, {
      uuid,
      username: input.username,
      password: passwordHashResult.hash,
      passwordHashVersion: passwordHashResult.version,
      passwordSalt: passwordHashResult.salt,
    });

    const createdAccount = await this.repository.findAccountByUuid(c, uuid);
    if (!createdAccount) {
      logger.error(
        { uuid, username: input.username },
        'Failed to find created account'
      );
      throw new NotFoundError('Failed to find created account');
    }

    const tokens = await generateTokenPair(c, {
      userUUID: uuid,
      username: input.username,
    });

    logger.info(
      { uuid, username: input.username },
      'User registration successful'
    );

    return {
      user: this.toAccountDto(createdAccount),
      tokens,
    };
  };

  login = async (
    c: AppContext,
    input: LoginRequestDto
  ): Promise<LoginResponseDto> => {
    const logger = getLogger(c, 'auth-service');

    logger.info({ username: input.username }, 'Attempting user login');

    const account = await this.repository.findAccountByUsername(
      c,
      input.username
    );
    if (!account) {
      logger.warn(
        { username: input.username },
        'Login failed: account not found'
      );
      throw new AuthenticationError('Invalid username or password');
    }

    logger.info(
      { 
        username: input.username, 
        uuid: account.uuid,
        passwordHashVersion: account.passwordHashVersion,
        hasSalt: !!account.passwordSalt
      },
      'Password verification starting'
    );

    const verificationResult = await verifyPassword(
      input.password,
      account.password,
      account.passwordHashVersion,
      account.passwordSalt
    );

    logger.info(
      {
        username: input.username,
        uuid: account.uuid,
        valid: verificationResult.valid,
        needsMigration: verificationResult.needsMigration,
        error: verificationResult.error
      },
      'Password verification completed'
    );

    if (verificationResult.error === 'PASSWORD_MIGRATION_REQUIRED') {
      logger.warn(
        { username: input.username, uuid: account.uuid },
        'Login failed: password migration required'
      );
      throw new PasswordMigrationRequiredError(
        'Your password needs to be migrated to our new security system. Please reset your password or contact support.'
      );
    }

    if (!verificationResult.valid) {
      logger.warn(
        { username: input.username, uuid: account.uuid },
        'Login failed: invalid password'
      );
      throw new AuthenticationError('Invalid username or password');
    }

    // Migrate password if needed
    if (verificationResult.needsMigration) {
      logger.info(
        { username: input.username, uuid: account.uuid },
        'Migrating password to PBKDF2'
      );
      const newPasswordHash = await hashPassword(input.password, 'pbkdf2');
      await this.repository.migratePassword(
        c,
        account.uuid,
        newPasswordHash.hash,
        newPasswordHash.salt || ''
      );
    }

    await this.repository.updateLastLogin(c, account.uuid);

    const updatedAccount = {
      ...account,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    const tokens = await generateTokenPair(c, {
      userUUID: account.uuid,
      username: account.username,
    });

    logger.info(
      { username: input.username, uuid: account.uuid },
      'User login successful'
    );

    return {
      user: this.toAccountDto(updatedAccount),
      tokens,
    };
  };

  refreshToken = async (
    c: AppContext,
    input: RefreshTokenRequestDto
  ): Promise<RefreshTokenResponseDto> => {
    const logger = getLogger(c, 'auth-service');

    logger.info('Attempting token refresh');

    const validationResult = await validateRefreshToken(c, input.refreshToken);

    if (!validationResult.isValid) {
      logger.warn('Token refresh failed: invalid or expired refresh token');
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    if (!validationResult.payload) {
      logger.warn('Token refresh failed: invalid token payload');
      throw new AuthenticationError('Invalid token payload');
    }

    const account = await this.repository.findAccountByUuid(
      c,
      validationResult.payload.userUUID
    );
    if (!account) {
      logger.warn(
        { userUUID: validationResult.payload.userUUID },
        'Token refresh failed: account not found'
      );
      throw new NotFoundError('Account not found');
    }

    const tokens = await refreshAccessToken(c, input.refreshToken);
    if (!tokens) {
      logger.error(
        { userUUID: validationResult.payload.userUUID },
        'Token refresh failed: failed to refresh tokens'
      );
      throw new AuthenticationError('Failed to refresh tokens');
    }

    logger.info(
      { userUUID: validationResult.payload.userUUID },
      'Token refresh successful'
    );

    return { tokens };
  };

  changePassword = async (
    c: AppContext,
    input: ChangePasswordRequestDto
  ): Promise<ChangePasswordResponseDto> => {
    const logger = getLogger(c, 'auth-service');
    const userId = c.get('userId');

    if (!userId) {
      logger.error('Change password failed: user ID not found in context');
      throw new AuthenticationError('User not authenticated');
    }

    logger.info({ userId }, 'Attempting password change');

    // Get current user account
    const account = await this.repository.findAccountByUuid(c, userId);
    if (!account) {
      logger.warn({ userId }, 'Change password failed: account not found');
      throw new NotFoundError('Account not found');
    }

    // Verify current password
    const verificationResult = await verifyPassword(
      input.currentPassword,
      account.password,
      account.passwordHashVersion,
      account.passwordSalt
    );

    if (verificationResult.error === 'PASSWORD_MIGRATION_REQUIRED') {
      logger.warn(
        { userId, username: account.username },
        'Change password failed: password migration required'
      );
      throw new PasswordMigrationRequiredError(
        'Your password needs to be migrated to our new security system. Please contact support.'
      );
    }

    if (!verificationResult.valid) {
      logger.warn(
        { userId, username: account.username },
        'Change password failed: invalid current password'
      );
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(input.newPassword);
    if (!passwordValidation.isValid) {
      logger.warn(
        {
          userId,
          username: account.username,
          errors: passwordValidation.errors,
        },
        'Change password failed: new password validation failed'
      );
      throw new ValidationError(
        `New password validation failed: ${passwordValidation.errors.join(', ')}`,
        { errors: passwordValidation.errors }
      );
    }

    // Hash new password with PBKDF2
    const newPasswordHash = await hashPassword(input.newPassword, 'pbkdf2');

    // Update password in database
    await this.repository.updatePassword(
      c,
      userId,
      newPasswordHash.hash,
      newPasswordHash.version,
      newPasswordHash.salt
    );

    logger.info(
      { userId, username: account.username },
      'Password changed successfully'
    );

    return {
      message: 'Password changed successfully',
    };
  };

  private toAccountDto = (account: AccountRecord): AccountDto => {
    return {
      id: account.id,
      uuid: account.uuid,
      username: account.username,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      lastLoginAt: account.lastLoginAt,
    };
  };
}

container.registerSingleton(AuthService);
