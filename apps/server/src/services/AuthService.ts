/**
 * User Authentication Service
 * 
 * Comprehensive user management system including:
 * - User registration and login
 * - Password hashing and validation
 * - JWT token generation and verification
 * - Password reset functionality
 * - Session management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// User interface
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  resetToken?: string | undefined;
  resetTokenExpiry?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | undefined;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date | undefined;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile | undefined;
  token?: string | undefined;
  message?: string | undefined;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '7d';
  private readonly RESET_TOKEN_EXPIRES_IN = 3600000; // 1 hour in milliseconds

  // In-memory user storage for now (will be replaced with database)
  private users: Map<string, User> = new Map();

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'finsight-jwt-secret-key-change-in-production';
    
    // Initialize with a demo user for testing
    this.createDemoUser();
  }

  /**
   * Create a demo user for testing purposes
   */
  private async createDemoUser() {
    const demoUser: User = {
      id: 'demo-user-123',
      email: 'demo@finsight.com',
      password: await this.hashPassword('demo123'),
      firstName: 'Demo',
      lastName: 'User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(demoUser.id, demoUser);
    console.log('🧪 Demo user created: demo@finsight.com / demo123');
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Validate input
      const validation = this.validateRegistrationData(userData);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message || 'Invalid registration data'
        };
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(u => u.email === userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create new user
      const newUser: User = {
        id: this.generateUserId(),
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        emailVerified: false, // In production, would require email verification
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store user
      this.users.set(newUser.id, newUser);

      // Generate JWT token
      const token = this.generateToken(newUser.id);

      // Return user profile (without password)
      const userProfile = this.getUserProfile(newUser);

      return {
        success: true,
        user: userProfile,
        token,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login user
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      // Validate input
      if (!loginData.email || !loginData.password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      // Find user by email
      const user = Array.from(this.users.values()).find(
        u => u.email === loginData.email.toLowerCase().trim()
      );

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(loginData.password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Update last login
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      // Generate JWT token
      const token = this.generateToken(user.id);

      // Return user profile
      const userProfile = this.getUserProfile(user);

      return {
        success: true,
        user: userProfile,
        token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    const user = this.users.get(userId);
    return user ? this.getUserProfile(user) : null;
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { valid: boolean; userId?: string; message?: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      
      // Check if user still exists
      const user = this.users.get(decoded.userId);
      if (!user) {
        return {
          valid: false,
          message: 'User not found'
        };
      }

      return {
        valid: true,
        userId: decoded.userId
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          message: 'Token expired'
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          message: 'Invalid token'
        };
      } else {
        return {
          valid: false,
          message: 'Token verification failed'
        };
      }
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = Array.from(this.users.values()).find(
        u => u.email === email.toLowerCase().trim()
      );

      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + this.RESET_TOKEN_EXPIRES_IN);

      // Store reset token
      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      // In production, would send email here
      console.log(`🔐 Password reset token for ${email}: ${resetToken}`);

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Failed to generate password reset token.'
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message || 'Invalid password'
        };
      }

      // Find user by reset token
      const user = Array.from(this.users.values()).find(
        u => u.resetToken === token && u.resetTokenExpiry && u.resetTokenExpiry > new Date()
      );

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      return {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Failed to reset password.'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Promise<{ success: boolean; user?: UserProfile; message: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Update fields
      if (updates.firstName !== undefined) {
        user.firstName = updates.firstName.trim();
      }
      if (updates.lastName !== undefined) {
        user.lastName = updates.lastName.trim();
      }
      if (updates.email !== undefined) {
        // Check if new email is already taken
        const existingUser = Array.from(this.users.values()).find(
          u => u.email === updates.email!.toLowerCase().trim() && u.id !== userId
        );
        if (existingUser) {
          return {
            success: false,
            message: 'Email is already taken'
          };
        }
        user.email = updates.email.toLowerCase().trim();
      }

      user.updatedAt = new Date();
      this.users.set(user.id, user);

      return {
        success: true,
        user: this.getUserProfile(user),
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        message: 'Failed to update profile.'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message || 'Invalid password'
        };
      }

      // Hash and update password
      user.password = await this.hashPassword(newPassword);
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: 'Failed to change password.'
      };
    }
  }

  // Private helper methods

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getUserProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  private validateRegistrationData(data: RegisterData): { isValid: boolean; message?: string } {
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      return {
        isValid: false,
        message: 'All fields are required'
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        isValid: false,
        message: 'Invalid email format'
      };
    }

    // Password validation
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    // Name validation
    if (data.firstName.trim().length < 2 || data.lastName.trim().length < 2) {
      return {
        isValid: false,
        message: 'First name and last name must be at least 2 characters long'
      };
    }

    return { isValid: true };
  }

  private validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long'
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number'
      };
    }

    return { isValid: true };
  }

  /**
   * Get all users (admin function)
   */
  getAllUsers(): UserProfile[] {
    return Array.from(this.users.values()).map(user => this.getUserProfile(user));
  }

  /**
   * Delete user (admin function)
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      this.users.delete(userId);

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        message: 'Failed to delete user.'
      };
    }
  }
}