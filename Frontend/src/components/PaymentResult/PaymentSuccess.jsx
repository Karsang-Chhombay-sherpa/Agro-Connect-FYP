import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './PaymentResult.module.css';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    processPaymentResult();
  }, []);

  // Restore user session if it was lost during the eSewa redirect chain
  const restoreSession = () => {
    const user = localStorage.getItem('user');
    if (!user) {
      const backup = sessionStorage.getItem('user_backup');
      if (backup) {
        localStorage.setItem('user', backup);
        console.log('✅ Session restored from backup');
        return true;
      }
      return false;
    }
    return true;
  };

  const processPaymentResult = () => {
    try {
      // Always try to restore session first
      restoreSession();

      const paymentId   = searchParams.get('paymentId');
      const type        = searchParams.get('type');
      const error       = searchParams.get('error');
      const encodedData = searchParams.get('data');

      console.log('PaymentSuccess — URL params:', { paymentId, type, error, hasData: !!encodedData });

      // Case 1: backend processed & redirected with paymentId
      if (paymentId && paymentId !== 'error' && paymentId !== 'unknown' && !error) {
        console.log('✅ Backend confirmed payment:', paymentId);
        handleSuccess(type);
        return;
      }

      // Case 2: eSewa redirected directly to frontend
      if (encodedData) {
        try {
          const decoded = JSON.parse(atob(encodedData));
          console.log('Decoded eSewa data:', decoded);
          if (decoded.status === 'COMPLETE') {
            handleSuccess(type);
            return;
          } else {
            redirectToFailure('payment_cancelled', decoded.transaction_uuid);
            return;
          }
        } catch (decodeErr) {
          console.error('Failed to decode eSewa data:', decodeErr);
          redirectToFailure('decode_error');
          return;
        }
      }

      // Case 3: error param
      if (error) {
        redirectToFailure(error, paymentId);
        return;
      }

      // Case 4: no params
      redirectToFailure('missing_parameters');

    } catch (err) {
      console.error('Unexpected error in PaymentSuccess:', err);
      redirectToFailure('client_error');
    }
  };

  const handleSuccess = (type) => {
    setStatus('success');

    // Clear cart
    localStorage.removeItem('cart');
    // Clean up backup
    sessionStorage.removeItem('user_backup');
    sessionStorage.removeItem('payment_return_path');

    window.dispatchEvent(new CustomEvent('cartCleared'));
    window.dispatchEvent(new CustomEvent('paymentCompleted'));
    localStorage.setItem('walletUpdate', Date.now().toString());

    // Determine redirect path
    let redirectPath = sessionStorage.getItem('payment_return_path') || '/marketplace';
    if (type === 'subscription') redirectPath = '/user-profile?subscription=success';

    // Final check — if still no session, go to login with redirect
    const userData = localStorage.getItem('user');
    if (!userData) {
      setTimeout(() => navigate(
        `/login?redirect=${encodeURIComponent(redirectPath)}`,
        { replace: true }
      ), 1500);
      return;
    }

    setTimeout(() => navigate(redirectPath, { replace: true }), 1500);
  };

  const redirectToFailure = (error, paymentId) => {
    setStatus('failed');
    sessionStorage.removeItem('user_backup');
    sessionStorage.removeItem('payment_return_path');
    const pid = paymentId ? `&paymentId=${encodeURIComponent(paymentId)}` : '';
    setTimeout(() => navigate(`/payment/failure?error=${error}${pid}`, { replace: true }), 1500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'verifying' && (
          <>
            <div className={styles.spinner}></div>
            <p>Processing your payment...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className={styles.successIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Payment successful! Redirecting...</p>
          </>
        )}
        {status === 'failed' && (
          <p>Payment verification failed. Redirecting...</p>
        )}
      </div>
    </div>
  );
}
