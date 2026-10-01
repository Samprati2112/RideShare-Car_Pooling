const express = require('express');
const router = express.Router();
const { register, login, sendOtp, verifyOtp, getMe } = require('../controllers/authController');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  validate,
  registerValidation,
  loginValidation,
  sendOtpValidation,
  verifyOtpValidation,
} = require('../middleware/validator');
const { authLimiter, otpLimiter, verifyOtpLimiter } = require('../middleware/rateLimiter');

/**
 * Auth Routes
 *
 * INTERVIEW DESIGN DECISIONS:
 * - Rate Limiting: express-rate-limit applied to public authentication endpoints to prevent brute-force attacks.
 * - Declarative Validation: express-validator ensures strict schema validation and sanitization.
 * - OTP Email Verification: Endpoints for generating and verifying 6-digit bcrypt-hashed tokens.
 */
router.post('/register', authLimiter, validate(registerValidation), register);
router.post('/login', authLimiter, validate(loginValidation), login);
router.post('/send-otp', otpLimiter, optionalAuth, validate(sendOtpValidation), sendOtp);
router.post(
  '/verify-otp',
  verifyOtpLimiter,
  optionalAuth,
  validate(verifyOtpValidation),
  verifyOtp
);
router.get('/me', protect, getMe);

module.exports = router;
