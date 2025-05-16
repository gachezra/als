// routes/authRoutes.js

import express from 'express';
import { 
  signup, 
  login, 
  requestPasswordReset, 
  resetPassword, 
  validateToken 
} from '../controllers/authController.js';

const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/validate-token', validateToken);

export default router;