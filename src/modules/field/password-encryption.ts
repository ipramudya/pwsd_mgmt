import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Derives a 256-bit encryption key from the master key in environment variables
 * Uses the master key directly, but in production you might want to use key derivation
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!masterKey) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY environment variable is required for password encryption'
    );
  }

  if (masterKey.length < 32) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be at least 32 characters long'
    );
  }

  // For simplicity, use first 32 bytes of the master key
  // In production, consider using PBKDF2 or similar key derivation
  return Buffer.from(masterKey.slice(0, 32), 'utf8');
}

/**
 * Encrypts a password for secure storage in the database
 * Uses AES-256-GCM encryption with a random IV and authentication tag
 *
 * @param plainTextPassword - The original password to encrypt
 * @returns Encrypted password string in format: base64(iv:authTag:encryptedData)
 * @throws Error if encryption fails or environment is not properly configured
 */
export function encryptPasswordForStorage(plainTextPassword: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainTextPassword, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data with separators
    const combinedData = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

    return Buffer.from(combinedData).toString('base64');
  } catch (error) {
    throw new Error(
      `Failed to encrypt password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypts a password from storage to its original form
 * Reverses the encryption process to recover the original password
 *
 * @param encryptedPassword - The encrypted password string from database
 * @returns The original plain text password
 * @throws Error if decryption fails, data is corrupted, or authentication fails
 */
export function decryptPasswordFromStorage(encryptedPassword: string): string {
  try {
    const key = getEncryptionKey();

    // Decode the base64 wrapper and split components
    const combinedData = Buffer.from(encryptedPassword, 'base64').toString(
      'utf8'
    );
    const parts = combinedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted password format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    // Validate component lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length in encrypted password');
    }

    if (authTag.length !== TAG_LENGTH) {
      throw new Error('Invalid auth tag length in encrypted password');
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(
      `Failed to decrypt password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validates that the encryption system is properly configured
 * Should be called during application startup
 *
 * @throws Error if encryption system is not properly configured
 */
export function validatePasswordEncryptionConfig(): void {
  try {
    getEncryptionKey();

    // Test encryption/decryption with a sample password
    const testPassword = 'test-password-validation';
    const encrypted = encryptPasswordForStorage(testPassword);
    const decrypted = decryptPasswordFromStorage(encrypted);

    if (decrypted !== testPassword) {
      throw new Error(
        'Encryption validation failed: decrypted password does not match original'
      );
    }
  } catch (error) {
    throw new Error(
      `Password encryption system validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
