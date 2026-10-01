const crypto = require('crypto');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const {
  ADVANCE_PERCENT,
  calculateAdvancePayment,
  processPayment,
} = require('../services/paymentService');
const { MIN_SEATS, MAX_SEATS, STALE_PAYMENT_MINUTES } = require('../config/constants');

// Auto-expire unpaid bookings past the threshold
const autoExpireStaleBookings = async () => {
  try {
    const cutoff = new Date(Date.now() - STALE_PAYMENT_MINUTES * 60 * 1000);
    await Booking.updateMany(
      {
        status: 'pending_payment',
        createdAt: { $lt: cutoff },
      },
      {
        $set: { status: 'failed', paymentStatus: 'failed' },
      }
    );
  } catch (err) {
    console.warn('[Auto-expire Bookings Warning]', err.message);
  }
};

const createOrder = async (req, res, next) => {
  try {
    await autoExpireStaleBookings();

    const { rideId, seatsBooked, seats, pickupLocation = 'To be confirmed' } = req.body;
    const requestedSeats = parseInt(seatsBooked || seats, 10) || 1;

    if (requestedSeats < MIN_SEATS || requestedSeats > MAX_SEATS) {
      return res.status(400).json({
        success: false,
        message: `Please select between ${MIN_SEATS} and ${MAX_SEATS} seats.`,
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'This ride is no longer available.',
      });
    }

    if (ride.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: `This ride is ${ride.status}. New bookings are not accepted.`,
      });
    }

    if (new Date(ride.dateTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This ride has already departed.',
      });
    }

    if (ride.seatsAvailable < requestedSeats) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.seatsAvailable} seat${ride.seatsAvailable === 1 ? '' : 's'} available on this ride.`,
      });
    }

    if (ride.driverId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book a seat on a ride you are driving.',
      });
    }

    const existingBooking = await Booking.findOne({
      rideId,
      passengerId: req.user._id,
      status: { $in: ['pending_payment', 'confirmed'] },
    });

    if (existingBooking) {
      if (existingBooking.status === 'confirmed') {
        return res.status(400).json({
          success: false,
          message: 'You already have a confirmed booking for this ride.',
        });
      }
      await Booking.findByIdAndDelete(existingBooking._id);
    }

    const totalFare = ride.pricePerSeat * requestedSeats;
    const advanceAmount = calculateAdvancePayment(totalFare);
    const orderId = `order_rzp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const booking = await Booking.create({
      rideId,
      passengerId: req.user._id,
      pickupLocation: pickupLocation.trim() || 'To be coordinated with driver',
      seatsBooked: requestedSeats,
      advanceAmountPaid: 0,
      status: 'pending_payment',
      paymentStatus: 'pending',
      orderId,
    });

    return res.status(201).json({
      success: true,
      orderId,
      bookingId: booking._id,
      advanceAmount,
      totalFare,
      pricePerSeat: ride.pricePerSeat,
      seatsBooked: requestedSeats,
      advancePercent: ADVANCE_PERCENT * 100,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod = 'UPI_GPAY', forceFail = false } = req.body;

    const booking = await Booking.findOne({
      _id: bookingId,
      passengerId: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking record not found.',
      });
    }

    if (booking.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: `Booking has already been processed with status '${booking.status}'.`,
      });
    }

    const ride = await Ride.findById(booking.rideId);
    if (!ride) {
      booking.status = 'failed';
      booking.paymentStatus = 'failed';
      await booking.save();
      return res.status(404).json({
        success: false,
        message: 'The selected ride is no longer available.',
      });
    }

    const totalFare = ride.pricePerSeat * booking.seatsBooked;
    const advanceAmount = calculateAdvancePayment(totalFare);

    const paymentResult = await processPayment({
      amount: advanceAmount,
      currency: 'INR',
      paymentMethod,
      forceFail: Boolean(forceFail),
      passengerEmail: req.user.email,
    });

    if (!paymentResult.success) {
      booking.status = 'failed';
      booking.paymentStatus = 'failed';
      await booking.save();

      return res.status(400).json({
        success: false,
        message: paymentResult.message || 'Payment simulation failed. Please retry.',
        booking,
      });
    }

    // Atomic seat decrement prevents race conditions when concurrent payments succeed
    const updatedRide = await Ride.findOneAndUpdate(
      {
        _id: booking.rideId,
        status: 'upcoming',
        seatsAvailable: { $gte: booking.seatsBooked },
      },
      {
        $inc: { seatsAvailable: -booking.seatsBooked },
      },
      { new: true }
    );

    if (!updatedRide) {
      booking.status = 'failed';
      booking.paymentStatus = 'failed';
      await booking.save();

      return res.status(409).json({
        success: false,
        message: 'Available seats were just claimed by another passenger. Advance not charged.',
        booking,
      });
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.advanceAmountPaid = advanceAmount;
    booking.transactionId = paymentResult.transactionId;
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email phone isVerified' },
      })
      .populate('passengerId', 'name email phone isVerified');

    return res.status(200).json({
      success: true,
      message: `Booking confirmed. INR ${advanceAmount} advance received.`,
      transactionId: paymentResult.transactionId,
      booking: populatedBooking,
      payment: paymentResult,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  autoExpireStaleBookings,
};
