const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect, requireVerified } = require('../middleware/auth');
const {
  validate,
  createOrderValidation,
  verifyPaymentValidation,
} = require('../middleware/validator');

/**
 * Payment Routes (All Protected & Verified)
 *
 * INTERVIEW DESIGN DECISIONS:
 * - Two-Phase Commit Pattern:
 *   1. /create-order: Initializes order and creates 'pending_payment' booking.
 *   2. /verify: Executes payment simulation and atomically reserves seats via $inc.
 */
router.use(protect);
router.use(requireVerified);

router.post('/create-order', validate(createOrderValidation), createOrder);
router.post('/verify', validate(verifyPaymentValidation), verifyPayment);

module.exports = router;
