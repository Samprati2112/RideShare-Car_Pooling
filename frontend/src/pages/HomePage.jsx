import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowLeftRight, Car } from 'lucide-react';
import { rideService } from '../services/rideService';
import RideCard from '../components/RideCard';
import BookingModal from '../components/BookingModal';
import LocationInput from '../components/LocationInput';

const HomePage = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [date, setDate] = useState('');
  const [featuredRides, setFeaturedRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);

  useEffect(() => {
    const fetchRecentRides = async () => {
      try {
        const res = await rideService.searchRides({ featured: 'true' });
        if (res.success) {
          setFeaturedRides((res.rides || []).slice(0, 6));
        }
      } catch (err) {
        console.warn('[Fetch Featured Rides Error]', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentRides();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.append('destination', destination.trim());
    if (origin.trim()) params.append('origin', origin.trim());
    if (date) params.append('date', date);
    navigate(`/search?${params.toString()}`);
  };

  const handleSwapLocations = () => {
    const tempOrigin = origin;
    setOrigin(destination);
    setDestination(tempOrigin);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Search Section */}
      <section
        style={{
          background: 'var(--primary-dark)',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            Daily Commutes & Intercity Carpooling
          </h1>
          <p
            style={{
              color: 'var(--primary-light)',
              fontSize: '0.9375rem',
              marginBottom: '1.75rem',
            }}
          >
            Share empty seats with verified coworkers and commuters. Pay 20% advance token to book.
          </p>

          {/* Search Card */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              color: 'var(--text-primary)',
              textAlign: 'left',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              className="search-grid-layout"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr 180px auto',
                gap: '0.75rem',
                alignItems: 'flex-end',
              }}
            >
              {/* Origin */}
              <div>
                <label htmlFor="home-origin" className="form-label" style={{ fontSize: '0.8125rem' }}>
                  From
                </label>
                <LocationInput
                  id="home-origin"
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Leaving from..."
                  source="rides"
                />
              </div>

              {/* Swap Button */}
              <div className="swap-btn-container" style={{ paddingBottom: '2px' }}>
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '40px', height: '44px', padding: 0 }}
                  title="Swap Origin and Destination"
                  aria-label="Swap locations"
                >
                  <ArrowLeftRight size={16} />
                </button>
              </div>

              {/* Destination */}
              <div>
                <label htmlFor="home-destination" className="form-label" style={{ fontSize: '0.8125rem' }}>
                  To
                </label>
                <LocationInput
                  id="home-destination"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Going to..."
                  source="rides"
                />
              </div>

              {/* Date */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                  Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ minHeight: '44px' }}
                />
              </div>

              {/* Submit CTA */}
              <div>
                <button
                  type="submit"
                  className="btn btn-cta btn-block"
                  style={{ minHeight: '44px', whiteSpace: 'nowrap' }}
                >
                  <Search size={16} />
                  <span>Find Rides</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Available Upcoming Rides */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Upcoming Rides
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Recently published carpools with open seats
            </p>
          </div>
          <Link to="/search" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>

        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="card skeleton" style={{ height: '220px' }} />
            ))}
          </div>
        ) : featuredRides.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <Car size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              No upcoming rides available
            </h3>
            <p
              style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}
            >
              Be the first to list a carpool and share your travel costs.
            </p>
            <Link to="/create-ride" className="btn btn-primary btn-sm">
              List a Ride
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {featuredRides.map((ride) => (
              <RideCard
                key={ride._id}
                ride={ride}
                onBookClick={(r) => setSelectedRideForBooking(r)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Booking Payment Modal */}
      {selectedRideForBooking && (
        <BookingModal
          ride={selectedRideForBooking}
          isOpen={Boolean(selectedRideForBooking)}
          onClose={() => setSelectedRideForBooking(null)}
          onBookingSuccess={() => {
            // Refreshes background data without immediately unmounting confirmation modal
          }}
        />
      )}
    </div>
  );
};

export default HomePage;
