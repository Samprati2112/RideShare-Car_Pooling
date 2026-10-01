const { body, query, param, validationResult } = require('express-validator');

/**
 * Validation Middleware Wrapper
 * Formats express-validator results into unified JSON responses `{ success: false, message: '...' }`
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Extract first error message or concatenate
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: firstError.msg,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  };
};

/**
 * Validation Rule Definitions
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Please enter your full name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please provide an email address')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Please provide a mobile number')
    .matches(/^(\+91[\-\s]?)?[6-9][\d\s\-]{9,12}$/)
    .withMessage('Please enter a valid 10-digit Indian mobile number'),
  body('password')
    .notEmpty()
    .withMessage('Please choose a password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please provide your email address')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Please enter your password'),
];

const sendOtpValidation = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const verifyOtpValidation = [
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('Please enter the 6-digit verification code')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const createRideValidation = [
  body('origin')
    .trim()
    .notEmpty()
    .withMessage('Please provide a starting point / origin')
    .isLength({ min: 2, max: 150 })
    .withMessage('Origin must be between 2 and 150 characters'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Please provide a destination')
    .isLength({ min: 2, max: 150 })
    .withMessage('Destination must be between 2 and 150 characters')
    .custom((destination, { req }) => {
      const origin = (req.body.origin || '').trim().toLowerCase();
      if (origin && destination.trim().toLowerCase() === origin) {
        throw new Error('Origin and destination cannot be the same');
      }
      return true;
    }),
  body('dateTime')
    .notEmpty()
    .withMessage('Departure date and time is required')
    .isISO8601()
    .withMessage('Please provide a valid date and time')
    .custom((dateTime) => {
      const rideDate = new Date(dateTime);
      if (rideDate.getTime() <= Date.now()) {
        throw new Error('Departure date and time must be in the future');
      }
      return true;
    }),
  body('seatsAvailable')
    .notEmpty()
    .withMessage('Available seats count is required')
    .isInt({ min: 1, max: 8 })
    .withMessage('Seats offered must be between 1 and 8'),
  body('pricePerSeat')
    .notEmpty()
    .withMessage('Price per seat is required')
    .isFloat({ min: 10 })
    .withMessage('Price per seat must be at least ₹10'),
];

const createOrderValidation = [
  body('rideId')
    .notEmpty()
    .withMessage('Ride ID is required')
    .isMongoId()
    .withMessage('Invalid Ride ID format'),
  body('seatsBooked')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Must book between 1 and 8 seats'),
  body('pickupLocation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Pickup landmark cannot exceed 200 characters'),
];

const verifyPaymentValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid Booking ID format'),
];

const updateLocationValidation = [
  body('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

const sendMessageValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid Booking ID format'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Message text cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  sendOtpValidation,
  verifyOtpValidation,
  createRideValidation,
  createOrderValidation,
  verifyPaymentValidation,
  updateLocationValidation,
  sendMessageValidation,
};
