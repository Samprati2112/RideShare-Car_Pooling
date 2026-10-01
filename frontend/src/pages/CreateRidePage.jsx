import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { rideService } from '../services/rideService';
import { useAuth } from '../context/AuthContext';
import { ADVANCE_PERCENT } from '../constants';
import LocationInput from '../components/LocationInput';
import Alert from '../components/Alert';

const CreateRidePage = () => {
  const navigate = useNavigate();
  const { user, isVerified } = useAuth();

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    dateTime: '',
    seatsAvailable: 3,
    pricePerSeat: 200,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const totalSeats = parseInt(formData.seatsAvailable, 10) || 0;
  const fare = parseFloat(formData.pricePerSeat) || 0;
  const potentialTotal = totalSeats * fare;
  const advanceTotal = Math.round(potentialTotal * ADVANCE_PERCENT);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isVerified) {
      navigate('/verify-otp', { state: { email: user?.email, from: '/create-ride' } });
      return;
    }

    if (!formData.origin.trim() || !formData.destination.trim() || !formData.dateTime) {
      setError('Please provide origin, destination, and departure time.');
      return;
    }

    if (formData.origin.trim().toLowerCase() === formData.destination.trim().toLowerCase()) {
      setError('Origin and destination cannot be the same.');
      return;
    }

    if (new Date(formData.dateTime) <= new Date()) {
      setError('Departure date and time must be in the future.');
      return;
    }

    if (totalSeats < 1 || totalSeats > 8) {
      setError('Seats offered must be between 1 and 8.');
      return;
    }

    if (fare < 10) {
      setError('Price per seat must be at least ₹10.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rideService.createRide({
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        dateTime: new Date(formData.dateTime).toISOString(),
        seatsAvailable: totalSeats,
        pricePerSeat: fare,
      });

      if (res.success) {
        navigate('/my-rides');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to publish ride.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card">
        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            marginBottom: '0.25rem',
            color: 'var(--text-primary)',
          }}
        >
          Offer a Ride
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Publish empty seats in your vehicle to share fuel costs with verified commuters.
        </p>

        {error && <Alert type="error" message={error} />}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {/* Origin */}
          <div className="form-group">
            <label htmlFor="origin" className="form-label">Pickup Origin</label>
            <LocationInput
              id="origin"
              value={formData.origin}
              onChange={(val) => setFormData((prev) => ({ ...prev, origin: val }))}
              placeholder="e.g. Silk Board, Bengaluru"
              source="nominatim"
              required
            />
          </div>

          {/* Destination */}
          <div className="form-group">
            <label htmlFor="destination" className="form-label">Destination</label>
            <LocationInput
              id="destination"
              value={formData.destination}
              onChange={(val) => setFormData((prev) => ({ ...prev, destination: val }))}
              placeholder="e.g. Electronic City Phase 1"
              source="nominatim"
              required
            />
          </div>

          {/* Departure Date & Time */}
          <div className="form-group">
            <label htmlFor="dateTime" className="form-label">
              Departure Date & Time
            </label>
            <input
              type="datetime-local"
              id="dateTime"
              name="dateTime"
              className="form-input"
              value={formData.dateTime}
              onChange={handleChange}
              required
            />
          </div>

          {/* Seats and Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="seatsAvailable" className="form-label">
                Available Seats
              </label>
              <input
                type="number"
                id="seatsAvailable"
                name="seatsAvailable"
                className="form-input"
                min="1"
                max="8"
                value={formData.seatsAvailable}
                onChange={handleChange}
                required
              />
              <span className="form-helper">Between 1 and 8 seats</span>
            </div>

            <div className="form-group">
              <label htmlFor="pricePerSeat" className="form-label">
                Price per Seat (₹)
              </label>
              <input
                type="number"
                id="pricePerSeat"
                name="pricePerSeat"
                className="form-input"
                min="10"
                step="10"
                value={formData.pricePerSeat}
                onChange={handleChange}
                required
              />
              <span className="form-helper">Per passenger</span>
            </div>
          </div>

          {/* Projected Earnings Summary */}
          <div
            style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Total Estimated Fuel Share</span>
              <span style={{ fontWeight: 600 }}>₹{potentialTotal}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              <span>20% Advance Tokens Guaranteed</span>
              <span>₹{advanceTotal}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
            style={{ marginTop: '0.5rem' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Publishing Ride...</span>
              </>
            ) : (
              <span>Publish Ride</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRidePage;
