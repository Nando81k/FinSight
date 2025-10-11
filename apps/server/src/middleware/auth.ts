/**
 * Authentication Middleware
 * 
 * JWT-based authentication middleware for protecting API routes
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      };
      userId?: string;
    }
  }
}

// Type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  userId: string;
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Middleware to authenticate JWT tokens
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
        return;
      }

      // Extract token (expecting "Bearer <token>")
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Invalid token format'
        });
        return;
      }

      // Verify token
      const tokenResult = this.authService.verifyToken(token);
      
      if (!tokenResult.valid || !tokenResult.userId) {
        res.status(401).json({
          success: false,
          message: tokenResult.message || 'Invalid or expired token'
        });
        return;
      }

      // Get user profile
      const userProfile = await this.authService.getUserById(tokenResult.userId);
      
      if (!userProfile) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Add user to request object
      req.user = {
        id: userProfile.id,
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName
      };
      
      // Add userId for convenience
      req.userId = userProfile.id;

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  /**
   * Optional authentication - adds user to request if token is valid, but doesn't block if missing
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        next();
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        next();
        return;
      }

      const tokenResult = this.authService.verifyToken(token);
      
      if (tokenResult.valid && tokenResult.userId) {
        const userProfile = await this.authService.getUserById(tokenResult.userId);
        
        if (userProfile) {
          req.user = {
            id: userProfile.id,
            email: userProfile.email,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName
          };
          req.userId = userProfile.id;
        }
      }

      next();
    } catch (error) {
      console.error('Optional authentication error:', error);
      next(); // Continue even if auth fails for optional auth
    }
  };

  /**
   * Middleware to check if user owns a resource (by userId parameter)
   */
  checkResourceOwnership = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { userId } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (userId && userId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: 'Access denied - insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed'
      });
    }
  };

  /**
   * Rate limiting middleware for auth routes
   */
  rateLimitAuth = (() => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    // More permissive limits for development
    const maxAttempts = process.env.NODE_ENV === 'development' ? 50 : 5;
    const windowMs = process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5 min in dev, 15 min in prod

    return (req: Request, res: Response, next: NextFunction): void => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      // Clean expired entries
      for (const [key, value] of attempts.entries()) {
        if (now > value.resetTime) {
          attempts.delete(key);
        }
      }
      
      const current = attempts.get(ip);
      
      if (!current) {
        attempts.set(ip, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }
      
      if (current.count >= maxAttempts) {
        res.status(429).json({
          success: false,
          message: 'Too many authentication attempts. Please try again later.'
        });
        return;
      }
      
      current.count++;
      attempts.set(ip, current);
      next();
    };
  })();
}

/**
 * Helper function to extract user ID from request
 */
export const getUserIdFromRequest = (req: Request): string | null => {
  return req.user?.id || null;
};

/**
 * Helper function to check if user is authenticated
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user;
};

// Create default middleware instance for convenience exports
const defaultAuthService = new AuthService();
const defaultAuthMiddleware = new AuthMiddleware(defaultAuthService);

// Export convenience middleware functions
export const requireAuth = defaultAuthMiddleware.authenticate;
export const optionalAuth = defaultAuthMiddleware.optionalAuth;
export const checkResourceOwnership = defaultAuthMiddleware.checkResourceOwnership;
export const rateLimitAuth = defaultAuthMiddleware.rateLimitAuth;