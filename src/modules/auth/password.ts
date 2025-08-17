import bcrypt from 'bcryptjs';

// Constants
const SALT_ROUNDS = 12;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits
const BCRYPT_TIMEOUT_MS = 30; // Timeout for bcrypt operations

// Password validation regexes
const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const DIGIT_REGEX = /\d/;
const SPECIAL_CHAR_REGEX = /[@$!%*?&]/;
const CONSECUTIVE_CHARS_REGEX = /(.)\1{2,}/;

const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'password123',
  'admin',
];

export type HashVersion = 'bcrypt' | 'pbkdf2';

export type PasswordHashResult = {
  hash: string;
  salt?: string;
  version: HashVersion;
};

export type VerificationResult = {
  valid: boolean;
  needsMigration?: boolean;
  error?: string;
};

// Helper functions for PBKDF2
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return arrayBufferToBase64(salt.buffer);
}

async function hashPasswordPBKDF2(
  password: string,
  salt: string
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToArrayBuffer(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8
  );

  return arrayBufferToBase64(derivedBits);
}

async function verifyPasswordPBKDF2(
  password: string,
  hashedPassword: string,
  salt: string
): Promise<boolean> {
  const newHash = await hashPasswordPBKDF2(password, salt);
  return newHash === hashedPassword;
}

// Timeout wrapper for bcrypt operations
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    ),
  ]);
}

// Main password hashing function (new users use PBKDF2)
export async function hashPassword(
  password: string,
  version: HashVersion = 'pbkdf2'
): Promise<PasswordHashResult> {
  if (version === 'pbkdf2') {
    const salt = generateSalt();
    const hash = await hashPasswordPBKDF2(password, salt);
    return { hash, salt, version: 'pbkdf2' };
  }

  // Fallback to bcrypt (should not be used for new users)
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return { hash, version: 'bcrypt' };
}

// Main password verification function with migration support
export async function verifyPassword(
  password: string,
  hashedPassword: string,
  hashVersion: HashVersion,
  salt?: string | null
): Promise<VerificationResult> {
  if (hashVersion === 'pbkdf2') {
    if (!salt) {
      return { valid: false, error: 'Salt required for PBKDF2 verification' };
    }
    const valid = await verifyPasswordPBKDF2(password, hashedPassword, salt);
    return { valid, needsMigration: false };
  }

  // Handle bcrypt with timeout
  if (hashVersion === 'bcrypt') {
    try {
      const valid = await withTimeout(
        bcrypt.compare(password, hashedPassword),
        BCRYPT_TIMEOUT_MS
      );

      if (valid) {
        // Password is correct, should migrate to PBKDF2
        return { valid: true, needsMigration: true };
      }
      return { valid: false, needsMigration: false };
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        // Bcrypt operation timed out
        return {
          valid: false,
          needsMigration: false,
          error: 'PASSWORD_MIGRATION_REQUIRED',
        };
      }
      throw error;
    }
  }

  return { valid: false, error: 'Unknown hash version' };
}

// Legacy function for backward compatibility (used during migration)
export async function verifyPasswordLegacy(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!LOWERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!UPPERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!DIGIT_REGEX.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!SPECIAL_CHAR_REGEX.test(password)) {
    errors.push(
      'Password must contain at least one special character (@$!%*?&)'
    );
  }

  if (CONSECUTIVE_CHARS_REGEX.test(password)) {
    errors.push(
      'Password must not contain more than 2 consecutive identical characters'
    );
  }

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a different one');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}