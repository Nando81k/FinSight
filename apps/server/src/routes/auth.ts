/**
 * Authentication Routes
 * 
 * Comprehensive authentication API endpoints including:
 * - User registration and login
 * - Password reset functionality
 * - User profile management
 * - Token refresh
 */

import express from 'express';
import { AuthService } from '../services/AuthService';
import { AuthMiddleware } from '../middleware/auth';

const router = express.Router();

// Initialize services
const authService = new AuthService();
const authMiddleware = new AuthMiddleware(authService);

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', authMiddleware.rateLimitAuth, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', authMiddleware.rateLimitAuth, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await authService.login({ email, password });

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authMiddleware.authenticate, async (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    // In a production app, you might want to maintain a blacklist of tokens
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset token
 */
router.post('/forgot-password', authMiddleware.rateLimitAuth, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await authService.generatePasswordResetToken(email);
    
    // Always return success for security (don't reveal if email exists)
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', authMiddleware.rateLimitAuth, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    const result = await authService.resetPassword(token, newPassword);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware.authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const userProfile = await authService.getUserById(req.user.id);
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', authMiddleware.authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const { firstName, lastName, email } = req.body;
    
    const result = await authService.updateProfile(req.user.id, {
      firstName,
      lastName,
      email
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', authMiddleware.authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /auth/verify-token
 * Verify if a JWT token is valid
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = authService.verifyToken(token);

    if (result.valid && result.userId) {
      const userProfile = await authService.getUserById(result.userId);
      
      res.json({
        success: true,
        valid: true,
        user: userProfile
      });
    } else {
      res.json({
        success: false,
        valid: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /auth/users (Admin only - for demo purposes)
 * Get all users - in production this would require admin permissions
 */
router.get('/users', authMiddleware.authenticate, async (req, res) => {
  try {
    // In production, add admin role check here
    const users = authService.getAllUsers();
    
    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;