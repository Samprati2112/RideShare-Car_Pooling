import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowLeftRight, RotateCcw, Car } from 'lucide-react';
import { rideService } from '../services/rideService';
import RideCard from '../components/RideCard';
import BookingModal from '../components/BookingModal';
import LocationInput from '../components/LocationInput';
import Alert from '../components/Alert';

const SearchRidesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);

  const fetchRides = async (filters = {}) => {
    const dest = filters.destination ? filters.destination.trim() : '';
    if (!dest && !filters.featured) {
      setRides([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await rideService.searchRides(filters);
      if (res.success) {
        setRides(res.rides || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search rides.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const dest = searchParams.get('destination') || '';
    const orig = searchParams.get('origin') || '';
    const dt = searchParams.get('date') || '';

    setDestination(dest);
    setOrigin(orig);
    setDate(dt);

    if (dest.trim()) {
      fetchRides({ destination: dest, origin: orig, date: dt });
    } else {
      fetchRides({ featured: 'true' });
    }
  }, [searchParams]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please specify a destination.');
      return;
    }

    const params = {};
    if (destination.trim()) params.destination = destination.trim();
    if (origin.trim()) params.origin = origin.trim();
    if (date) params.date = date;
    setSearchParams(params);
  };

  const handleSwapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleClearFilters = () => {
    setDestination('');
    setOrigin('');
    setDate('');
    setError(null);
    setSearchParams({});
    fetchRides({ featured: 'true' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search Bar Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}
        >
          Find Rides
        </h1>

        <form onSubmit={handleFilterSubmit}>
          <div
            className="search-grid-layout"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr 180px auto',
              gap: '0.75rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label htmlFor="origin" className="form-label" style={{ fontSize: '0.8125rem' }}>
                Origin
              </label>
              <LocationInput
                id="origin"
                value={origin}
                onChange={setOrigin}
                placeholder="From..."
                source="rides"
              />
            </div>

            <div className="swap-btn-container" style={{ paddingBottom: '2px' }}>
              <button
                type="button"
                onClick={handleSwapLocations}
                className="btn btn-secondary btn-sm"
                style={{ width: '40px', height: '44px', padding: 0 }}
                title="Swap origin and destination"
                aria-label="Swap locations"
              >
                <ArrowLeftRight size={16} />
              </button>
            </div>

            <div>
              <label htmlFor="destination" className="form-label" style={{ fontSize: '0.8125rem' }}>
                Destination
              </label>
              <LocationInput
                id="destination"
                value={destination}
                onChange={setDestination}
                placeholder="To..."
                source="rides"
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8125rem' }}>
                Travel Date
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ minHeight: '44px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-cta" style={{ minHeight: '44px' }}>
                <Search size={16} />
                <span>Search</span>
              </button>
              {(destination || origin || date) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-secondary"
                  title="Clear filters"
                  style={{ minHeight: '44px', padding: '0 0.75rem' }}
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Results Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {loading
            ? 'Searching available rides...'
            : destination
              ? `Matching rides to ${destination} (${rides.length})`
              : `All upcoming rides (${rides.length})`}
        </h2>
      </div>

      {/* Results Grid */}
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
      ) : rides.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Car size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.375rem',
            }}
          >
            No matching rides found
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              maxWidth: '420px',
              margin: '0 auto 1.25rem',
            }}
          >
            No upcoming rides match your exact route. Try swapping origin and destination, or
            clearing the date filter.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {origin && destination && (
              <button
                type="button"
                onClick={() => {
                  handleSwapLocations();
                  fetchRides({ destination: origin, origin: destination, date });
                }}
                className="btn btn-secondary btn-sm"
              >
                <ArrowLeftRight size={14} />
                <span>Swap Origin & Destination</span>
              </button>
            )}
            <button type="button" onClick={handleClearFilters} className="btn btn-primary btn-sm">
              Browse All Rides
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {rides.map((ride) => (
            <RideCard
              key={ride._id}
              ride={ride}
              onBookClick={(r) => setSelectedRideForBooking(r)}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedRideForBooking && (
        <BookingModal
          ride={selectedRideForBooking}
          isOpen={Boolean(selectedRideForBooking)}
          onClose={() => {
            setSelectedRideForBooking(null);
            fetchRides({ destination, origin, date });
          }}
          onBookingSuccess={() => {
            fetchRides({ destination, origin, date });
          }}
        />
      )}
    </div>
  );
};

export default SearchRidesPage;
