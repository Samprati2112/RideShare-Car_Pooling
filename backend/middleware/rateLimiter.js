const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middlewares for Auth & Sensitive Routes
 *
 * INTERVIEW DESIGN DECISIONS:
 * 1. Brute-Force & Denial of Service Protection: Limits requests per IP window.
 * 2. Standard Headers: Sends `RateLimit-*` headers to inform clients of limits and remaining quota.
 * 3. Granular Limiters: Separate thresholds for login/registration vs OTP verification.
 */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 OTP requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes before requesting again.',
  },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 verification attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts from this IP. Please wait 15 minutes.',
  },
});

module.exports = {
  authLimiter,
  otpLimiter,
  verifyOtpLimiter,
};
