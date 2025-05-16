import express from 'express';
import { 
  getUserProfile, 
  updateUserProfile, 
  changePassword, 
  deleteUser,
  getAllUsers,
  updateUserStatus
} from '../controllers/userController.js';
import { verifyToken, isAdmin, isOwnerOrAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User routes
router.get('/me', verifyToken, getUserProfile);
router.put('/me', verifyToken, updateUserProfile);
router.put('/change-password', verifyToken, changePassword);
router.delete('/me', verifyToken, deleteUser);

// Admin routes
router.get('/', verifyToken, isAdmin, getAllUsers);
router.patch('/:userId/status', verifyToken, isAdmin, updateUserStatus);
router.get('/:userId', verifyToken, isOwnerOrAdmin, getUserProfile);

export default router;