import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, AlertTriangle, X, Loader2 } from 'lucide-react';
import { rideService } from '../services/rideService';
import { formatTimeRemaining } from '../utils/formatters';

const DriverTrackingController = ({ ride, onStatusChange, onCancelRide }) => {
  const [status, setStatus] = useState(ride.status || 'upcoming');
  const [isBroadcasting, setIsBroadcasting] = useState(ride.status === 'in progress');
  const [permissionError, setPermissionError] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);

  // Start window check: now >= departure - 30 minutes
  const scheduledTime = new Date(ride.dateTime).getTime();
  const earliestAllowedTime = scheduledTime - 30 * 60 * 1000;
  const isStartWindowOpen = Date.now() >= earliestAllowedTime;
  const minutesToStartWindow = Math.max(
    0,
    Math.ceil((earliestAllowedTime - Date.now()) / (60 * 1000))
  );

  const sendLocationUpdate = async (lat, lng) => {
    try {
      const res = await rideService.updateRideLocation(ride._id, { lat, lng });
      if (res.success) {
        setPermissionError(null);
      }
    } catch (err) {
      console.warn('[Location Broadcast Error]', err.message);
    }
  };

  const startRealGeolocation = () => {
    if (!('geolocation' in navigator)) {
      setPermissionError('Geolocation is not supported by your browser.');
      setIsBroadcasting(false);
      return;
    }

    setPermissionError(null);
    setIsBroadcasting(true);

    const options = {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocationUpdate(pos.coords.latitude, pos.coords.longitude);
      },
      (_err) => {
        setPermissionError(
          'Location permission denied. Enable location access to share live updates with passengers.'
        );
      },
      options
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocationUpdate(pos.coords.latitude, pos.coords.longitude);
      },
      (_err) => {
        setPermissionError(
          'Location permission denied. Enable location access to share live updates with passengers.'
        );
      },
      options
    );
  };

  const stopGeolocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsBroadcasting(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGeolocation();
    };
  }, []);

  const handleStartRide = async () => {
    if (!isStartWindowOpen) return;

    setLoadingAction(true);
    setPermissionError(null);
    try {
      const res = await rideService.startRide(ride._id);
      if (res.success) {
        setStatus('in progress');
        if (onStatusChange) onStatusChange('in progress');
        startRealGeolocation();
      }
    } catch (err) {
      setPermissionError(err.response?.data?.message || err.message || 'Could not start ride.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEndRide = async () => {
    setLoadingAction(true);
    try {
      const res = await rideService.endRide(ride._id);
      if (res.success) {
        stopGeolocation();
        setStatus('completed');
        if (onStatusChange) onStatusChange('completed');
      }
    } catch (err) {
      setPermissionError(err.response?.data?.message || err.message || 'Could not complete ride.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmCancelRide = async () => {
    setLoadingAction(true);
    try {
      const res = await rideService.cancelRide(ride._id);
      if (res.success) {
        stopGeolocation();
        setStatus('cancelled');
        setShowCancelModal(false);
        if (onCancelRide) onCancelRide();
      }
    } catch (err) {
      setPermissionError(err.response?.data?.message || err.message || 'Could not cancel ride.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Permission or Error Banner with Retry */}
      {permissionError && (
        <div
          className="alert-banner alert-banner-warning"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{permissionError}</span>
          </div>
          <button
            type="button"
            onClick={startRealGeolocation}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: '32px', padding: '0.25rem 0.5rem' }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Controller Action Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {status === 'upcoming' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleStartRide}
              disabled={!isStartWindowOpen || loadingAction}
              title={
                !isStartWindowOpen
                  ? `Start Ride opens 30 minutes before departure (${formatTimeRemaining(minutesToStartWindow)})`
                  : ''
              }
            >
              {loadingAction ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
              <span>Start Ride</span>
            </button>
          )}

          {status === 'in progress' && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleEndRide}
              disabled={loadingAction}
            >
              {loadingAction ? <Loader2 size={15} className="spin" /> : <Square size={15} />}
              <span>End Ride</span>
            </button>
          )}

          {status === 'upcoming' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCancelModal(true)}
              disabled={loadingAction}
            >
              Cancel Ride
            </button>
          )}
        </div>

        {/* Live status label */}
        {status === 'in progress' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.8125rem',
              color: isBroadcasting ? 'var(--status-inprogress-text)' : 'var(--text-muted)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isBroadcasting ? 'var(--status-inprogress-text)' : 'var(--text-muted)',
              }}
            />
            <span>{isBroadcasting ? 'Sharing location' : 'Location paused'}</span>
          </div>
        )}

        {status === 'upcoming' && !isStartWindowOpen && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Start Ride opens 30m before departure ({formatTimeRemaining(minutesToStartWindow)})
          </span>
        )}
      </div>

      {/* Cancel Ride Modal */}
      {showCancelModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCancelModal(false)}
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
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cancel this ride?</h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCancelModal(false)}
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
              All passenger bookings on this ride will be cancelled and their advance payments
              refunded.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => setShowCancelModal(false)}
                disabled={loadingAction}
              >
                Keep Ride
              </button>
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={handleConfirmCancelRide}
                disabled={loadingAction}
              >
                {loadingAction ? 'Cancelling...' : 'Yes, Cancel Ride'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTrackingController;
