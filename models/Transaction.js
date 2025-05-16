import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  merchantRequestId: {
    type: String,
    required: true
  },
  checkoutRequestId: {
    type: String,
    required: true,
    unique: true
  },
  resultCode: {
    type: Number,
    required: true
  },
  resultDesc: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  phoneNumber: {
    type: String,
    default: null
  },
  amount: {
    type: String,
    default: null
  },
  mpesaReceiptNumber: {
    type: String,
    default: null
  },
  transactionDate: {
    type: String,
    default: null
  },
  type: {
    type: String,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Index for faster lookup
transactionSchema.index({ user: 1 });
transactionSchema.index({ status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;