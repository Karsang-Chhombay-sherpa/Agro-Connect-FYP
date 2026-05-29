import React, { useState } from 'react';
import axios from 'axios';
import styles from './SignUp.module.css';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../assets/Logo.png';

export default function OtpVerify({ email }) {
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage('OTP must be 6 digits');
      setStatus('fail');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    setStatus('');
    
    try {
      const response = await axios.post('/api/auth/verify-otp', { email, otp });
      if (response.data) {
        setStatus('success');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      setStatus('fail');
      setErrorMessage(err?.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
    setOtp(value);
    setStatus('');
    setErrorMessage('');
  };

  return (
    <div className={styles.signupPage}>
      <div className={styles.container}>
        <div className={styles.brandLogo}>
          <img src={logoImg} alt="AgroConnect" />
          <span className={styles.brandName}>AgroConnect</span>
        </div>
        <div className={styles.formContainer}>
          <div className={styles.formContent}>
            <button
              onClick={() => navigate("/")}
              style={{
                marginBottom: 24,
                background: "none",
                border: "none",
                color: "#22c55e",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                textDecoration: "underline",
                alignSelf: "flex-start",
              }}
            >
              &larr; Back
            </button>
            <form className={styles.form} onSubmit={handleSubmit}>
              <h3 className={styles.title}>Email Verification</h3>
              <span className={styles.subtitle}>Enter the OTP sent to <b>{email}</b></span>
              <div className={styles.inputGroup}>
                <label className={styles.label}>OTP</label>
                <input
                  className={styles.input}
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="Enter 6-digit OTP"
                  required
                  autoFocus
                  maxLength={6}
                  style={{ 
                    textAlign: 'center', 
                    letterSpacing: '8px',
                    fontSize: '20px',
                    fontWeight: '600'
                  }}
                />
                {otp.length > 0 && otp.length < 6 && (
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                    Enter {6 - otp.length} more digit{6 - otp.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              {status === 'success' && (
                <div style={{ 
                  color: '#22c55e', 
                  textAlign: 'center', 
                  marginTop: 16,
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #22c55e'
                }}>
                  ✓ Registration successful! Redirecting to login…
                </div>
              )}
              {status === 'fail' && errorMessage && (
                <div style={{ 
                  color: '#ef4444', 
                  textAlign: 'center', 
                  marginTop: 16,
                  padding: '12px',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #ef4444'
                }}>
                  ✗ {errorMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

