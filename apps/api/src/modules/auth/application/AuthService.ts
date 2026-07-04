import { UserRepository, RefreshTokenRepository } from '../domain/repositories.js';
import { UserEntity, UserRole, AuthCredentials, AuthTokens } from '../domain/types.js';
import { 
  hashPassword, 
  verifyPassword, 
  createToken, 
  verifyToken,
  hashToken,
} from '../../../shared/index.js';
import { 
  ValidationError, 
  UnauthorizedError, 
  ConflictError,
} from '../../../shared/errors.js';
import { validateEmail, validatePassword, validateRequired } from '../../../shared/validation.js';

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  /**
   * Register a new user.
   */
  async register(credentials: AuthCredentials, deviceId: string): Promise<AuthTokens> {
    validateRequired(credentials.email, 'Email');
    validateEmail(credentials.email);
    validateRequired(credentials.password, 'Password');
    validatePassword(credentials.password);

    const existingUser = await this.userRepository.findByEmail(credentials.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = hashPassword(credentials.password);
    const user = await this.userRepository.create(credentials.email, passwordHash, UserRole.CUSTOMER);

    return this.generateTokens(user, deviceId);
  }

  /**
   * Login an existing user.
   */
  async login(credentials: AuthCredentials, deviceId: string): Promise<AuthTokens> {
    validateRequired(credentials.email, 'Email');
    validateRequired(credentials.password, 'Password');

    const authRecord = await this.userRepository.findAuthByEmail(credentials.email);
    if (!authRecord) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!verifyPassword(credentials.password, authRecord.passwordHash)) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Password hash is not exposed by repository, so we need a different approach
    return this.generateTokens(authRecord.user, deviceId);
  }

  /**
   * Refresh an access token.
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const payload = verifyToken(refreshToken, 'refresh');
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokenHash = hashToken(refreshToken);
    const isValid = await this.refreshTokenRepository.findValid(user.id, tokenHash);
    if (!isValid) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    return createToken(user.id, user.role, 'access');
  }

  /**
   * Logout by revoking all refresh tokens.
   */
  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllByUser(userId);
  }

  /**
   * Generate access and refresh tokens for a user.
   */
  private async generateTokens(user: UserEntity, deviceId: string): Promise<AuthTokens> {
    const accessToken = createToken(user.id, user.role, 'access');
    const refreshToken = createToken(user.id, user.role, 'refresh');

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.save(user.id, tokenHash, deviceId, expiresAt);

    return { accessToken, refreshToken };
  }
}
