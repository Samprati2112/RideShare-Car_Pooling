import api from './api';

export const messageService = {
  sendMessage: async ({ bookingId, text }) => {
    const response = await api.post('/messages', { bookingId, text });
    return response.data;
  },

  getMessagesByBooking: async (bookingId) => {
    const response = await api.get(`/messages/${bookingId}`);
    return response.data;
  },
};
