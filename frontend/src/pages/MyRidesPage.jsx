import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, PlusCircle, MessageSquare } from 'lucide-react';
import { rideService } from '../services/rideService';
import DriverTrackingController from '../components/DriverTrackingController';
import ChatDrawer from '../components/ChatDrawer';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { formatLocationLabel } from '../utils/formatters';

const MyRidesPage = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChatBooking, setActiveChatBooking] = useState(null);

  const fetchMyRides = async () => {
    try {
      const res = await rideService.getMyListedRides();
      if (res.success) {
        setRides(res.rides || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch your listed rides.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRides();
  }, []);

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

  if (loading) return <LoadingSpinner text="Loading your rides..." size="md" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            My Offered Rides
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage your rides, view passengers, and broadcast live GPS updates.
          </p>
        </div>

        <Link to="/create-ride" className="btn btn-primary btn-sm">
          <PlusCircle size={15} />
          <span>Offer New Ride</span>
        </Link>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {rides.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Car size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
            }}
          >
            No rides listed yet
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            Offer empty seats in your vehicle to share daily commute costs.
          </p>
          <Link to="/create-ride" className="btn btn-primary btn-sm">
            Offer a Ride
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rides.map((ride) => {
            const departureDate = new Date(ride.dateTime);
            const isRideCancelled = ride.status === 'cancelled';
            const confirmedBookings = (ride.bookings || []).filter((b) => b.status === 'confirmed');
            const relevantBookings = (ride.bookings || []).filter((b) =>
              isRideCancelled ? b.status === 'cancelled' || b.status === 'confirmed' : b.status === 'confirmed'
            );
            const totalPassengers = confirmedBookings.reduce((sum, b) => sum + b.seatsBooked, 0);
            const totalSeats = ride.totalSeats || (ride.seatsAvailable + totalPassengers);
            const totalAdvanceCollected = isRideCancelled
              ? 0
              : confirmedBookings.reduce((sum, b) => sum + b.advanceAmountPaid, 0);

            return (
              <div
                key={ride._id}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '0.625rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {renderStatusBadge(ride.status)}
                    <span
                      style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}
                      title={`${ride.origin} → ${ride.destination}`}
                    >
                      {formatLocationLabel(ride.origin)} → {formatLocationLabel(ride.destination)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>
                      {departureDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {departureDate.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Link
                      to={`/rides/${ride._id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Public View
                    </Link>
                  </div>
                </div>

                {/* Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    background: 'var(--bg-surface-subtle)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {!isRideCancelled && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Seats Left
                      </div>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {ride.seatsAvailable} of {totalSeats}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Price per Seat
                    </div>
                    <div
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      ₹{ride.pricePerSeat}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Advance Collected
                    </div>
                    <div
                      style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)' }}
                    >
                      ₹{totalAdvanceCollected}
                    </div>
                  </div>
                </div>

                {/* GPS Tracking and Lifecycle Controller */}
                <DriverTrackingController
                  ride={ride}
                  onStatusChange={() => fetchMyRides()}
                  onCancelRide={() => fetchMyRides()}
                />

                {/* Passenger Manifest */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <h3
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Booked Passengers ({relevantBookings.length})
                  </h3>

                  {relevantBookings.length === 0 ? (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      No passengers have booked this ride yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {relevantBookings.map((booking) => {
                        const isBookingCancelled = isRideCancelled || booking.status === 'cancelled';
                        return (
                          <div
                            key={booking._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              background: 'var(--bg-surface-subtle)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {booking.passengerId?.name || 'Passenger'} ({booking.seatsBooked} seat
                                {booking.seatsBooked === 1 ? '' : 's'})
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                Pickup: {booking.pickupLocation || 'Not specified'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isBookingCancelled ? (
                                <span
                                  style={{ fontWeight: 600, color: 'var(--status-cancelled-text)' }}
                                >
                                  Cancelled · ₹{booking.advanceAmountPaid} refunded
                                </span>
                              ) : (
                                <span
                                  style={{ fontWeight: 600, color: 'var(--status-completed-text)' }}
                                >
                                  ₹{booking.advanceAmountPaid} paid
                                </span>
                              )}
                              {!isBookingCancelled && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveChatBooking({
                                      id: booking._id,
                                      name: booking.passengerId?.name || 'Passenger',
                                    })
                                  }
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', minHeight: '32px' }}
                                >
                                  <MessageSquare size={14} />
                                  <span>Chat</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-app messaging drawer */}
      {activeChatBooking && (
        <ChatDrawer
          bookingId={activeChatBooking.id}
          otherPartyName={activeChatBooking.name}
          isOpen={Boolean(activeChatBooking)}
          onClose={() => setActiveChatBooking(null)}
        />
      )}
    </div>
  );
};

export default MyRidesPage;
