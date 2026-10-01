import api from './api';

export const paymentService = {
  createOrder: async ({ rideId, seatsBooked = 1, pickupLocation }) => {
    const response = await api.post('/payments/create-order', {
      rideId,
      seatsBooked,
      pickupLocation,
    });
    return response.data;
  },

  verifyPayment: async ({ bookingId, orderId, paymentMethod = 'UPI_GPAY', forceFail = false }) => {
    const response = await api.post('/payments/verify', {
      bookingId,
      orderId,
      paymentMethod,
      forceFail,
    });
    return response.data;
  },
};
