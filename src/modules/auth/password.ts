import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

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

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
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
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  if (CONSECUTIVE_CHARS_REGEX.test(password)) {
    errors.push('Password must not contain more than 2 consecutive identical characters');
  }

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a different one');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}