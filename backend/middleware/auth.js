const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'rideshare_super_secret_jwt_key_2026_interview_ready';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-hashedPassword');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
};

const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      isVerified: false,
      message: 'Please verify your email with the 6-digit OTP before performing this action.',
    });
  }

  next();
};

const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'rideshare_super_secret_jwt_key_2026_interview_ready';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-hashedPassword');
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Ignore invalid tokens on public endpoints
  }

  next();
};

module.exports = {
  protect,
  requireVerified,
  optionalAuth,
};
