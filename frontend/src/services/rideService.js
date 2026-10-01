import api from './api';

export const rideService = {
  createRide: async (rideData) => {
    const response = await api.post('/rides', rideData);
    return response.data;
  },

  searchRides: async (params = {}) => {
    const response = await api.get('/rides', { params });
    return response.data;
  },

  getLocations: async (q) => {
    const response = await api.get('/rides/locations', { params: { q } });
    return response.data;
  },

  getRideById: async (id) => {
    const response = await api.get(`/rides/${id}`);
    return response.data;
  },

  getMyListedRides: async () => {
    const response = await api.get('/rides/mine');
    return response.data;
  },

  getRideBookings: async (id) => {
    const response = await api.get(`/rides/${id}/bookings`);
    return response.data;
  },

  startRide: async (id) => {
    const response = await api.patch(`/rides/${id}/start`);
    return response.data;
  },

  endRide: async (id) => {
    const response = await api.patch(`/rides/${id}/end`);
    return response.data;
  },

  cancelRide: async (id) => {
    const response = await api.patch(`/rides/${id}/cancel`);
    return response.data;
  },

  updateRideLocation: async (id, { lat, lng }) => {
    const response = await api.post(`/rides/${id}/location`, { lat, lng });
    return response.data;
  },

  getRideLocation: async (id) => {
    const response = await api.get(`/rides/${id}/location`);
    return response.data;
  },
};
