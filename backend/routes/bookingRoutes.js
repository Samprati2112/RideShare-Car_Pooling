const express = require('express');
const router = express.Router();
const {
  getMyBookings,
  getBookingById,
  updatePickupLocation,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

/**
 * Booking Routes (All Protected)
 *
 * INTERVIEW DESIGN DECISIONS:
 * - User Isolation: getMyBookings returns passenger-specific bookings.
 * - Granular Permissions: updatePickup and cancelBooking enforce passenger ownership guards.
 */
router.use(protect);

router.get('/mine', getMyBookings);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/pickup', updatePickupLocation);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
