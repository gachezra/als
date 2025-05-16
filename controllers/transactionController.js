import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const handleStkCallback = async (req, res) => {
  try {
    // Extract Order_ID from params
    const { Order_ID } = req.params;

    console.log("-".repeat(20), " CALLBACK RECEIVED ", "-".repeat(20));
    console.log(`Order_ID: ${Order_ID}`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
    
    // Extract callback data from Safaricom
    const { Body: { stkCallback } } = req.body;
    
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;
    
    // Prepare transaction data object
    const transactionData = {
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      orderId: Order_ID,
      status: ResultCode === 0 ? 'success' : 'failed',
    };
    
    // Extract metadata if transaction was successful
    if (ResultCode === 0 && CallbackMetadata && CallbackMetadata.Item) {
      // Get metadata items
      const meta = CallbackMetadata.Item; // Fix: Use Item directly as it's already an array
      transactionData.phoneNumber = meta.find(o => o.Name === 'PhoneNumber')?.Value?.toString();
      transactionData.amount = meta.find(o => o.Name === 'Amount')?.Value?.toString();
      transactionData.mpesaReceiptNumber = meta.find(o => o.Name === 'MpesaReceiptNumber')?.Value?.toString();
      transactionData.transactionDate = meta.find(o => o.Name === 'TransactionDate')?.Value?.toString();
      transactionData.type = 'deposit';
      
      console.log(`Transaction successful: ${transactionData.mpesaReceiptNumber}`);
      
      // Update user wallet if Order_ID contains userId
      if (Order_ID && Order_ID !== 'undefined') {
        // Check if Order_ID is a valid MongoDB ObjectId before proceeding
        const isValidObjectId = mongoose.Types.ObjectId.isValid(Order_ID);
        
        if (isValidObjectId) {
          // Begin a session for transaction
          const session = await mongoose.startSession();
          session.startTransaction();
          
          try {
            // Find and update user
            const user = await User.findById(Order_ID).session(session);
            
            if (!user) {
              console.log('User not found, transaction will be recorded without user reference');
              // End the transaction as there's no user to update
              await session.abortTransaction();
              session.endSession();
              
              // Save transaction without user reference
              await Transaction.create(transactionData);
            } else {
              // Update wallet balance
              const currentBalance = user.wallet || 0;
              user.wallet = Number(currentBalance) + Number(transactionData.amount);
              await user.save({ session });
              
              // Save transaction with user reference
              transactionData.user = Order_ID;
              await Transaction.create([transactionData], { session });
              
              // Commit the transaction
              await session.commitTransaction();
              session.endSession();
            }
          } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
          }
        } else {
          console.log(`Invalid ObjectId format: ${Order_ID}, saving transaction without user reference`);
          // Save transaction without user reference if ID is invalid
          await Transaction.create(transactionData);
        }
      } else {
        // Just save the transaction without user reference
        await Transaction.create(transactionData);
      }
    } else {
      console.log(`Transaction failed with code: ${ResultCode}, desc: ${ResultDesc}`);
      // Save failed transaction
      await Transaction.create(transactionData);
    }
    
    // Log transaction details for debugging
    console.log("-".repeat(20), " CALLBACK PROCESSED ", "-".repeat(20));
    console.log(transactionData);
    
    // Always respond with success to Safaricom
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error('Error processing STK callback:', error);
    // Always respond with success to Safaricom even if we have internal errors
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  }
};

/**
 * Verify transaction status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyTransaction = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    if (!checkoutRequestId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Checkout request ID is required' 
      });
    }
    
    // Query transaction from MongoDB
    const transaction = await Transaction.findOne({ checkoutRequestId });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      isCompleted: transaction.status !== 'pending',
      isSuccess: transaction.status === 'success',  // Fix: Check status properly
      amount: transaction.amount,
      receiptNumber: transaction.mpesaReceiptNumber,
      details: transaction
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction',
      error: error.message
    });
  }
};

/**
 * Get all transactions for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate if userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid User ID format'
      });
    }

    // Find all transactions for the user
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found for this user'
      });
    }

    return res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user transactions',
      error: error.message
    });
  }
};

