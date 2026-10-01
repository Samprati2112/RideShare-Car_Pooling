import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { rideService } from '../services/rideService';

/**
 * Reusable LocationInput with debounced autocomplete
 *
 * INTERVIEW DESIGN DECISIONS:
 * 1. Dual Data Sources:
 *    - 'rides': Queries existing rides database via `/api/rides/locations?q=` (300ms debounce) for searching.
 *    - 'nominatim': Queries OpenStreetMap Nominatim with `countrycodes=in` (400ms debounce, rate-limited) for ride publishing.
 * 2. Hybrid Input: Allows selecting from suggestions or typing arbitrary custom text.
 * 3. Keyboard & Blur Safety: Dropdown closes on outside click and cleans up active timers.
 */
const LocationInput = ({
  value,
  onChange,
  placeholder = 'Enter location...',
  source = 'rides', // 'rides' | 'nominatim'
  iconColor = 'var(--primary)',
  label,
  required = false,
  id,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastRequestTimeRef = useRef(0);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchSuggestions = async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      if (source === 'nominatim') {
        // Enforce max 1 request per second for Nominatim OSM policy
        const now = Date.now();
        const elapsed = now - lastRequestTimeRef.current;
        if (elapsed < 1000) {
          await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
        }
        lastRequestTimeRef.current = Date.now();

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&countrycodes=in&limit=6&addressdetails=1`;

        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'RideShareIndiaCarpoolApp/1.0',
          },
        });

        if (res.ok) {
          const data = await res.json();
          const list = data.map((item) => item.display_name);
          setSuggestions(list);
          setIsOpen(list.length > 0);
        }
      } else {
        // Query RideShare backend for existing active trip locations
        const res = await rideService.getLocations(query.trim());
        if (res.success && res.locations) {
          setSuggestions(res.locations);
          setIsOpen(res.locations.length > 0);
        }
      }
    } catch (err) {
      console.warn('[Location Autocomplete Warning]:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const delay = source === 'nominatim' ? 400 : 300;
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, delay);
  };

  const handleSelectSuggestion = (selectedText) => {
    onChange(selectedText);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label htmlFor={id} className="form-label" style={{ fontSize: '0.85rem' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <MapPin
          size={18}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: iconColor,
            pointerEvents: 'none',
          }}
        />

        <input
          id={id}
          type="text"
          className="form-input"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{ paddingLeft: '2.4rem', paddingRight: isLoading ? '2.4rem' : '1rem' }}
        />

        {isLoading && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Loader2 size={16} className="spin" />
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginTop: '4px',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item, index) => (
            <div
              key={index}
              onClick={() => handleSelectSuggestion(item)}
              style={{
                padding: '0.65rem 0.85rem',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom:
                  index < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Navigation size={13} style={{ color: iconColor, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationInput;
