import { createHmac, randomBytes } from 'crypto';

export interface JwtPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

function getSecretKey(type: 'access' | 'refresh'): string {
  const secret = type === 'access'
    ? process.env.JWT_ACCESS_SECRET
    : process.env.JWT_REFRESH_SECRET;
  
  if (!secret) {
    throw new Error(`Missing JWT_${type.toUpperCase()}_SECRET environment variable`);
  }
  return secret;
}

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64Decode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function createSignature(message: string, secret: string): string {
  return createHmac('sha256', secret).update(message).digest('base64url');
}

/**
 * Create a JWT token.
 */
export function createToken(
  userId: string,
  role: string,
  type: 'access' | 'refresh' = 'access',
): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = type === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JwtPayload = {
    userId,
    role,
    iat: now,
    exp: now + expiry,
    type,
  };
  
  const headerEncoded = base64Encode(JSON.stringify(header));
  const payloadEncoded = base64Encode(JSON.stringify(payload));
  const message = `${headerEncoded}.${payloadEncoded}`;
  
  const secret = getSecretKey(type);
  const signature = createSignature(message, secret);
  
  return `${message}.${signature}`;
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JwtPayload | null {
  try {
    const [headerEncoded, payloadEncoded, signatureProvided] = token.split('.');
    
    if (!headerEncoded || !payloadEncoded || !signatureProvided) {
      return null;
    }
    
    const message = `${headerEncoded}.${payloadEncoded}`;
    const secret = getSecretKey(type);
    const expectedSignature = createSignature(message, secret);
    
    if (expectedSignature !== signatureProvided) {
      return null;
    }
    
    const payloadJson = base64Decode(payloadEncoded);
    const payload = JSON.parse(payloadJson) as JwtPayload;
    
    if (payload.type !== type) {
      return null;
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
