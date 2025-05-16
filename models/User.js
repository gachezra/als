import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  hashedPassword: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  active: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: true // Change to false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: null
  },
  level: {
    type: Number,
    default: 1
  },
  wallet: {
    type: Number,
    default: 0
  },
  surveyCount: {
    type: Number,
    default: 0
  },
  videoCount: {
    type: Number,
    default: 0
  },
  surveyCountTotal: {
    type: Number,
    default: 0
  },
  videoCountTotal: {
    type: Number,
    default: 0
  },
  lastSurveyCountReset: {
    type: Date,
    default: Date.now
  },
  lastVideoCountReset: {
    type: Date,
    default: Date.now
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified('hashedPassword')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.hashedPassword);
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date();
  this.emailVerificationExpires.setHours(this.emailVerificationExpires.getHours() + 24); // 24 hours
  
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date();
  this.passwordResetExpires.setHours(this.passwordResetExpires.getHours() + 1); // 1 hour
  
  return token;
};

// Method to check if 24 hours have passed since last reset
userSchema.methods.shouldResetSurveyCount = function() {
  if (!this.lastSurveyCountReset) return true;
  
  const now = new Date();
  const hoursSinceReset = (now - this.lastSurveyCountReset) / (1000 * 60 * 60);
  return hoursSinceReset >= 24;
};

// Method to check if 24 hours have passed since last reset
userSchema.methods.shouldResetVideoCount = function() {
  if (!this.lastVideoCountReset) return true;
  
  const now = new Date();
  const hoursSinceReset = (now - this.lastVideoCountReset) / (1000 * 60 * 60);
  return hoursSinceReset >= 24;
};

const User = mongoose.model('User', userSchema);

export default User;