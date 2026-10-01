const Message = require('../models/Message');
const Booking = require('../models/Booking');
const { MAX_MESSAGE_LENGTH } = require('../config/constants');

const sendMessage = async (req, res, next) => {
  try {
    const { bookingId, text } = req.body;

    if (!bookingId || !text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and message text are required.',
      });
    }

    if (text.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const booking = await Booking.findById(bookingId).populate('rideId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Associated booking was not found.',
      });
    }

    const currentUserId = req.user._id.toString();
    const passengerId = booking.passengerId.toString();
    const driverId = booking.rideId ? booking.rideId.driverId.toString() : null;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Ride information for this booking is invalid.',
      });
    }

    let receiverId;
    if (currentUserId === passengerId) {
      receiverId = driverId;
    } else if (currentUserId === driverId) {
      receiverId = passengerId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not a participant in this conversation.',
      });
    }

    const message = await Message.create({
      bookingId,
      senderId: req.user._id,
      receiverId,
      text: text.trim(),
      timestamp: new Date(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email phone isVerified')
      .populate('receiverId', 'name email phone isVerified');

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

const getMessagesByBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId).populate('rideId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const currentUserId = req.user._id.toString();
    const passengerId = booking.passengerId.toString();
    const driverId = booking.rideId ? booking.rideId.driverId.toString() : null;

    if (currentUserId !== passengerId && currentUserId !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this conversation.',
      });
    }

    const messages = await Message.find({ bookingId })
      .populate('senderId', 'name email phone isVerified')
      .populate('receiverId', 'name email phone isVerified')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessagesByBooking,
};
