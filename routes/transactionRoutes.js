import express from 'express';
import { handleStkCallback, verifyTransaction, getUserTransactions } from '../controllers/transactionController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route to fetch all the transactions
router.get('/all/:userId',verifyToken, getUserTransactions);

// Route to handle M-Pesa STK Push callback
router.post('/mpesaCallback/:Order_ID', handleStkCallback);

// Route to verify transaction status
router.get('/verify/:checkoutRequestId', verifyTransaction);

export default router;