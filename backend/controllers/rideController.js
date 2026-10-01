const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const {
  START_WINDOW_MINUTES,
  MIN_SEATS,
  MAX_SEATS,
  MIN_PRICE_PER_SEAT,
} = require('../config/constants');

// Safe regex escaping to prevent ReDoS on user query input
const escapeRegex = (text) => {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// Cancel expired rides and cascade refund their bookings
const autoExpirePastRides = async () => {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredRides = await Ride.find({
      status: 'upcoming',
      dateTime: { $lt: cutoffDate },
    });

    if (expiredRides.length > 0) {
      const expiredIds = expiredRides.map((r) => r._id);
      await Ride.updateMany({ _id: { $in: expiredIds } }, { $set: { status: 'cancelled' } });
      await Booking.updateMany(
        { rideId: { $in: expiredIds }, status: 'confirmed' },
        { $set: { status: 'cancelled', paymentStatus: 'refunded' } }
      );
    }
  } catch (err) {
    console.warn('[Auto-expire Rides Warning]', err.message);
  }
};

const createRide = async (req, res, next) => {
  try {
    const { origin, destination, dateTime, seatsAvailable, pricePerSeat } = req.body;

    const departureTime = new Date(dateTime);
    if (departureTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Departure date and time must be in the future.',
      });
    }

    const cleanOrigin = origin.trim();
    const cleanDestination = destination.trim();

    if (cleanOrigin.toLowerCase() === cleanDestination.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination cannot be the same.',
      });
    }

    const seats = parseInt(seatsAvailable, 10);
    if (seats < MIN_SEATS || seats > MAX_SEATS) {
      return res.status(400).json({
        success: false,
        message: `Seats offered must be between ${MIN_SEATS} and ${MAX_SEATS}.`,
      });
    }

    const fare = parseFloat(pricePerSeat);
    if (fare < MIN_PRICE_PER_SEAT) {
      return res.status(400).json({
        success: false,
        message: `Price per seat must be at least INR ${MIN_PRICE_PER_SEAT}.`,
      });
    }

    const ride = await Ride.create({
      driverId: req.user._id,
      origin: cleanOrigin,
      destination: cleanDestination,
      dateTime: departureTime,
      seatsAvailable: seats,
      totalSeats: seats,
      pricePerSeat: fare,
      status: 'upcoming',
    });

    const populatedRide = await Ride.findById(ride._id).populate(
      'driverId',
      'name email phone isVerified'
    );

    return res.status(201).json({
      success: true,
      message: 'Ride published successfully.',
      ride: populatedRide,
    });
  } catch (error) {
    next(error);
  }
};

const searchRides = async (req, res, next) => {
  try {
    await autoExpirePastRides();

    const { destination, origin, date, featured } = req.query;

    const query = {
      status: 'upcoming',
      seatsAvailable: { $gt: 0 },
      dateTime: { $gt: new Date() },
    };

    if (req.user) {
      query.driverId = { $ne: req.user._id };
    }

    const buildLocationSearchRegex = (input) => {
      const parts = input.split(',').map((p) => escapeRegex(p.trim())).filter(Boolean);
      return parts.length > 1 ? parts.join(',\\s*') : escapeRegex(input.trim());
    };

    if (destination && destination.trim() !== '') {
      const regexPattern = buildLocationSearchRegex(destination.trim());
      query.destination = { $regex: regexPattern, $options: 'i' };
    } else if (featured !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Destination is required for searching rides.',
      });
    }

    if (origin && origin.trim() !== '') {
      const regexPattern = buildLocationSearchRegex(origin.trim());
      query.origin = { $regex: regexPattern, $options: 'i' };
    }

    if (date) {
      const searchDate = new Date(date);
      if (!isNaN(searchDate.getTime())) {
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);

        const effectiveStart = startOfDay < new Date() ? new Date() : startOfDay;
        query.dateTime = { $gte: effectiveStart, $lte: endOfDay };
      }
    }

    const rides = await Ride.find(query)
      .populate('driverId', 'name email phone isVerified')
      .sort({ dateTime: 1 });

    return res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    next(error);
  }
};

const getLocations = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json({
        success: true,
        locations: [],
      });
    }

    const searchPattern = new RegExp(escapeRegex(q.trim()), 'i');

    const rides = await Ride.find({
      status: { $in: ['upcoming', 'in progress'] },
      $or: [{ origin: { $regex: searchPattern } }, { destination: { $regex: searchPattern } }],
    })
      .select('origin destination')
      .limit(30);

    const locationSet = new Set();
    const queryLower = q.trim().toLowerCase();

    rides.forEach((ride) => {
      if (ride.origin && ride.origin.toLowerCase().includes(queryLower)) {
        locationSet.add(ride.origin.trim());
      }
      if (ride.destination && ride.destination.toLowerCase().includes(queryLower)) {
        locationSet.add(ride.destination.trim());
      }
    });

    const locations = Array.from(locationSet).slice(0, 8);

    return res.status(200).json({
      success: true,
      count: locations.length,
      locations,
    });
  } catch (error) {
    next(error);
  }
};

const getMyListedRides = async (req, res, next) => {
  try {
    await autoExpirePastRides();

    const rides = await Ride.find({ driverId: req.user._id })
      .populate('driverId', 'name email phone isVerified')
      .sort({ createdAt: -1 });

    const rideIds = rides.map((r) => r._id);
    const bookings = await Booking.find({
      rideId: { $in: rideIds },
      status: { $in: ['confirmed', 'cancelled', 'pending_payment'] },
    }).populate('passengerId', 'name email phone isVerified');

    const bookingsByRideId = {};
    bookings.forEach((booking) => {
      const rId = booking.rideId.toString();
      if (!bookingsByRideId[rId]) {
        bookingsByRideId[rId] = [];
      }
      bookingsByRideId[rId].push(booking);
    });

    const ridesWithBookings = rides.map((ride) => {
      const rideObj = ride.toObject();
      rideObj.bookings = bookingsByRideId[ride._id.toString()] || [];
      return rideObj;
    });

    return res.status(200).json({
      success: true,
      count: ridesWithBookings.length,
      rides: ridesWithBookings,
    });
  } catch (error) {
    next(error);
  }
};

const getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id).populate(
      'driverId',
      'name email phone isVerified'
    );
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    return res.status(200).json({
      success: true,
      ride,
    });
  } catch (error) {
    next(error);
  }
};

const getRideBookings = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the driver can view the passenger manifest for this ride.',
      });
    }

    const bookings = await Booking.find({
      rideId: ride._id,
      status: { $in: ['confirmed', 'cancelled'] },
    }).populate('passengerId', 'name email phone isVerified');

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// Start ride within 30 minutes of departure window
const startRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the driver can start this ride.',
      });
    }

    if (ride.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: `Cannot start ride with status '${ride.status}'. Only upcoming rides can be started.`,
      });
    }

    // Time window check: departure minus START_WINDOW_MINUTES
    const scheduledTime = new Date(ride.dateTime).getTime();
    const earliestAllowedTime = scheduledTime - START_WINDOW_MINUTES * 60 * 1000;
    const now = Date.now();

    if (now < earliestAllowedTime) {
      const minutesRemaining = Math.ceil((earliestAllowedTime - now) / (60 * 1000));
      return res.status(400).json({
        success: false,
        message: `Ride can only be started within 30 minutes of scheduled departure time. Please wait ${minutesRemaining} more minute${minutesRemaining === 1 ? '' : 's'}.`,
      });
    }

    ride.status = 'in progress';
    await ride.save();

    return res.status(200).json({
      success: true,
      message: 'Ride started successfully.',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

// Exclusively complete a ride in progress
const endRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the driver can end this ride.',
      });
    }

    if (ride.status !== 'in progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot end a ride with status '${ride.status}'. Only rides currently in progress can be completed.`,
      });
    }

    ride.status = 'completed';
    await ride.save();

    return res.status(200).json({
      success: true,
      message: 'Trip completed successfully.',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

const updateRideLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;

    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the driver can update the live location.',
      });
    }

    if (ride.status !== 'in progress') {
      return res.status(400).json({
        success: false,
        message: 'Live location updates are only accepted while the ride is in progress.',
      });
    }

    ride.currentLocation = {
      lat: Number(lat),
      lng: Number(lng),
      updatedAt: new Date(),
    };

    await ride.save();

    return res.status(200).json({
      success: true,
      currentLocation: ride.currentLocation,
    });
  } catch (error) {
    next(error);
  }
};

const getRideLocation = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id).select(
      'status currentLocation origin destination driverId'
    );
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    const currentUserId = req.user._id.toString();
    const isDriver = ride.driverId.toString() === currentUserId;

    if (!isDriver) {
      const hasBooking = await Booking.findOne({
        rideId: ride._id,
        passengerId: req.user._id,
        status: 'confirmed',
      });

      if (!hasBooking) {
        return res.status(403).json({
          success: false,
          message: 'Only confirmed passengers or the driver can access live GPS tracking.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      status: ride.status,
      currentLocation: ride.currentLocation,
    });
  } catch (error) {
    next(error);
  }
};

const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.',
      });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the driver can cancel this ride.',
      });
    }

    if (ride.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ride with status '${ride.status}'. Only upcoming rides can be cancelled.`,
      });
    }

    ride.status = 'cancelled';
    await ride.save();

    await Booking.updateMany(
      { rideId: ride._id, status: 'confirmed' },
      { $set: { status: 'cancelled', paymentStatus: 'refunded' } }
    );

    return res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully. All passenger bookings have been refunded.',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
