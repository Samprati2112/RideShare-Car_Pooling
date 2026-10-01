const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Message = require('../models/Message');

async function clearDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rideshare';
  console.log(`Connecting to ${mongoUri}...`);

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const [usersRes, ridesRes, bookingsRes, messagesRes] = await Promise.all([
    User.deleteMany({}),
    Ride.deleteMany({}),
    Booking.deleteMany({}),
    Message.deleteMany({}),
  ]);

  console.log('=== Database Cleaned Successfully ===');
  console.log(`- Users deleted: ${usersRes.deletedCount}`);
  console.log(`- Rides deleted: ${ridesRes.deletedCount}`);
  console.log(`- Bookings deleted: ${bookingsRes.deletedCount}`);
  console.log(`- Messages deleted: ${messagesRes.deletedCount}`);

  await mongoose.connection.close();
  console.log('Connection closed.');
  process.exit(0);
}

clearDatabase().catch((err) => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
