import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ShieldCheck } from 'lucide-react';
import { ADVANCE_PERCENT } from '../constants';
import { formatLocationLabel } from '../utils/formatters';

const RideCard = ({ ride, onBookClick, showBookButton = true }) => {
  const rideDate = new Date(ride.dateTime);

  const formattedDate = rideDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const formattedTime = rideDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const advanceAmount = Math.round(ride.pricePerSeat * ADVANCE_PERCENT);
  const isAvailable = ride.seatsAvailable > 0 && ride.status === 'upcoming';
  const isDriverVerified = ride.driverId?.isVerified === true;

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
      className="card card-hover"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* Header: Date & Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.625rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={15} strokeWidth={1.75} />
            {formattedDate}
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={15} strokeWidth={1.75} />
            {formattedTime}
          </span>
        </div>
        <div>{renderStatusBadge(ride.status)}</div>
      </div>

      {/* Route: Origin to Destination */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--primary)',
              flexShrink: 0,
            }}
          />
          <span
            style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}
            title={ride.origin}
          >
            {formatLocationLabel(ride.origin)}
          </span>
        </div>
        <div
          style={{
            marginLeft: '3px',
            borderLeft: '1px dashed var(--border-strong)',
            height: '12px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
              flexShrink: 0,
            }}
          />
          <span
            style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}
            title={ride.destination}
          >
            {formatLocationLabel(ride.destination)}
          </span>
        </div>
      </div>

      {/* Driver & Fare Details */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface-subtle)',
          padding: '0.625rem 0.875rem',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="user-avatar-sm">
            {ride.driverId?.name ? ride.driverId.name.charAt(0).toUpperCase() : 'D'}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {ride.driverId?.name || 'Driver'}
            </div>
            {isDriverVerified && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--status-completed-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <ShieldCheck size={12} strokeWidth={2} /> Verified
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>
            ₹{ride.pricePerSeat}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {' '}
              / seat
            </span>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color:
                ride.seatsAvailable > 0
                  ? 'var(--status-inprogress-text)'
                  : 'var(--status-cancelled-text)',
            }}
          >
            {ride.seatsAvailable > 0
              ? `${ride.seatsAvailable} seat${ride.seatsAvailable === 1 ? '' : 's'} left`
              : 'Full'}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showBookButton && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.25rem',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Advance: ₹{advanceAmount} (20%)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to={`/rides/${ride._id}`} className="btn btn-secondary btn-sm">
              Details
            </Link>
            {isAvailable ? (
              <button
                type="button"
                onClick={() => onBookClick && onBookClick(ride)}
                className="btn btn-cta btn-sm"
              >
                Book
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" disabled>
                {ride.status !== 'upcoming' ? 'Unavailable' : 'Full'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RideCard;
