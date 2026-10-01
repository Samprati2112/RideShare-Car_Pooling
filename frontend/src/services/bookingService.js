import api from './api';

export const bookingService = {
  getMyBookings: async () => {
    const response = await api.get('/bookings/mine');
    return response.data;
  },

  getBookingById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  updatePickupLocation: async (bookingId, pickupLocation) => {
    const response = await api.patch(`/bookings/${bookingId}/pickup`, { pickupLocation });
    return response.data;
  },

  cancelBooking: async (bookingId) => {
    const response = await api.patch(`/bookings/${bookingId}/cancel`);
    return response.data;
  },
};
