import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Car,
  PlusCircle,
  Search,
  Calendar,
  ShieldCheck,
  AlertCircle,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isVerified, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand-logo" onClick={closeMenu}>
          <div className="brand-icon-box">
            <Car size={20} strokeWidth={2} />
          </div>
          <span>RideShare</span>
        </Link>

        {/* Mobile menu button */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Navigation links */}
        <nav className={`nav-links ${mobileMenuOpen ? 'nav-open' : ''}`}>
          <NavLink
            to="/search"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <Search size={16} strokeWidth={1.75} />
            <span>Find Rides</span>
          </NavLink>

          <NavLink
            to="/create-ride"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <PlusCircle size={16} strokeWidth={1.75} />
            <span>List a Ride</span>
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/my-rides"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Car size={16} strokeWidth={1.75} />
                <span>My Rides</span>
              </NavLink>

              <NavLink
                to="/my-bookings"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Calendar size={16} strokeWidth={1.75} />
                <span>My Bookings</span>
              </NavLink>

              {isVerified ? (
                <span className="badge badge-completed" title="Email verified account">
                  <ShieldCheck size={13} strokeWidth={2} />
                  <span>Verified</span>
                </span>
              ) : (
                <Link
                  to="/verify-otp"
                  className="badge badge-pending"
                  onClick={closeMenu}
                  title="Verify your email address"
                >
                  <AlertCircle size={13} strokeWidth={2} />
                  <span>Verify Email</span>
                </Link>
              )}

              <div className="user-badge">
                <div className="user-avatar-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user?.name?.split(' ')[0] || 'Account'}</span>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Log out"
                style={{ minHeight: '36px' }}
              >
                <LogOut size={15} strokeWidth={1.75} />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm" onClick={closeMenu}>
                <LogIn size={15} strokeWidth={1.75} />
                <span>Log In</span>
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>
                <UserPlus size={15} strokeWidth={1.75} />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
