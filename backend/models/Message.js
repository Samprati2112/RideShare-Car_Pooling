const mongoose = require('mongoose');

/**
 * Message Schema (In-App Communication)
 *
 * INTERVIEW DESIGN DECISIONS:
 * 1. Booking-Scoped Messaging: Every conversation is tied to a specific `bookingId`. This isolates chats
 *    to relevant trip contexts without requiring a complex multi-table channel management system.
 * 2. Compound Index ({ bookingId: 1, createdAt: 1 }): Makes chronological message queries
 *    (e.g., `find({ bookingId }).sort({ createdAt: 1 })`) execute as fast Index Scans without memory sorts.
 * 3. Minimal Footprint: Lean documents designed for frequent lightweight polling (e.g., every 3-5 seconds).
 */
const messageSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for instant chronological conversation retrieval
messageSchema.index({ bookingId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
