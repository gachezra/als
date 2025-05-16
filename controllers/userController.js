import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.user; // From auth middleware

    const user = await User.findById(uid).select('-hashedPassword');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user; // From auth middleware
    const { name, phone, address } = req.body;
    
    // Check if user exists
    const user = await User.findById(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    
    user.updatedAt = new Date();
    
    // Save user
    await user.save();

    // Remove sensitive information
    const userData = user.toObject();
    delete userData.hashedPassword;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userData
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { uid } = req.user; // From auth middleware
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    // Get user from MongoDB
    const user = await User.findById(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.hashedPassword = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Delete user account
export const deleteUser = async (req, res) => {
  try {
    const { uid } = req.user; // From auth middleware
    
    // Delete user document from MongoDB
    const user = await User.findByIdAndDelete(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user files from storage (profile pictures, etc.)
    const userDir = path.join(uploadsDir, uid);
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    
    res.status(200).json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user account',
      error: error.message
    });
  }
};

// Admin: Get all users (with pagination)
export const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin (from middleware or request)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Query users with pagination
    const users = await User.find()
      .select('-hashedPassword')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          hasMore: page * limit < totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Admin: Update user status (activate/deactivate)
export const updateUserStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const { userId, active } = req.body;
    
    if (userId === undefined || active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'User ID and active status are required'
      });
    }
    
    // Check if user exists and update status
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.active = !!active;
    user.updatedAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `User ${active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};