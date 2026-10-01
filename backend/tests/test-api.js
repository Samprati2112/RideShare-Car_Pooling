const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/rideshare_test';

// Import Models
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Message = require('../models/Message');

// Import Routes and Middlewares
const authRoutes = require('../routes/authRoutes');
const rideRoutes = require('../routes/rideRoutes');
const bookingRoutes = require('../routes/bookingRoutes');
const paymentRoutes = require('../routes/paymentRoutes');
const messageRoutes = require('../routes/messageRoutes');
const errorHandler = require('../middleware/errorHandler');

// Create test express app
const createTestApp = () => {
  process.env.NODE_ENV = 'test';
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (req, res) => res.status(200).json({ status: 'healthy' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/rides', rideRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('*', (req, res) =>
    res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found` })
  );
  app.use(errorHandler);

  return app;
};

async function runApiTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING COMPREHENSIVE RIDESHARE API SUITE');
  console.log(`Test Database: ${TEST_MONGO_URI}`);
  console.log('========================================================\n');

  await mongoose.connect(TEST_MONGO_URI);
  await mongoose.connection.dropDatabase();

  const app = createTestApp();
  let passedCount = 0;
  let failedCount = 0;
  const testResults = [];

  function assertTest(testNumber, name, condition, evidence = '') {
    if (condition) {
      passedCount++;
      testResults.push({ testNumber, name, status: 'PASS', evidence });
      console.log(`[PASS] Step ${testNumber}: ${name}`);
      if (evidence) console.log(`       Evidence: ${evidence}`);
    } else {
      failedCount++;
      testResults.push({ testNumber, name, status: 'FAIL', evidence });
      console.log(`[FAIL] Step ${testNumber}: ${name}`);
      if (evidence) console.log(`       Evidence: ${evidence}`);
    }
  }

  try {
    // 1. Health check
    const healthRes = await request(app).get('/api/health');
    assertTest(
      1,
      'Health check returns healthy status',
      healthRes.status === 200 && healthRes.body.status === 'healthy',
      `Status: ${healthRes.status}`
    );

    // 2. Register Driver (Unverified)
    const driverEmail = `driver_${Date.now()}@test.com`;
    const regDriverRes = await request(app).post('/api/auth/register').send({
      name: 'Suresh Raina',
      email: driverEmail,
      phone: '9845011223',
      password: 'Password123!',
    });
    const driverToken = regDriverRes.body.token;
    const driverDevOtp = regDriverRes.body.devOtp;
    assertTest(
      2,
      'Driver Registration creates unverified user (isVerified === false)',
      regDriverRes.status === 201 && regDriverRes.body.user?.isVerified === false,
      `isVerified: ${regDriverRes.body.user?.isVerified}`
    );

    // 3. requireVerified Guard: Block unverified user
    const unverifiedListRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: 'Indiranagar, Bengaluru',
        destination: 'Whitefield, Bengaluru',
        dateTime: new Date(Date.now() + 24 * 3600000).toISOString(),
        seatsAvailable: 4,
        pricePerSeat: 200,
      });
    assertTest(
      3,
      'requireVerified Guard blocks unverified user from listing ride (403)',
      unverifiedListRes.status === 403,
      `Status: ${unverifiedListRes.status}`
    );

    // 4. Invalid OTP rejected
    const invalidOtpRes = await request(app).post('/api/auth/verify-otp').send({
      email: driverEmail,
      otp: '000000',
    });
    assertTest(
      4,
      'Invalid OTP rejected with attempts counter (400)',
      invalidOtpRes.status === 400 && invalidOtpRes.body.message.includes('attempt'),
      `Message: ${invalidOtpRes.body.message}`
    );

    // 5. Cooldown on fast resend
    const fastResendRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: driverEmail });
    assertTest(
      5,
      '60-second cooldown enforced on rapid OTP resend (429)',
      fastResendRes.status === 429,
      `Status: ${fastResendRes.status}`
    );

    // 6. Valid OTP verifies driver
    const verifyOtpRes = await request(app).post('/api/auth/verify-otp').send({
      email: driverEmail,
      otp: driverDevOtp,
    });
    const dbDriver = await User.findOne({ email: driverEmail });
    assertTest(
      6,
      'Valid OTP verifies user (isVerified === true)',
      verifyOtpRes.status === 200 && dbDriver.isVerified === true,
      `isVerified in DB: ${dbDriver.isVerified}`
    );

    // 7. Verified Driver lists Ride
    const futureDeparture = new Date(Date.now() + 2 * 3600000).toISOString();
    const createRideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: 'Koramangala, Bengaluru',
        destination: 'Whitefield Tech Park, Bengaluru',
        dateTime: futureDeparture,
        seatsAvailable: 4,
        pricePerSeat: 200,
      });
    const ride1Id = createRideRes.body.ride?._id;
    assertTest(
      7,
      'Verified Driver lists Ride (seats: 4, price: ₹200)',
      createRideRes.status === 201 && ride1Id != null,
      `Ride ID: ${ride1Id}`
    );

    // 8. Location Suggestions
    const locRes = await request(app).get('/api/rides/locations?q=white');
    assertTest(
      8,
      'Location Autocomplete returns suggestions from database',
      locRes.status === 200 && locRes.body.locations?.length > 0,
      `Suggestions: ${JSON.stringify(locRes.body.locations)}`
    );

    // 9. Register & Verify Passenger
    const passEmail = `passenger_${Date.now()}@test.com`;
    const regPassRes = await request(app).post('/api/auth/register').send({
      name: 'Rohan Joshi',
      email: passEmail,
      phone: '9845011999',
      password: 'Password123!',
    });
    const passToken = regPassRes.body.token;
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: passEmail, otp: regPassRes.body.devOtp });
    assertTest(
      9,
      'Passenger registered and verified successfully',
      regPassRes.status === 201 && passToken != null,
      `Pass Token: ${Boolean(passToken)}`
    );

    // 10. Search requires destination
    const searchNoDestRes = await request(app).get('/api/rides');
    assertTest(
      10,
      'Search requires destination parameter (400)',
      searchNoDestRes.status === 400,
      `Status: ${searchNoDestRes.status}`
    );

    // 11. Passenger finds ride
    const searchRes = await request(app).get('/api/rides?destination=whitefield');
    assertTest(
      11,
      'Passenger finds ride with case-insensitive partial match',
      searchRes.status === 200 && searchRes.body.rides?.length > 0,
      `Matching rides count: ${searchRes.body.rides?.length}`
    );

    // 12. Driver Search self-excludes own listed ride
    const driverSearchRes = await request(app)
      .get('/api/rides?destination=whitefield')
      .set('Authorization', `Bearer ${driverToken}`);
    assertTest(
      12,
      'Driver search self-excludes own listed ride',
      driverSearchRes.status === 200 && driverSearchRes.body.rides?.length === 0,
      `Rides count for driver: ${driverSearchRes.body.rides?.length}`
    );

    // 13. Create Order calculates 20% advance
    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        rideId: ride1Id,
        seatsBooked: 2,
      });
    assertTest(
      13,
      'Create Order calculates 20% advance token (₹80 of ₹400)',
      orderRes.status === 201 && orderRes.body.advanceAmount === 80,
      `Advance amount: ₹${orderRes.body.advanceAmount}`
    );

    // 14. forceFail leaves seats untouched
    const failVerifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        bookingId: orderRes.body.bookingId,
        forceFail: true,
      });
    const rideAfterFail = await Ride.findById(ride1Id);
    assertTest(
      14,
      'Payment failure (forceFail) leaves seats untouched (4)',
      failVerifyRes.status === 400 && rideAfterFail.seatsAvailable === 4,
      `Seats remaining: ${rideAfterFail.seatsAvailable}`
    );

    // ----------------------------------------------------
    // DEDICATED CANCELLATION & SEAT RESTORATION SUITE
    // ----------------------------------------------------

    // 15. Multi-seat booking test (book N=2 seats on ride1)
    const order2Res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        rideId: ride1Id,
        seatsBooked: 2,
      });
    const booking2Id = order2Res.body.bookingId;
    const verify2Res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        bookingId: booking2Id,
        forceFail: false,
      });
    const rideAfterBook = await Ride.findById(ride1Id);
    assertTest(
      15,
      'Multi-seat booking succeeds: decrements seats atomically from 4 to 2',
      verify2Res.status === 200 && rideAfterBook.seatsAvailable === 2,
      `Seats after booking: ${rideAfterBook.seatsAvailable}`
    );

    // 16. Passenger cancels booking on upcoming ride -> restores original seats (2 -> 4)
    const cancelBookingRes = await request(app)
      .patch(`/api/bookings/${booking2Id}/cancel`)
      .set('Authorization', `Bearer ${passToken}`);
    const bookingAfterCancel = await Booking.findById(booking2Id);
    const rideAfterRestoral = await Ride.findById(ride1Id);
    assertTest(
      16,
      'Passenger cancels booking: status "cancelled", payment "refunded", seats dynamically restored (2 -> 4)',
      cancelBookingRes.status === 200 &&
        bookingAfterCancel.status === 'cancelled' &&
        bookingAfterCancel.paymentStatus === 'refunded' &&
        rideAfterRestoral.seatsAvailable === 4,
      `Status: ${bookingAfterCancel.status}, Payment: ${bookingAfterCancel.paymentStatus}, Seats Restored: ${rideAfterRestoral.seatsAvailable}`
    );

    // 17. Negative cancel tests
    const doubleCancelRes = await request(app)
      .patch(`/api/bookings/${booking2Id}/cancel`)
      .set('Authorization', `Bearer ${passToken}`);
    assertTest(
      17,
      'Cancelling an already cancelled booking is rejected (400)',
      doubleCancelRes.status === 400,
      `Status: ${doubleCancelRes.status}`
    );

    // 18. Driver Ride Cancellation on dedicated upcoming ride
    const rideForCancelRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: 'HSR Layout, Bengaluru',
        destination: 'Whitefield, Bengaluru',
        dateTime: new Date(Date.now() + 3 * 3600000).toISOString(),
        seatsAvailable: 3,
        pricePerSeat: 180,
      });
    const cancelTargetRideId = rideForCancelRes.body.ride._id;

    // Book 1 seat on it
    const orderForCascade = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        rideId: cancelTargetRideId,
        seatsBooked: 1,
      });
    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        bookingId: orderForCascade.body.bookingId,
        forceFail: false,
      });

    const driverCancelRes = await request(app)
      .patch(`/api/rides/${cancelTargetRideId}/cancel`)
      .set('Authorization', `Bearer ${driverToken}`);
    const cascadeBooking = await Booking.findById(orderForCascade.body.bookingId);
    const searchAfterCancel = await request(app).get('/api/rides?destination=whitefield');
    const isCancelledRideInSearch = searchAfterCancel.body.rides?.some(
      (r) => r._id.toString() === cancelTargetRideId.toString()
    );

    assertTest(
      18,
      'Driver cancels upcoming ride: cascade-refunds bookings and excludes ride from search',
      driverCancelRes.status === 200 &&
        cascadeBooking.status === 'cancelled' &&
        cascadeBooking.paymentStatus === 'refunded' &&
        !isCancelledRideInSearch,
      `Ride Cancelled: 200, Booking Refunded: ${cascadeBooking.paymentStatus}, In Search: ${isCancelledRideInSearch}`
    );

    // ----------------------------------------------------
    // DEDICATED RIDE LIFECYCLE, GPS & MESSAGING SUITE
    // ----------------------------------------------------

    // 19. Start-Ride Time Guard (Ride in 2 hours > 30m)
    const farRideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: 'Koramangala, Bengaluru',
        destination: 'Electronic City, Bengaluru',
        dateTime: new Date(Date.now() + 2 * 3600000).toISOString(),
        seatsAvailable: 3,
        pricePerSeat: 150,
      });
    const earlyStartRes = await request(app)
      .patch(`/api/rides/${farRideRes.body.ride._id}/start`)
      .set('Authorization', `Bearer ${driverToken}`);
    assertTest(
      19,
      'Start-Ride server-side guard rejects start >30m before departure (400)',
      earlyStartRes.status === 400,
      `Status: ${earlyStartRes.status}`
    );

    // 20. Imminent Ride (within 10 minutes)
    const imminentRideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: 'Silk Board, Bengaluru',
        destination: 'Electronic City, Bengaluru',
        dateTime: new Date(Date.now() + 10 * 60000).toISOString(),
        seatsAvailable: 3,
        pricePerSeat: 150,
      });
    const imminentRideId = imminentRideRes.body.ride._id;

    // Book seat while upcoming
    const orderImminent = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        rideId: imminentRideId,
        seatsBooked: 1,
        pickupLocation: 'Near Forum Mall Gate 1',
      });
    const imminentBookingId = orderImminent.body.bookingId;
    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        bookingId: imminentBookingId,
        forceFail: false,
      });

    // 21. Start Ride inside 30m window
    const validStartRes = await request(app)
      .patch(`/api/rides/${imminentRideId}/start`)
      .set('Authorization', `Bearer ${driverToken}`);
    assertTest(
      21,
      'Start-Ride succeeds inside 30m window (status: "in progress")',
      validStartRes.status === 200 && validStartRes.body.ride?.status === 'in progress',
      `Status: ${validStartRes.body.ride?.status}`
    );

    // 22. Negative: cannot cancel booking after ride started
    const cancelInProgressBookingRes = await request(app)
      .patch(`/api/bookings/${imminentBookingId}/cancel`)
      .set('Authorization', `Bearer ${passToken}`);
    assertTest(
      22,
      'Cannot cancel booking once ride is "in progress" (400)',
      cancelInProgressBookingRes.status === 400,
      `Status: ${cancelInProgressBookingRes.status}`
    );

    // 23. Driver broadcasts GPS
    const gpsPostRes = await request(app)
      .post(`/api/rides/${imminentRideId}/location`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        lat: 12.9176,
        lng: 77.6238,
      });
    assertTest(
      23,
      'Driver broadcasts live GPS coordinates (lat: 12.9176, lng: 77.6238)',
      gpsPostRes.status === 200 && gpsPostRes.body.currentLocation?.lat === 12.9176,
      `Lat: ${gpsPostRes.body.currentLocation?.lat}`
    );

    // 24. Passenger polls GPS
    const gpsGetRes = await request(app)
      .get(`/api/rides/${imminentRideId}/location`)
      .set('Authorization', `Bearer ${passToken}`);
    assertTest(
      24,
      'Confirmed Passenger polls driver live GPS coordinates',
      gpsGetRes.status === 200 && gpsGetRes.body.currentLocation?.lat === 12.9176,
      `Polled Lat: ${gpsGetRes.body.currentLocation?.lat}`
    );

    // 25. Scoped In-App Messaging
    const msgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${passToken}`)
      .send({
        bookingId: imminentBookingId,
        text: 'Hi Suresh, I am at Gate 1.',
      });
    const chatHistoryRes = await request(app)
      .get(`/api/messages/${imminentBookingId}`)
      .set('Authorization', `Bearer ${passToken}`);
    assertTest(
      25,
      'Scoped In-App Messaging delivers and orders messages chronologically',
      msgRes.status === 201 && chatHistoryRes.body.messages?.length > 0,
      `Messages: ${chatHistoryRes.body.messages?.length}`
    );

    // 26. Driver Passenger Manifest
    const manifestRes = await request(app)
      .get(`/api/rides/${imminentRideId}/bookings`)
      .set('Authorization', `Bearer ${driverToken}`);
    assertTest(
      26,
      'Driver Passenger Manifest lists passenger pickup points',
      manifestRes.status === 200 && manifestRes.body.bookings?.length > 0,
      `Manifest bookings count: ${manifestRes.body.bookings?.length}`
    );

    // 27. Driver Ends Ride (Last lifecycle transition)
    const endRideRes = await request(app)
      .patch(`/api/rides/${imminentRideId}/end`)
      .set('Authorization', `Bearer ${driverToken}`);
    const completedRideDb = await Ride.findById(imminentRideId);
    assertTest(
      27,
      'Driver Ends Ride (exclusive transition to "completed")',
      endRideRes.status === 200 && completedRideDb.status === 'completed',
      `Final status in DB: ${completedRideDb.status}`
    );

    // 28. Negative: cannot cancel completed ride
    const cancelCompletedRideRes = await request(app)
      .patch(`/api/rides/${imminentRideId}/cancel`)
      .set('Authorization', `Bearer ${driverToken}`);
    assertTest(
      28,
      'Cannot cancel a ride that is already "completed" (400)',
      cancelCompletedRideRes.status === 400,
      `Status: ${cancelCompletedRideRes.status}`
    );

    console.log('\n========================================================');
    const totalTests = testResults.length;
    console.log(`📊 FINAL RESULTS: ${passedCount} / ${totalTests} PASSED (Failed: ${failedCount})`);
    console.log('========================================================\n');

    if (failedCount === 0) {
      console.log('🎉 ALL API VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    }

    return { total: totalTests, passed: passedCount, failed: failedCount, results: testResults };
  } catch (err) {
    console.error('Fatal API Suite Error:', err);
    return { error: err.message, passed: passedCount, failed: failedCount + 1 };
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runApiTests().then((res) => {
    if (res.failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

module.exports = { runApiTests };
