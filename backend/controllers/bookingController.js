const Booking = require('../models/Booking');
const Ride = require('../models/Ride');

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ passengerId: req.user._id })
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email phone isVerified' },
      })
      .sort({ createdAt: -1 });

    const bookingsWithRideStatus = bookings.map((b) => {
      const obj = b.toObject();
      obj.rideStatus = b.rideId ? b.rideId.status : null;
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: bookingsWithRideStatus.length,
      bookings: bookingsWithRideStatus,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email phone isVerified' },
      })
      .populate('passengerId', 'name email phone isVerified');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const currentUserId = req.user._id.toString();
    const isPassenger = booking.passengerId._id.toString() === currentUserId;
    const isDriver =
      booking.rideId &&
      booking.rideId.driverId &&
      booking.rideId.driverId._id.toString() === currentUserId;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this booking.',
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

const updatePickupLocation = async (req, res, next) => {
  try {
    const { pickupLocation } = req.body;

    if (!pickupLocation || pickupLocation.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid pickup spot.',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update the pickup location for your own bookings.',
      });
    }

    booking.pickupLocation = pickupLocation.trim();
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Pickup location updated successfully.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    if (booking.passengerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings.',
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking with status '${booking.status}'.`,
      });
    }

    const ride = await Ride.findById(booking.rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Associated ride was not found.',
      });
    }

    if (ride.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking because the ride is already '${ride.status}'.`,
      });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Restore exact booked seats back to the ride
    await Ride.findByIdAndUpdate(booking.rideId, {
      $inc: { seatsAvailable: booking.seatsBooked },
    });

    return res.status(200).json({
      success: true,
      message: `Booking cancelled successfully. INR ${booking.advanceAmountPaid} refunded.`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBookings,
  getBookingById,
  updatePickupLocation,
  cancelBooking,
};
