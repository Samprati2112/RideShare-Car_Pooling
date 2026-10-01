const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../services/emailService');
const {
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
} = require('../config/constants');

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'rideshare_super_secret_jwt_key_2026_interview_ready';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

// Generate and bcrypt-hash a 6-digit numeric OTP
const generateOtpHash = async () => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return { otp, otpHash, otpExpires };
};

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'An account with this mobile number already exists.',
      });
    }

    const { otp, otpHash, otpExpires } = await generateOtpHash();

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      hashedPassword: password,
      isVerified: false,
      otpHash,
      otpExpires,
      otpAttempts: 0,
      otpLastSentAt: new Date(),
    });

    try {
      await sendOtpEmail(cleanEmail, otp);
    } catch (emailErr) {
      console.warn('[Registration Email Warning]', emailErr.message);
    }

    const token = signToken(user._id);

    const responsePayload = {
      success: true,
      message: 'Account created. Please verify your email with the 6-digit OTP sent.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.devOtp = otp;
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail }).select('+hashedPassword');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.',
      });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const targetEmail = req.user
      ? req.user.email
      : req.body.email
        ? req.body.email.toLowerCase().trim()
        : null;
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required to receive the OTP.',
      });
    }

    const user = await User.findOne({ email: targetEmail }).select('+otpLastSentAt');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user account found with this email.',
      });
    }

    // Rate-limit resends using cooldown
    if (user.otpLastSentAt) {
      const elapsedMs = Date.now() - new Date(user.otpLastSentAt).getTime();
      const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before requesting a new OTP.`,
          retryAfter: remainingSeconds,
        });
      }
    }

    const { otp, otpHash, otpExpires } = await generateOtpHash();

    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    await sendOtpEmail(targetEmail, otp);

    const responsePayload = {
      success: true,
      message: 'Verification code sent to your email address.',
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.devOtp = otp;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const targetEmail = req.user
      ? req.user.email
      : req.body.email
        ? req.body.email.toLowerCase().trim()
        : null;

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required to verify OTP.',
      });
    }

    const user = await User.findOne({ email: targetEmail }).select(
      '+otpHash +otpExpires +otpAttempts +otpLastSentAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user account found with this email.',
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: 'Your account is already verified.',
        user: user.toJSON(),
      });
    }

    if (!user.otpHash || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: 'No verification code requested. Please request an OTP.',
      });
    }

    if (new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new OTP.',
      });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      });
    }

    const isMatch = await bcrypt.compare(otp.trim(), user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();

      const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - user.otpAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      });
    }

    user.isVerified = true;
    user.otpHash = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    user.otpLastSentAt = null;
    await user.save();

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      isVerified: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp,
  getMe,
};
