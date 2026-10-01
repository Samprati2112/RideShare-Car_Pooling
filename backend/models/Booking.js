const mongoose = require('mongoose');

/**
 * Booking Model
 *
 * INTERVIEW DESIGN DECISIONS:
 * 1. Junction Document (Ride <-> Passenger): Decouples rides from passengers, tracking seat allocations,
 *    advance token deposits, pickup landmarks, and payment gateway auditing.
 * 2. Status & Payment Enums:
 *    - status: ['pending_payment', 'confirmed', 'cancelled', 'failed']
 *    - paymentStatus: ['pending', 'paid', 'failed', 'refunded']
 * 3. Atomic State Management: Status guarantees that seats are only decremented upon successful payment verification.
 * 4. Compound Indexes: Enables fast queries for driver passenger lists and passenger booking dashboards.
 */
const bookingSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
      index: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger ID is required'],
      index: true,
    },
    pickupLocation: {
      type: String,
      trim: true,
      default: 'To be confirmed',
      maxlength: [200, 'Pickup landmark cannot exceed 200 characters'],
    },
    seatsBooked: {
      type: Number,
      required: [true, 'Seats booked count is required'],
      min: [1, 'Must book at least 1 seat'],
      max: [8, 'Maximum 8 seats allowed per booking'],
      default: 1,
    },
    advanceAmountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Advance amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'cancelled', 'failed'],
      default: 'pending_payment',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      default: null,
    },
    orderId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast lookups
bookingSchema.index({ passengerId: 1, createdAt: -1 });
bookingSchema.index({ rideId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: 1 }); // For auto-expiring pending bookings

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
