import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Navigation, MessageSquare, Edit2, Check, X } from 'lucide-react';
import { bookingService } from '../services/bookingService';
import LiveTrackingMap from '../components/LiveTrackingMap';
import ChatDrawer from '../components/ChatDrawer';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { formatLocationLabel } from '../utils/formatters';

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingPickupId, setEditingPickupId] = useState(null);
  const [pickupInputText, setPickupInputText] = useState('');
  const [savingPickup, setSavingPickup] = useState(false);

  const [activeTrackingRideId, setActiveTrackingRideId] = useState(null);
  const [activeChatBooking, setActiveChatBooking] = useState(null);

  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchMyBookings = async () => {
    try {
      const res = await bookingService.getMyBookings();
      if (res.success) {
        setBookings(res.bookings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleStartEditPickup = (booking) => {
    setEditingPickupId(booking._id);
    setPickupInputText(booking.pickupLocation || '');
  };

  const handleSavePickup = async (bookingId) => {
    if (!pickupInputText.trim()) return;
    setSavingPickup(true);
    try {
      const res = await bookingService.updatePickupLocation(bookingId, pickupInputText.trim());
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId ? { ...b, pickupLocation: res.booking.pickupLocation } : b
          )
        );
        setEditingPickupId(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update pickup point.');
    } finally {
      setSavingPickup(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    try {
      const res = await bookingService.cancelBooking(cancellingBooking._id);
      if (res.success) {
        setCancellingBooking(null);
        fetchMyBookings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge badge-completed">Confirmed</span>;
      case 'in progress':
        return <span className="badge badge-in-progress">In progress</span>;
      case 'completed':
        return <span className="badge badge-completed">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-cancelled">Cancelled</span>;
      case 'pending_payment':
        return <span className="badge badge-pending">Pending Payment</span>;
      case 'failed':
        return <span className="badge badge-cancelled">Payment Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) return <LoadingSpinner text="Loading your bookings..." size="md" />;

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
            My Bookings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Track active rides live, update pickup points, and chat with your driver.
          </p>
        </div>

        <Link to="/search" className="btn btn-primary btn-sm">
          Find More Rides
        </Link>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Calendar size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
            }}
          >
            No bookings found
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            You have not booked any carpool rides yet.
          </p>
          <Link to="/search" className="btn btn-primary btn-sm">
            Search Rides
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map((booking) => {
            const ride = booking.rideId;
            const departureDate = ride ? new Date(ride.dateTime) : null;
            const rideStatus = booking.rideStatus || ride?.status;
            let effectiveStatus = booking.status;
            if (booking.status === 'confirmed') {
              if (rideStatus === 'completed') effectiveStatus = 'completed';
              else if (rideStatus === 'in progress') effectiveStatus = 'in progress';
              else if (rideStatus === 'cancelled') effectiveStatus = 'cancelled';
            }
            const isBookingCancelled = booking.status === 'cancelled';
            const isCompletedOrCancelled =
              rideStatus === 'completed' || rideStatus === 'cancelled' || isBookingCancelled;
            const canCancel = booking.status === 'confirmed' && rideStatus === 'upcoming';

            return (
              <div
                key={booking._id}
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
                    {renderStatusBadge(effectiveStatus)}
                    {ride ? (
                      <span
                        style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}
                        title={`${ride.origin} → ${ride.destination}`}
                      >
                        {formatLocationLabel(ride.origin)} → {formatLocationLabel(ride.destination)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Ride Details Unavailable</span>
                    )}
                  </div>

                  {departureDate && (
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
                    </div>
                  )}
                </div>

                {/* Ride and Driver Info */}
                {ride && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '0.75rem',
                      background: 'var(--bg-surface-subtle)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Driver</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ride.driverId?.name || 'Driver'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Seats Booked
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {booking.seatsBooked}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Advance Paid
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: (isBookingCancelled || rideStatus === 'cancelled')
                            ? 'var(--text-muted)'
                            : 'var(--status-completed-text)',
                        }}
                      >
                        ₹{booking.advanceAmountPaid}{' '}
                        {(isBookingCancelled || rideStatus === 'cancelled') && '(Refunded)'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Transaction ID
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {booking.transactionId || 'pay_rzp_in_demo'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pickup Location Editor */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Navigation size={15} style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Pickup Landmark:</span>
                    {editingPickupId === booking._id ? (
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={pickupInputText}
                          onChange={(e) => setPickupInputText(e.target.value)}
                          placeholder="e.g. Near Metro Gate 2"
                          style={{
                            minHeight: '32px',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.8125rem',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePickup(booking._id)}
                          className="btn btn-primary btn-sm"
                          disabled={savingPickup}
                          style={{ minHeight: '32px', padding: '0.25rem 0.5rem' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPickupId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '32px', padding: '0.25rem 0.5rem' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {booking.pickupLocation || 'Not specified'}
                      </span>
                    )}
                  </div>

                  {!editingPickupId && !isCompletedOrCancelled && (
                    <button
                      type="button"
                      onClick={() => handleStartEditPickup(booking)}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      <Edit2 size={12} />
                      <span>Edit Landmark</span>
                    </button>
                  )}
                </div>

                {/* Actions: Live Tracking & Chat & Cancel */}
                {!isBookingCancelled && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!isCompletedOrCancelled && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTrackingRideId(
                              activeTrackingRideId === ride?._id ? null : ride?._id
                            )
                          }
                          className="btn btn-secondary btn-sm"
                        >
                          <Navigation size={14} />
                          <span>
                            {activeTrackingRideId === ride?._id ? 'Hide Live Map' : 'Track Vehicle'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setActiveChatBooking({
                            id: booking._id,
                            name: ride?.driverId?.name || 'Driver',
                          })
                        }
                        className="btn btn-secondary btn-sm"
                      >
                        <MessageSquare size={14} />
                        <span>Driver Chat</span>
                      </button>
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancellingBooking(booking)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--status-cancelled-text)' }}
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                )}

                {/* Live Tracking Map View */}
                {activeTrackingRideId === ride?._id && !isCompletedOrCancelled && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <LiveTrackingMap
                      rideId={ride._id}
                      origin={ride.origin}
                      destination={ride.destination}
                      initialLocation={ride.currentLocation}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Booking Modal */}
      {cancellingBooking && (
        <div
          className="modal-overlay"
          onClick={() => setCancellingBooking(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cancel this booking?</h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCancellingBooking(null)}
                style={{ padding: '0.25rem 0.5rem', minHeight: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
              }}
            >
              {cancellingBooking.seatsBooked} seat{cancellingBooking.seatsBooked === 1 ? '' : 's'}{' '}
              will be released back to the driver, and your advance payment of ₹
              {cancellingBooking.advanceAmountPaid} will be refunded.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => setCancellingBooking(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
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

export default MyBookingsPage;
