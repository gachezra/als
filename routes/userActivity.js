import express from 'express';
import { 
  getAllSurveys,
  getAvailableSurveys,
  incrementSurveyCount, 
  incrementVideoCount,
  submitResponse
} from '../controllers/userActivityController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User activity routes
router.post('/survey/:userId', verifyToken, incrementSurveyCount);
router.post('/video/:userId', verifyToken, incrementVideoCount);

// Survey manenos
router.get('/survey', verifyToken, getAllSurveys);
router.get('/survey/:userId', verifyToken, getAvailableSurveys);
router.post('/response/:participant', verifyToken, submitResponse);

export default router;