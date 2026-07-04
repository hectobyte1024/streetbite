import { createHash, randomBytes, scryptSync } from 'crypto';

/**
 * Hash a password using scrypt.
 * Returns a string with format: salt$hash
 * This is a simple approach; Argon2 is recommended for production.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}$${hash}`;
}

/**
 * Verify a password against a hash.
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split('$');
  if (!salt || !storedHash) {
    return false;
  }
  const computedHash = scryptSync(password, salt, 64).toString('hex');
  return computedHash === storedHash;
}

/**
 * Generate a random token for email verification or password reset.
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a token for secure storage in the database.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
