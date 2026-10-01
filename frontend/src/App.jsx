import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import SearchRidesPage from './pages/SearchRidesPage';
import RideDetailsPage from './pages/RideDetailsPage';
import CreateRidePage from './pages/CreateRidePage';
import MyRidesPage from './pages/MyRidesPage';
import MyBookingsPage from './pages/MyBookingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <div className="container" style={{ paddingTop: '2rem' }}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchRidesPage />} />
                <Route path="/rides/:id" element={<RideDetailsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOtpPage />} />

                {/* Protected Driver & Passenger Routes */}
                <Route
                  path="/create-ride"
                  element={
                    <ProtectedRoute>
                      <CreateRidePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-rides"
                  element={
                    <ProtectedRoute>
                      <MyRidesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute>
                      <MyBookingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback Catch-all Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
