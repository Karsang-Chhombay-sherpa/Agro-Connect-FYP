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

  const processPaymentResult = () => {
    try {
      const paymentId   = searchParams.get('paymentId');
      const type        = searchParams.get('type');
      const error       = searchParams.get('error');
      const encodedData = searchParams.get('data'); // raw eSewa V2 redirect (edge case)

      console.log('PaymentSuccess — URL params:', { paymentId, type, error, hasData: !!encodedData });

      // ── Case 1: backend already processed & redirected here with paymentId ──
      if (paymentId && paymentId !== 'error' && paymentId !== 'unknown' && !error) {
        console.log('✅ Backend confirmed payment:', paymentId);
        handleSuccess(type);
        return;
      }

      // ── Case 2: eSewa redirected directly to frontend (misconfigured callback) ──
      // Decode the data param client-side and check status — no backend call needed
      if (encodedData) {
        try {
          const decoded = JSON.parse(atob(encodedData));
          console.log('Decoded eSewa data (direct redirect):', decoded);

          if (decoded.status === 'COMPLETE') {
            // Payment is complete — backend will have already processed it via
            // the server-side callback. Just show success.
            handleSuccess(type);
            return;
          } else {
            console.error('eSewa status not COMPLETE:', decoded.status);
            redirectToFailure('payment_cancelled', decoded.transaction_uuid);
            return;
          }
        } catch (decodeErr) {
          console.error('Failed to decode eSewa data:', decodeErr);
          redirectToFailure('decode_error');
          return;
        }
      }

      // ── Case 3: error param present ──
      if (error) {
        console.error('Payment error param:', error);
        redirectToFailure(error, paymentId);
        return;
      }

      // ── Case 4: no recognisable params ──
      console.error('No valid payment params found');
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
    window.dispatchEvent(new CustomEvent('cartCleared'));
    window.dispatchEvent(new CustomEvent('paymentCompleted'));
    localStorage.setItem('walletUpdate', Date.now().toString());

    // Check if user is still in localStorage — if not, they got logged out
    // during the eSewa redirect chain. Re-read from storage before navigating.
    const userData = localStorage.getItem('user');
    if (!userData) {
      // User session lost during payment redirect — send to login with return path
      const returnPath = type === 'subscription'
        ? '/user-profile?subscription=success'
        : '/marketplace';
      setTimeout(() => navigate(`/login?redirect=${encodeURIComponent(returnPath)}`, { replace: true }), 1500);
      return;
    }

    const redirectPath = type === 'subscription'
      ? '/user-profile?subscription=success'
      : '/marketplace';

    setTimeout(() => navigate(redirectPath, { replace: true }), 1500);
  };

  const redirectToFailure = (error, paymentId) => {
    setStatus('failed');
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
