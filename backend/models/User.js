const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * Represents both drivers and passengers in the Indian carpooling ecosystem.
 * Includes OTP verification fields for email-based security.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your full name'],
      trim: true,
      minlength: [2, 'Name should be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please enter a valid email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please enter a 10-digit Indian mobile number'],
      trim: true,
      match: [
        /^(\+91[\-\s]?)?[6-9][\d\s\-]{9,12}$/,
        'Please enter a valid Indian mobile number (e.g. 9876543210 or +91 98765 43210)',
      ],
    },
    hashedPassword: {
      type: String,
      required: [true, 'Please choose a secure password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password automatically before saving to database
userSchema.pre('save', async function (next) {
  if (!this.isModified('hashedPassword')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password attempt during login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.hashedPassword);
};

// Remove sensitive fields when converting document to JSON for API response
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.hashedPassword;
  delete user.otpHash;
  delete user.otpExpires;
  delete user.otpAttempts;
  delete user.otpLastSentAt;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
