import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './PaymentResult.module.css';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const paymentId = searchParams.get('paymentId');
  const error = searchParams.get('error');
  const debug = searchParams.get('debug');
  const message = searchParams.get('message');

  useEffect(() => {
    if (paymentId && paymentId !== 'unknown') {
      fetchPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await axios.get(`/api/payments/status/${paymentId}`);
      if (response.data.success) {
        setPaymentDetails(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = () => {
    if (message) {
      return decodeURIComponent(message);
    }
    
    switch (error) {
      case 'payment_cancelled':
        return 'Payment was cancelled by user';
      case 'verification_failed':
        return 'Payment verification failed';
      case 'missing_parameters':
        return 'eSewa did not send required payment parameters. This might be a configuration issue.';
      case 'server_error':
        return 'Server error occurred during payment processing';
      default:
        return 'Payment could not be processed';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.failureIcon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#ef4444"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className={styles.title}>Payment Failed</h1>
        <p className={styles.subtitle}>
          {getErrorMessage()}
        </p>

        {error === 'missing_parameters' && (
          <div className={styles.debugInfo}>
            <h3>Debug Information:</h3>
            <p><strong>Issue:</strong> eSewa callback missing required parameters</p>
            <p><strong>Possible causes:</strong></p>
            <ul>
              <li>eSewa test environment issues</li>
              <li>Network connectivity problems</li>
              <li>Callback URL configuration</li>
            </ul>
            {debug && (
              <details style={{ marginTop: '10px' }}>
                <summary>Technical Details (Click to expand)</summary>
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px', overflow: 'auto' }}>
                  {debug}
                </pre>
              </details>
            )}
          </div>
        )}

        {paymentDetails && (
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span>Order ID:</span>
              <span>{paymentDetails.orderId}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Payment ID:</span>
              <span>{paymentDetails.paymentId}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Amount:</span>
              <span>₹{paymentDetails.amount}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Status:</span>
              <span className={styles.failedStatus}>Failed</span>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Link to="/marketplace" className={styles.primaryBtn}>
            Back to Shopping
          </Link>
          <Link to="/dashboard" className={styles.secondaryBtn}>
            Go to Dashboard
          </Link>
        </div>

        <div className={styles.note}>
          <p>
            <strong>Need help?</strong><br/>
            If you continue to experience issues, please contact our support team.
            No amount has been charged to your account.
          </p>
          
          {error === 'missing_parameters' && (
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              <strong>Quick fix:</strong> Try using the "Test Mode" option in the payment form, 
              or ensure your frontend server is running on port 5174.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}