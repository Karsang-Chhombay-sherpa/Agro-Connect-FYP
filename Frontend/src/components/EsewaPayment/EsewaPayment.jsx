import React, { useEffect, useRef, useState } from 'react';
import styles from './EsewaPayment.module.css';

export default function EsewaPayment({ paymentData, onCancel }) {
  const formRef = useRef(null);
  const [showTestMode, setShowTestMode] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    // Auto-submit the form when component mounts to redirect to eSewa
    if (formRef.current && paymentData && !attemptedSubmit) {
      console.log('=== eSewa Payment Form Auto-Submit ===');
      console.log('Payment Data:', paymentData);
      console.log('eSewa Params:', paymentData.esewaParams);
      console.log('Payment URL:', paymentData.paymentUrl);
      console.log('Success URL:', paymentData.esewaParams?.success_url);
      console.log('Failure URL:', paymentData.esewaParams?.failure_url);
      
      // Validate URLs before submitting
      const successUrl = paymentData.esewaParams?.success_url;
      const failureUrl = paymentData.esewaParams?.failure_url;
      
      if (!successUrl || !failureUrl) {
        console.error('❌ Missing callback URLs!');
        setShowTestMode(true);
        return;
      }
      
      if (!successUrl.includes('/api/payments/success')) {
        console.warn('⚠️ Success URL does not point to backend API:', successUrl);
      }
      
      if (!failureUrl.includes('/api/payments/failure')) {
        console.warn('⚠️ Failure URL does not point to backend API:', failureUrl);
      }
      
      // Auto-submit to eSewa after a short delay
      const timer = setTimeout(() => {
        try {
          console.log('✅ Submitting form to eSewa...');
          setAttemptedSubmit(true);
          formRef.current.submit();
        } catch (error) {
          console.error('❌ Error submitting to eSewa:', error);
          setShowTestMode(true);
        }
      }, 1500); // 1.5 second delay to show loading screen

      return () => clearTimeout(timer);
    }
  }, [paymentData, attemptedSubmit]);

  if (!paymentData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Payment Error</h3>
          <p>Invalid payment data. Please try again.</p>
          <button onClick={onCancel} className={styles.cancelBtn}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { esewaParams, paymentUrl } = paymentData;

  if (showTestMode) {
    return (
      <div className={styles.container}>
        <div className={styles.testMode}>
          <h3>🧪 eSewa V2 Payment Form (Test Mode)</h3>
          <p>This is the exact eSewa V2 form format. You can test it or submit to eSewa:</p>
          
          {/* Show the actual eSewa form with visible inputs for testing */}
          <div className={styles.esewaForm}>
            <h4>eSewa Payment Form:</h4>
            <form
              action={paymentUrl}
              method="POST"
              className={styles.visibleForm}
            >
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Amount:</label>
                  <input type="text" name="amount" value={esewaParams.amount} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Tax Amount:</label>
                  <input type="text" name="tax_amount" value={esewaParams.tax_amount} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Total Amount:</label>
                  <input type="text" name="total_amount" value={esewaParams.total_amount} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Transaction UUID:</label>
                  <input type="text" name="transaction_uuid" value={esewaParams.transaction_uuid} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Product Code:</label>
                  <input type="text" name="product_code" value={esewaParams.product_code} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Service Charge:</label>
                  <input type="text" name="product_service_charge" value={esewaParams.product_service_charge} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Delivery Charge:</label>
                  <input type="text" name="product_delivery_charge" value={esewaParams.product_delivery_charge} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Success URL:</label>
                  <input 
                    type="text" 
                    name="success_url" 
                    value={esewaParams.success_url} 
                    readOnly 
                    style={{ 
                      color: esewaParams.success_url.includes('/api/payments/success') ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Failure URL:</label>
                  <input 
                    type="text" 
                    name="failure_url" 
                    value={esewaParams.failure_url} 
                    readOnly 
                    style={{ 
                      color: esewaParams.failure_url.includes('/api/payments/failure') ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Signed Fields:</label>
                  <input type="text" name="signed_field_names" value={esewaParams.signed_field_names} readOnly />
                </div>
                <div className={styles.inputGroup}>
                  <label>Signature:</label>
                  <input type="text" name="signature" value={esewaParams.signature} readOnly />
                </div>
              </div>
              
              <div className={styles.formActions}>
                <input type="submit" value="Submit to eSewa" className={styles.submitBtn} />
              </div>
            </form>
            
            {/* URL Verification */}
            <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px' }}>
              <h5>🔍 URL Verification:</h5>
              <p>
                <strong>Success URL:</strong> 
                <span style={{ 
                  color: esewaParams.success_url.includes('/api/payments/success') ? 'green' : 'red',
                  marginLeft: '10px'
                }}>
                  {esewaParams.success_url.includes('/api/payments/success') ? '✅ Correct (Backend)' : '❌ Wrong (Should be Backend)'}
                </span>
              </p>
              <p>
                <strong>Failure URL:</strong> 
                <span style={{ 
                  color: esewaParams.failure_url.includes('/api/payments/failure') ? 'green' : 'red',
                  marginLeft: '10px'
                }}>
                  {esewaParams.failure_url.includes('/api/payments/failure') ? '✅ Correct (Backend)' : '❌ Wrong (Should be Backend)'}
                </span>
              </p>
            </div>
          </div>

          <div className={styles.testActions}>
            <button 
              onClick={() => {
                // Simulate successful payment
                console.log('=== SIMULATE SUCCESS CLICKED ===');
                console.log('Button: Simulate Success');
                const paymentId = esewaParams.transaction_uuid;
                const amount = esewaParams.total_amount;
                const successUrl = esewaParams.success_url;
                
                console.log('Payment Details:', {
                  paymentId,
                  amount,
                  successUrl
                });
                
                // Clear cart before redirecting (for test mode)
                localStorage.removeItem('cart');
                console.log('Cart cleared before simulated payment redirect');
                
                // Create V2 format response data
                const testResponseData = {
                  transaction_code: `TEST${Date.now()}`,
                  status: 'COMPLETE',
                  total_amount: amount,
                  transaction_uuid: paymentId,
                  product_code: esewaParams.product_code,
                  signed_field_names: 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names'
                };
                
                console.log('Test Response Data:', testResponseData);
                
                // Encode as base64 (eSewa V2 format)
                const encodedData = btoa(JSON.stringify(testResponseData));
                
                console.log('Encoded Data:', encodedData);
                
                // Redirect to success URL with V2 format
                const redirectUrl = `${successUrl}?data=${encodedData}`;
                console.log('✅ Redirecting to SUCCESS URL:', redirectUrl);
                console.log('This should go to:', successUrl);
                console.log('NOT to failure URL:', esewaParams.failure_url);
                
                window.location.href = redirectUrl;
              }}
              className={styles.successBtn}
            >
              ✅ Simulate Success
            </button>
            <button 
              onClick={() => {
                // Simulate failed payment
                console.log('=== SIMULATE FAILURE CLICKED ===');
                console.log('Button: Simulate Failure');
                const paymentId = esewaParams.transaction_uuid;
                const failureUrl = esewaParams.failure_url;
                console.log('❌ Redirecting to FAILURE URL:', `${failureUrl}?pid=${paymentId}&error=payment_failed`);
                window.location.href = `${failureUrl}?pid=${paymentId}&error=payment_failed`;
              }}
              className={styles.failureBtn}
            >
              ❌ Simulate Failure
            </button>
            <button onClick={onCancel} className={styles.cancelBtn}>
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.loadingCard}>
        <div className={styles.esewaLogo}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="20" fill="#60A917"/>
            <text x="50" y="35" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">eSewa</text>
            <text x="50" y="55" textAnchor="middle" fill="white" fontSize="10">Secure Payment</text>
            <circle cx="50" cy="75" r="8" fill="white" opacity="0.8"/>
          </svg>
        </div>
        <div className={styles.spinner}></div>
        <h3>Redirecting to eSewa...</h3>
        <p>Please wait while we securely redirect you to eSewa for payment processing.</p>
        
        <div className={styles.paymentInfo}>
          <div className={styles.infoRow}>
            <span>Amount:</span>
            <span>₹{esewaParams.amount || esewaParams.amt}</span>
          </div>
          <div className={styles.infoRow}>
            <span>Payment ID:</span>
            <span>{esewaParams.transaction_uuid || esewaParams.pid}</span>
          </div>
        </div>

        <div className={styles.redirectInfo}>
          <p>🔒 Your payment is secured by eSewa's encryption</p>
          <p>⏱️ Redirecting in a moment...</p>
        </div>

        <div className={styles.actions}>
          <button 
            onClick={() => setShowTestMode(true)} 
            className={styles.testBtn}
          >
            🧪 Switch to Test Mode
          </button>
          <button onClick={onCancel} className={styles.cancelBtn}>
            Cancel Payment
          </button>
        </div>
      </div>

      {/* Hidden form that auto-submits to eSewa V2 API */}
      <form
        ref={formRef}
        action={paymentUrl}
        method="POST"
        style={{ display: 'none' }}
      >
        {/* V2 API Parameters */}
        {esewaParams.amount && (
          <>
            <input type="hidden" name="amount" value={esewaParams.amount} />
            <input type="hidden" name="tax_amount" value={esewaParams.tax_amount} />
            <input type="hidden" name="total_amount" value={esewaParams.total_amount} />
            <input type="hidden" name="transaction_uuid" value={esewaParams.transaction_uuid} />
            <input type="hidden" name="product_code" value={esewaParams.product_code} />
            <input type="hidden" name="product_service_charge" value={esewaParams.product_service_charge} />
            <input type="hidden" name="product_delivery_charge" value={esewaParams.product_delivery_charge} />
            <input type="hidden" name="success_url" value={esewaParams.success_url} />
            <input type="hidden" name="failure_url" value={esewaParams.failure_url} />
            <input type="hidden" name="signed_field_names" value={esewaParams.signed_field_names} />
            <input type="hidden" name="signature" value={esewaParams.signature} />
          </>
        )}
        
        {/* V1 API Parameters (fallback) */}
        {esewaParams.amt && (
          <>
            <input type="hidden" name="amt" value={esewaParams.amt} />
            <input type="hidden" name="pdc" value={esewaParams.pdc} />
            <input type="hidden" name="psc" value={esewaParams.psc} />
            <input type="hidden" name="txAmt" value={esewaParams.txAmt} />
            <input type="hidden" name="tAmt" value={esewaParams.tAmt} />
            <input type="hidden" name="pid" value={esewaParams.pid} />
            <input type="hidden" name="scd" value={esewaParams.scd} />
            <input type="hidden" name="su" value={esewaParams.su} />
            <input type="hidden" name="fu" value={esewaParams.fu} />
          </>
        )}
      </form>
    </div>
  );
}