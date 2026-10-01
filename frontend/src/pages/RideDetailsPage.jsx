import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import { ADVANCE_PERCENT } from '../constants';
import BookingModal from '../components/BookingModal';
import LiveTrackingMap from '../components/LiveTrackingMap';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';

const RideDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);

  const fetchRide = async () => {
    try {
      const res = await rideService.getRideById(id);
      if (res.success) {
        setRide(res.ride);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ride details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    if (isAuthenticated) {
      bookingService
        .getMyBookings()
        .then((res) => {
          if (res.success && res.bookings) {
            const booked = res.bookings.some((b) => {
              const bRideId = b.rideId?._id || b.rideId;
              return (
                String(bRideId) === String(id) &&
                (b.status === 'confirmed' || b.status === 'pending_payment')
              );
            });
            setHasActiveBooking(booked);
          }
        })
        .catch(() => {});
    }
  }, [id, isAuthenticated]);

  if (loading) return <LoadingSpinner text="Loading ride details..." size="md" />;
  if (error || !ride) {
    return (
      <div
        className="card"
        style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '480px', margin: '0 auto' }}
      >
        <Alert type="error" message={error || 'Ride not found'} />
        <Link to="/search" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
          Back to Search
        </Link>
      </div>
    );
  }

  const rideDate = new Date(ride.dateTime);
  const formattedDate = rideDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = rideDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const advanceAmount = Math.round(ride.pricePerSeat * ADVANCE_PERCENT);
  const remainingDue = ride.pricePerSeat - advanceAmount;
  const isDriver = isAuthenticated && user?._id === ride.driverId?._id;
  const isDriverVerified = ride.driverId?.isVerified === true;
  const isBookable = ride.status === 'upcoming' && ride.seatsAvailable > 0 && !isDriver;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'in progress':
        return <span className="badge badge-in-progress">In Progress</span>;
      case 'completed':
        return <span className="badge badge-completed">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-cancelled">Cancelled</span>;
      case 'upcoming':
      default:
        return <span className="badge badge-upcoming">Upcoming</span>;
    }
  };

  return (
    <div
      style={{
        maxWidth: '840px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={15} />
        <span>Back</span>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Left Card: Route & Driver */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.625rem',
            }}
          >
            <div>{renderStatusBadge(ride.status)}</div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {ride.seatsAvailable} seat{ride.seatsAvailable === 1 ? '' : 's'} left
            </span>
          </div>

          {/* Route */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Origin</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ride.origin}</div>
              </div>
            </div>

            <div
              style={{
                marginLeft: '4px',
                borderLeft: '1px dashed var(--border-strong)',
                height: '16px',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ride.destination}
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              background: 'var(--bg-surface-subtle)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Calendar size={16} style={{ color: 'var(--primary)' }} />
              <span>{formattedDate}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Clock size={16} style={{ color: 'var(--primary)' }} />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Driver Card */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              className="user-avatar-sm"
              style={{ width: '36px', height: '36px', fontSize: '0.9375rem' }}
            >
              {ride.driverId?.name ? ride.driverId.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {ride.driverId?.name || 'Driver'}
              </div>
              {isDriverVerified ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--status-completed-text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <ShieldCheck size={12} strokeWidth={2} /> Verified Driver
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unverified</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Fare & Booking Action */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            alignSelf: 'start',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              Fare Breakdown
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
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
                <span>Price per Seat</span>
                <span style={{ fontWeight: 600 }}>₹{ride.pricePerSeat}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                <span>20% Advance Token (Online)</span>
                <span>₹{advanceAmount}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <span>Remaining 80% (Pay Driver at Pickup)</span>
                <span>₹{remainingDue}</span>
              </div>
            </div>
          </div>

          <div>
            {isDriver ? (
              <div className="alert-banner alert-banner-info">
                <span>You are the driver for this ride. Manage it from My Rides.</span>
              </div>
            ) : hasActiveBooking ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div
                  className="alert-banner alert-banner-info"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <span>You already booked this ride.</span>
                  <Link
                    to="/my-bookings"
                    style={{
                      fontWeight: 600,
                      color: 'var(--primary)',
                      textDecoration: 'underline',
                    }}
                  >
                    View Booking
                  </Link>
                </div>
                <button type="button" className="btn btn-secondary btn-block" disabled>
                  Booked
                </button>
              </div>
            ) : isBookable ? (
              <button
                type="button"
                onClick={() => setIsBookingOpen(true)}
                className="btn btn-cta btn-block"
              >
                Book Seat (₹{advanceAmount} Advance)
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-block" disabled>
                {ride.status !== 'upcoming' ? `Ride is ${ride.status}` : 'No Seats Left'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Map if in progress */}
      {ride.status === 'in progress' && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Live Vehicle Location
          </h3>
          <LiveTrackingMap
            rideId={ride._id}
            origin={ride.origin}
            destination={ride.destination}
            initialLocation={ride.currentLocation}
          />
        </div>
      )}

      {/* Booking Modal */}
      {isBookingOpen && (
        <BookingModal
          ride={ride}
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
            fetchRide();
          }}
          onBookingSuccess={() => {
            fetchRide();
          }}
        />
      )}
    </div>
  );
};

export default RideDetailsPage;
