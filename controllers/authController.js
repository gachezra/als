import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { sendPasswordResetEmail, sendEmailVerification, sendWelcomeEmail } from '../Utils/emailService.js';

dotenv.config();

// Register a new user
export const signup = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    console.log('Received signup request:', req.body);

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const newUser = new User({
      email,
      name,
      phone: phone || '',
      hashedPassword: password,
      role: 'user',
      active: true
    });
    
    // Generate verification token - now using the model method
    const verificationToken = newUser.generateEmailVerificationToken();
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { uid: newUser._id, email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    // Send verification email
    // await sendEmailVerification(email, verificationToken, name);
    
    // Send welcome email
    // await sendWelcomeEmail(email, name);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        uid: newUser._id,
        email,
        name,
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Verify Email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find user with this token
    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user verification status
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

// Resend verification email
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token using the model method
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await sendEmailVerification(email, verificationToken, user.name);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Received login request:', req.body);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in MongoDB by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Verify password using the model method
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact admin.'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your email before logging in.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        uid: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // For security reasons, don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token using the model method
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.name);

    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      error: error.message
    });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Find user with this token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Update user's password - the pre-save hook will hash it
    user.hashedPassword = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

// Validate token
export const validateToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await User.findOne({ _id: decoded.uid, active: true });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    // Return decoded user info
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};