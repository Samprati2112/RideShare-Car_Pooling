import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, RefreshCw } from 'lucide-react';
import Alert from '../components/Alert';

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, verifyOtp, sendOtp } = useAuth();

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState(() => user?.email || location.state?.email || '');
  const [devOtpCode, setDevOtpCode] = useState(() => location.state?.devOtp || null);
  const [cooldown, setCooldown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const targetFrom = location.state?.from || '/';

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (user?.isVerified) {
      setSuccessMsg('Account is already verified.');
      const timeout = setTimeout(() => {
        navigate(targetFrom, { replace: true });
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [user, navigate, targetFrom]);

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError(null);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyOtp(otp, email);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Email verified successfully.');
      setTimeout(() => {
        navigate(targetFrom, { replace: true });
      }, 1000);
    } else {
      setError(res.message);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;

    setError(null);
    setIsResending(true);
    const res = await sendOtp(email);
    setIsResending(false);

    if (res.success) {
      setSuccessMsg('A new verification code has been sent.');
      if (res.devOtp) {
        setDevOtpCode(res.devOtp);
      }
      setCooldown(60);
      setOtp('');
    } else {
      setError(res.message);
      if (res.retryAfter) {
        setCooldown(res.retryAfter);
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: '420px',
        margin: '2rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div className="card">
        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            marginBottom: '0.25rem',
            color: 'var(--text-primary)',
          }}
        >
          Verify Email
        </h1>
        <p
          style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}
        >
          Enter the 6-digit verification code sent to <strong>{email || 'your email'}</strong>
        </p>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMsg && <Alert type="success" message={successMsg} />}

        {import.meta.env.VITE_DEV_TOOLS === 'true' && devOtpCode && (
          <div
            className="alert-banner alert-banner-info"
            style={{
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              Dev Code: <strong>{devOtpCode}</strong>
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ minHeight: '28px', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => setOtp(devOtpCode)}
            >
              Fill Code
            </button>
          </div>
        )}

        <form
          onSubmit={handleVerifySubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="otp" className="form-label">6-Digit Verification Code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-input"
              placeholder="123456"
              value={otp}
              onChange={handleOtpChange}
              maxLength={6}
              style={{
                textAlign: 'center',
                letterSpacing: '0.35em',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={otp.length !== 6 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Didn't receive code?</span>
          <button
            type="button"
            onClick={handleResendOtp}
            className="btn btn-secondary btn-sm"
            disabled={cooldown > 0 || isResending}
            style={{ minHeight: '32px' }}
          >
            {isResending ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            <span>{cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
