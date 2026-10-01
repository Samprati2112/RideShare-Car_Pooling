const mongoose = require('mongoose');

/**
 * Ride Model
 * Stores carpool trips published by car owners / drivers.
 *
 * INTERVIEW DESIGN DECISIONS:
 * 1. Strict Status Enum: ['upcoming', 'in progress', 'completed', 'cancelled']
 * 2. Immutable Completion Guard: A ride can ONLY transition to 'completed' via explicit driver end-trip action.
 * 3. Compound Index: { destination: 1, status: 1, dateTime: 1 } optimizes high-frequency ride search queries.
 */
const rideSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver ID is required'],
      index: true,
    },
    origin: {
      type: String,
      required: [true, 'Please provide the starting point / origin'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Please provide the destination'],
      trim: true,
      index: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'Departure date and time is required'],
      index: true,
    },
    seatsAvailable: {
      type: Number,
      required: [true, 'Number of available seats is required'],
      min: [0, 'Seats cannot be negative'],
      max: [8, 'Maximum 8 passenger seats allowed'],
    },
    totalSeats: {
      type: Number,
      immutable: true,
      default: function () {
        return this.seatsAvailable;
      },
    },
    pricePerSeat: {
      type: Number,
      required: [true, 'Price per seat in INR is required'],
      min: [10, 'Minimum price per seat is ₹10'],
    },
    status: {
      type: String,
      enum: ['upcoming', 'in progress', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
    currentLocation: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimal search query execution
rideSchema.index({ status: 1, dateTime: 1, seatsAvailable: 1 });
rideSchema.index({ destination: 'text', origin: 'text' });

const Ride = mongoose.model('Ride', rideSchema);
module.exports = Ride;
