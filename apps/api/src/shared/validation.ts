import { ValidationError } from './errors.js';

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email address');
  }
}

export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateString(value: unknown, fieldName: string, minLength?: number, maxLength?: number): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (minLength && value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }
  if (maxLength && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
  }
}

export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): void {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (min !== undefined && value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
}
