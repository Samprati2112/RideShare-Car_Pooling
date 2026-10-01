import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import { rideService } from '../services/rideService';
import { useRelativeTime } from '../hooks/useRelativeTime';
import { POLL_INTERVALS } from '../constants';

const driverIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

const LiveTrackingMap = ({ rideId, origin, destination, initialLocation }) => {
  const [currentLoc, setCurrentLoc] = useState(initialLocation || null);
  const [rideStatus, setRideStatus] = useState('in progress');
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);

  const secondsAgo = useRelativeTime(lastUpdatedTime);

  useEffect(() => {
    if (!rideId) return;

    let isMounted = true;

    const fetchLocation = async () => {
      try {
        const res = await rideService.getRideLocation(rideId);
        if (res.success && isMounted) {
          setRideStatus(res.status);
          if (res.currentLocation?.lat && res.currentLocation?.lng) {
            setCurrentLoc({
              lat: res.currentLocation.lat,
              lng: res.currentLocation.lng,
              updatedAt: res.currentLocation.updatedAt,
            });
            setLastUpdatedTime(Date.now());
          }
        }
      } catch (err) {
        console.warn('[Live Tracking Poll Warning]', err.message);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, POLL_INTERVALS.GPS || 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [rideId]);

  const hasCoords = currentLoc?.lat && currentLoc?.lng;
  const centerPos = hasCoords ? [currentLoc.lat, currentLoc.lng] : [12.9716, 77.5946];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Live Status Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8125rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                rideStatus === 'in progress'
                  ? 'var(--status-inprogress-text)'
                  : 'var(--text-muted)',
            }}
          />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {rideStatus === 'in progress' ? 'Live Vehicle Tracking' : `Ride ${rideStatus}`}
          </span>
        </div>

        <div>
          {hasCoords && lastUpdatedTime ? (
            <span style={{ color: 'var(--text-muted)' }}>
              Last updated {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Waiting for coordinates</span>
          )}
        </div>
      </div>

      {/* Leaflet Map Container */}
      <div
        style={{
          height: '320px',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        <MapContainer
          center={centerPos}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={centerPos} />

          {hasCoords && (
            <Marker position={[currentLoc.lat, currentLoc.lng]} icon={driverIcon}>
              <Popup>
                <div style={{ fontSize: '0.8125rem' }}>
                  <strong>Driver Vehicle</strong>
                  <br />
                  {origin} → {destination}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
