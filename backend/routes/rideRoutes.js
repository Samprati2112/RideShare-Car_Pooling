const express = require('express');
const router = express.Router();
const {
  createRide,
  searchRides,
  getLocations,
  getMyListedRides,
  getRideById,
  getRideBookings,
  startRide,
  endRide,
  updateRideLocation,
  getRideLocation,
  cancelRide,
} = require('../controllers/rideController');
const { protect, requireVerified, optionalAuth } = require('../middleware/auth');
const {
  validate,
  createRideValidation,
  updateLocationValidation,
} = require('../middleware/validator');

/**
 * Ride Routes
 *
 * INTERVIEW DESIGN DECISIONS:
 * - Public & Autocomplete: / (search with optional auth for self-exclusion), /locations (autocomplete)
 * - Protected Driver Actions: createRide (requires verified account), start (time-guarded), end (completion guard), cancel (cascade refunds)
 * - Live Tracking: /:id/location (accessible to driver and confirmed passengers only)
 */
router.get('/', optionalAuth, searchRides);
router.get('/locations', getLocations);
router.get('/mine', protect, getMyListedRides);
router.get('/my-rides', protect, getMyListedRides);
router.get('/:id', getRideById);
router.get('/:id/bookings', protect, getRideBookings);
router.get('/:id/location', protect, getRideLocation);

router.post('/', protect, requireVerified, validate(createRideValidation), createRide);
router.patch('/:id/start', protect, requireVerified, startRide);
router.patch('/:id/end', protect, endRide);
router.patch('/:id/cancel', protect, cancelRide);
router.post('/:id/location', protect, validate(updateLocationValidation), updateRideLocation);

module.exports = router;
