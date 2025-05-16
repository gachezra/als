import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    // Changed from Firestore to MongoDB using Mongoose
    const user = await User.findOne({ _id: decoded.uid });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact admin.'
      });
    }
    
    // Add user data to request
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Check if user is accessing their own resources or is admin
export const isOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.uid || req.params.userId;
  
  if (!req.user || (req.user.uid !== resourceUserId && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  }
  next();
};

export default { verifyToken, isAdmin, isOwnerOrAdmin };