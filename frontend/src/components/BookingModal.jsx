import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import { ADVANCE_PERCENT } from '../constants';
import { X, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import Alert from './Alert';

const BookingModal = ({ ride, isOpen, onClose, onBookingSuccess }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef(null);

  const [seatsBooked, setSeatsBooked] = useState(1);
  const [pickupLocation, setPickupLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI_GPAY');
  const [forceFail, setForceFail] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !ride) return null;

  const totalFare = ride.pricePerSeat * seatsBooked;
  const advanceAmount = Math.round(totalFare * ADVANCE_PERCENT);
  const remainingDue = totalFare - advanceAmount;

  const handleSeatChange = (delta) => {
    const next = seatsBooked + delta;
    if (next >= 1 && next <= ride.seatsAvailable) {
      setSeatsBooked(next);
    }
  };

  const handleConfirmAndPay = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (!user?.isVerified) {
      navigate('/verify-otp', { state: { email: user?.email, from: window.location.pathname } });
      return;
    }

    setErrorMessage(null);
    setPaymentFailed(false);
    setIsProcessing(true);

    try {
      // Step 1: Create Order
      const orderRes = await paymentService.createOrder({
        rideId: ride._id,
        seatsBooked,
        pickupLocation: pickupLocation.trim() || 'To be coordinated with driver on chat',
      });

      if (!orderRes.success || !orderRes.bookingId) {
        throw new Error(orderRes.message || 'Failed to initialize booking order.');
      }

      // Step 2: Verify Payment
      const verifyRes = await paymentService.verifyPayment({
        bookingId: orderRes.bookingId,
        orderId: orderRes.orderId,
        paymentMethod,
        forceFail,
      });

      if (verifyRes.success) {
        setSuccessData(verifyRes);
        setPaymentSuccess(true);
        if (onBookingSuccess) {
          onBookingSuccess(verifyRes.booking);
        }
      } else {
        throw new Error(verifyRes.message || 'Payment simulation was declined.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Payment could not be processed.';
      setErrorMessage(msg);
      setPaymentFailed(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetModal = () => {
    setPaymentSuccess(false);
    setPaymentFailed(false);
    setErrorMessage(null);
    setForceFail(false);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content" ref={modalRef}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <h2
            id="modal-title"
            style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}
          >
            {paymentSuccess ? 'Booking Confirmed' : paymentFailed ? 'Payment Failed' : 'Book Seats'}
          </h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.5rem', minHeight: '32px' }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Live status announcements */}
        <div
          aria-live="polite"
          className="sr-only"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
        >
          {isProcessing && 'Processing payment advance...'}
          {paymentSuccess && 'Booking confirmed successfully.'}
          {paymentFailed && `Payment failed: ${errorMessage}`}
        </div>

        {/* Success Screen */}
        {paymentSuccess ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              textAlign: 'center',
              padding: '1rem 0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--status-completed-bg)',
                color: 'var(--status-completed-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckCircle2 size={32} strokeWidth={2} />
            </div>

            <div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Advance Payment Received
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                ₹{advanceAmount} advance received. Pay the remaining ₹{remainingDue} directly to the
                driver.
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-subtle)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Route</span>
                <span style={{ fontWeight: 600 }}>
                  {ride.origin} → {ride.destination}
                </span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Seats Booked</span>
                <span style={{ fontWeight: 600 }}>{seatsBooked}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  {successData?.transactionId || 'pay_rzp_in_demo'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  onClose();
                  navigate('/my-bookings');
                }}
              >
                View My Bookings
              </button>
            </div>
          </div>
        ) : paymentFailed ? (
          /* Failure Screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                background: 'var(--status-cancelled-bg)',
                border: '1px solid var(--status-cancelled-border)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <AlertCircle
                size={20}
                style={{ color: 'var(--status-cancelled-text)', flexShrink: 0, marginTop: '2px' }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--status-cancelled-text)',
                    fontSize: '0.9375rem',
                  }}
                >
                  {errorMessage && errorMessage.toLowerCase().includes('already')
                    ? 'Booking Notice'
                    : 'Payment Unsuccessful'}
                </div>
                <div
                  style={{
                    color: 'var(--status-cancelled-text)',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                  }}
                >
                  {errorMessage || 'Payment could not be completed. Your card/UPI was not charged.'}
                </div>
              </div>
            </div>

            {errorMessage && errorMessage.toLowerCase().includes('already') ? (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    onClose();
                    navigate('/my-bookings');
                  }}
                >
                  View My Bookings
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Seats were not booked. You can retry with another payment method.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={handleResetModal}
                  >
                    <RefreshCw size={16} />
                    <span>Retry</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Booking & Payment Form */
          <form
            onSubmit={handleConfirmAndPay}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
          >
            {errorMessage && <Alert type="error" message={errorMessage} />}

            {/* Ride Summary Box */}
            <div
              style={{
                background: 'var(--bg-surface-subtle)',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                {ride.origin} → {ride.destination}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: '1rem',
                }}
              >
                <span>Driver: {ride.driverId?.name || 'Driver'}</span>
                <span>•</span>
                <span>₹{ride.pricePerSeat} / seat</span>
              </div>
            </div>

            {/* Seat Selector */}
            <div className="form-group">
              <label className="form-label">Number of Seats</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSeatChange(-1)}
                  disabled={seatsBooked <= 1 || isProcessing}
                  style={{ width: '40px', height: '40px' }}
                >
                  -
                </button>
                <span
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    minWidth: '32px',
                    textAlign: 'center',
                  }}
                >
                  {seatsBooked}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSeatChange(1)}
                  disabled={seatsBooked >= ride.seatsAvailable || isProcessing}
                  style={{ width: '40px', height: '40px' }}
                >
                  +
                </button>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  ({ride.seatsAvailable} available)
                </span>
              </div>
            </div>

            {/* Pickup Landmark */}
            <div className="form-group">
              <label htmlFor="pickupLocation" className="form-label">
                Pickup Landmark (Optional)
              </label>
              <input
                type="text"
                id="pickupLocation"
                className="form-input"
                placeholder="e.g. Near Metro Gate 2"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={isProcessing}
              >
                <option value="UPI_GPAY">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="NETBANKING">Net Banking</option>
              </select>
            </div>

            {/* Fare Breakdown */}
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '0.875rem',
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
                <span>
                  Total Fare ({seatsBooked} seat{seatsBooked === 1 ? '' : 's'})
                </span>
                <span>₹{totalFare}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}
              >
                <span>20% Advance Payable Now</span>
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
                <span>Remaining due to driver at pickup</span>
                <span>₹{remainingDue}</span>
              </div>
            </div>

            {/* Test toggle for simulation */}
            {import.meta.env.VITE_DEV_TOOLS === 'true' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={forceFail}
                  onChange={(e) => setForceFail(e.target.checked)}
                  disabled={isProcessing}
                />
                <span>Simulate bank failure for testing</span>
              </label>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-cta btn-block"
                disabled={isProcessing || ride.seatsAvailable < 1}
              >
                {isProcessing ? (
                  <>
                    <Loader2
                      size={16}
                      className="spin"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    <span>Processing ₹{advanceAmount}...</span>
                  </>
                ) : (
                  <span>Pay Advance (₹{advanceAmount})</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
