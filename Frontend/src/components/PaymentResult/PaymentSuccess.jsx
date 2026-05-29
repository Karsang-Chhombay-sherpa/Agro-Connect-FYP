import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PaymentResult.module.css';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    verifyAndProcess();
  }, []);

  const verifyAndProcess = async () => {
    try {
      // eSewa V2 sends base64-encoded data in 'data' param
      const encodedData = searchParams.get('data');

      // Also check for legacy params (from simulate success or old flow)
      const paymentId = searchParams.get('paymentId');
      const transactionId = searchParams.get('transactionId');
      const amount = searchParams.get('amount');
      const type = searchParams.get('type');

      console.log('PaymentSuccess loaded, URL params:', {
        hasData: !!encodedData,
        paymentId,
        transactionId,
        amount,
        type
      });

      // If we have encoded eSewa V2 data, decode and process it
      if (encodedData) {
        try {
          const decodedData = JSON.parse(atob(encodedData));
          console.log('Decoded eSewa data:', decodedData);

          const { transaction_uuid, transaction_code, total_amount, status: esewaStatus } = decodedData;

          if (esewaStatus !== 'COMPLETE') {
            console.error('Payment status not COMPLETE:', esewaStatus);
            setStatus('failed');
            setTimeout(() => navigate(`/payment/failure?error=payment_cancelled&paymentId=${transaction_uuid}`, { replace: true }), 1500);
            return;
          }

          // Call the existing backend success endpoint with the decoded data
          const response = await axios.get(`/api/payments/success`, {
            params: { data: encodedData }
          });

          // Backend redirects, so if we get here it worked
          handleSuccess(type);
          return;

        } catch (decodeErr) {
          console.error('Error decoding eSewa data:', decodeErr);
        }
      }

      // If we have paymentId (from backend redirect or simulate success), payment already processed
      if (paymentId && paymentId !== 'error' && paymentId !== 'unknown') {
        console.log('Payment already processed by backend, paymentId:', paymentId);
        handleSuccess(type);
        return;
      }

      // No valid payment data
      console.error('No valid payment data found');
      setStatus('failed');
      setTimeout(() => navigate('/payment/failure?error=missing_parameters', { replace: true }), 1500);

    } catch (error) {
      console.error('Error in payment success handler:', error);
      // If backend already processed and redirected here, just show success
      const paymentId = searchParams.get('paymentId');
      if (paymentId && paymentId !== 'error') {
        handleSuccess(searchParams.get('type'));
      } else {
        setStatus('failed');
        setTimeout(() => navigate('/payment/failure?error=server_error', { replace: true }), 1500);
      }
    }
  };

  const handleSuccess = (type) => {
    setStatus('success');
    localStorage.removeItem('cart');
    window.dispatchEvent(new CustomEvent('cartCleared'));
    window.dispatchEvent(new CustomEvent('paymentCompleted'));
    localStorage.setItem('walletUpdate', Date.now().toString());

    const redirectPath = type === 'subscription'
      ? '/user-profile?subscription=success'
      : '/marketplace';

    setTimeout(() => navigate(redirectPath, { replace: true }), 1500);
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
