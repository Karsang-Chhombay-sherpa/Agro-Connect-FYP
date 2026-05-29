import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EsewaPayment from '../EsewaPayment/EsewaPayment';
import styles from './Checkout.module.css';
import { toast } from 'react-toastify';

export default function Checkout({ isOpen, onClose, cart, subtotal, onOrderComplete }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryTime, setDeliveryTime] = useState('morning');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [primaryMobile, setPrimaryMobile] = useState('');
  const [secondaryMobile, setSecondaryMobile] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showEsewaPayment, setShowEsewaPayment] = useState(false);
  const [esewaPaymentData, setEsewaPaymentData] = useState(null);
  const [subscriptionDiscount, setSubscriptionDiscount] = useState(null);
  const [loadingDiscount, setLoadingDiscount] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Load saved addresses from localStorage
  useEffect(() => {
    const addresses = JSON.parse(localStorage.getItem('userAddresses') || '[]');
    setSavedAddresses(addresses);
    // Auto-fill default address if delivery address is empty
    if (!deliveryAddress) {
      const defaultAddr = addresses.find(a => a.isDefault);
      if (defaultAddr) setDeliveryAddress(defaultAddr.address);
    }
  }, [isOpen]);
  React.useEffect(() => {
    const checkSubscriptionDiscount = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          setLoadingDiscount(false);
          return;
        }

        const user = JSON.parse(userData);
        const response = await axios.get(`/api/subscriptions/user?userId=${user._id}&status=active`);
        
        if (response.data && response.data.length > 0) {
          const activeSubscription = response.data[0];
          
          // Determine discount based on plan type
          let discountPercentage = 0;
          if (activeSubscription.planId === 'basic') {
            discountPercentage = 5;
          } else if (activeSubscription.planId === 'family') {
            discountPercentage = 10;
          }
          
          if (discountPercentage > 0) {
            // Extract farmer IDs from subscription
            const farmerIds = activeSubscription.selectedFarmers.map(farmer => 
              typeof farmer === 'string' ? farmer : farmer._id
            );
            
            setSubscriptionDiscount({
              percentage: discountPercentage,
              planName: activeSubscription.planName,
              planType: activeSubscription.planType,
              subscribedFarmers: farmerIds
            });
          }
        }
      } catch (error) {
        console.error('Error checking subscription discount:', error);
      } finally {
        setLoadingDiscount(false);
      }
    };

    if (isOpen) {
      checkSubscriptionDiscount();
    }
  }, [isOpen]);

  const deliveryFee = 100;
  
  // Calculate discount amount only for products from subscribed farmers
  const discountAmount = subscriptionDiscount 
    ? cart.reduce((total, item) => {
        const itemFarmerId = typeof item.farmerId === 'string' 
          ? item.farmerId 
          : item.farmerId?._id;
        
        if (subscriptionDiscount.subscribedFarmers.includes(itemFarmerId)) {
          const itemTotal = item.pricePerUnit * item.quantity;
          return total + (itemTotal * subscriptionDiscount.percentage) / 100;
        }
        return total;
      }, 0)
    : 0;
  
  const subtotalAfterDiscount = subtotal - discountAmount;
  const total = subtotalAfterDiscount + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      setError('Please enter your delivery address');
      return;
    }

    if (!primaryMobile.trim()) {
      setError('Please enter your primary mobile number');
      return;
    }

    // Validate primary mobile number format (Nepal format)
    const mobileRegex = /^(\+977)?[0-9]{10}$/;
    if (!mobileRegex.test(primaryMobile.replace(/\s/g, ''))) {
      setError('Please enter a valid primary mobile number (10 digits)');
      return;
    }

    // Validate secondary mobile number if provided
    if (secondaryMobile.trim() && !mobileRegex.test(secondaryMobile.replace(/\s/g, ''))) {
      setError('Please enter a valid secondary mobile number (10 digits)');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('Please login to place an order');
        setIsProcessing(false);
        return;
      }

      const user = JSON.parse(userData);

      // Validate cart items
      if (!cart || cart.length === 0) {
        setError('Your cart is empty');
        setIsProcessing(false);
        return;
      }

      // Prepare order data
      const orderData = {
        customerId: user._id,
        items: cart.map(item => ({
          productId: item._id,
          productName: item.productName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          unit: item.unit
        })),
        paymentMethod,
        deliveryTime,
        deliveryAddress: deliveryAddress.trim(),
        primaryMobile: primaryMobile.trim(),
        secondaryMobile: secondaryMobile.trim() || null,
        subscriptionDiscount: subscriptionDiscount ? {
          percentage: subscriptionDiscount.percentage,
          amount: discountAmount,
          planType: subscriptionDiscount.planType
        } : null
      };

      console.log('Creating order with data:', orderData);

      // Create order first
      const orderResponse = await axios.post('/api/orders/create', orderData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      if (!orderResponse.data.success) {
        setError(orderResponse.data.message || 'Failed to create order');
        setIsProcessing(false);
        return;
      }

      const order = orderResponse.data.order;
      console.log('Order created successfully:', order);

      // Validate order data
      if (!order || !order._id) {
        setError('Invalid order response from server');
        setIsProcessing(false);
        return;
      }

      // Handle payment based on method
      if (paymentMethod === 'esewa') {
        // Initiate eSewa payment
        console.log('Initiating eSewa payment for order ID:', order._id);
        
        const paymentResponse = await axios.post('/api/payments/initiate', {
          orderId: order._id
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        });

        if (paymentResponse.data.success) {
          console.log('eSewa payment initiated:', paymentResponse.data);
          setEsewaPaymentData(paymentResponse.data.data);
          setShowEsewaPayment(true);
          // Don't complete order yet - wait for eSewa callback
          // Cart will be cleared when user returns from successful payment
        } else {
          setError(paymentResponse.data.message || 'Failed to initiate payment');
        }
      } else {
        // Cash on delivery - complete order immediately
        onOrderComplete();
        toast.success(`Order placed successfully! Order ID: ${order.orderId}`);
      }

    } catch (error) {
      console.error('Error placing order:', error);
      
      if (error.code === 'ECONNABORTED') {
        setError('Request timeout. Please check your connection and try again.');
      } else if (error.response) {
        console.error('Server error response:', error.response.data);
        setError(error.response.data.message || `Server error: ${error.response.status}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('Cannot connect to server. Please ensure the backend is running and try again.');
      } else {
        console.error('Request setup error:', error.message);
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEsewaCancel = () => {
    setShowEsewaPayment(false);
    setEsewaPaymentData(null);
    setError('Payment cancelled. You can try again or choose a different payment method.');
  };

  if (!isOpen) return null;

  // Show eSewa payment page
  if (showEsewaPayment && esewaPaymentData) {
    return (
      <EsewaPayment 
        paymentData={esewaPaymentData} 
        onCancel={handleEsewaCancel}
      />
    );
  }

  return (
    <div className={styles.checkoutOverlay} onClick={onClose}>
      <div className={styles.checkoutModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.checkoutHeader}>
          <h2>Checkout</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        <div className={styles.checkoutContent}>
          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div className={styles.orderSummary}>
            <h3>Order Summary</h3>
            
            <div className={styles.orderItems}>
              {cart.map((item) => (
                <div key={item._id} className={styles.orderItem}>
                  <span className={styles.itemName}>
                    {item.productName} x {item.quantity}
                  </span>
                  <span className={styles.itemPrice}>
                    ₹{(item.pricePerUnit * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.orderTotals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              
              {subscriptionDiscount && discountAmount > 0 && (
                <div className={styles.totalRow} style={{ color: '#22c55e' }}>
                  <span>
                    Subscription Discount ({subscriptionDiscount.percentage}%)
                    <span style={{ fontSize: '12px', display: 'block', color: '#6b7280', marginTop: '2px' }}>
                      {subscriptionDiscount.planType} Member - On subscribed farmers' products
                    </span>
                  </span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className={styles.totalRow}>
                <span>Delivery Fee</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>
              <div className={`${styles.totalRow} ${styles.finalTotal}`}>
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              
              {subscriptionDiscount && discountAmount > 0 && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  background: '#f0fdf4', 
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '14px', fontWeight: '600' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    You saved ₹{discountAmount.toFixed(2)} with your subscription!
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className={styles.addressSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>Delivery Address</h3>
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddressPicker(!showAddressPicker)}
                  style={{ fontSize: '13px', color: '#22c55e', background: 'none', border: '1px solid #22c55e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  📍 Use Saved Address
                </button>
              )}
            </div>

            {/* Saved address dropdown */}
            {showAddressPicker && savedAddresses.length > 0 && (
              <div style={{ marginBottom: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                {savedAddresses.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDeliveryAddress(addr.address);
                      setShowAddressPicker(false);
                      setError('');
                      toast.success(`Address selected: ${addr.label}`);
                    }}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: 'left',
                      background: addr.isDefault ? '#f0fdf4' : 'white',
                      border: 'none', borderBottom: i < savedAddresses.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseOut={e => e.currentTarget.style.background = addr.isDefault ? '#f0fdf4' : 'white'}
                  >
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{addr.label}</span>
                        {addr.isDefault && <span style={{ background: '#22c55e', color: 'white', fontSize: '10px', padding: '1px 6px', borderRadius: '999px' }}>Default</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{addr.address}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <textarea
              className={styles.addressInput}
              placeholder="Enter your full delivery address..."
              value={deliveryAddress}
              onChange={(e) => { setDeliveryAddress(e.target.value); if (error) setError(''); }}
              rows={3}
            />
          </div>

          {/* Contact Numbers */}
          <div className={styles.contactSection}>
            <h3>Contact Numbers</h3>
            <div className={styles.mobileInputs}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Primary Mobile Number <span className={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  className={styles.mobileInput}
                  placeholder="e.g., 9841234567 or +9779841234567"
                  value={primaryMobile}
                  onChange={(e) => setPrimaryMobile(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Secondary Mobile Number <span className={styles.optional}>(Optional)</span>
                </label>
                <input
                  type="tel"
                  className={styles.mobileInput}
                  placeholder="e.g., 9841234567 or +9779841234567"
                  value={secondaryMobile}
                  onChange={(e) => setSecondaryMobile(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className={styles.paymentSection}>
            <h3>Payment Method</h3>
            <div className={styles.paymentOptions}>
              <div
                className={`${styles.paymentOption} ${
                  paymentMethod === 'esewa' ? styles.selected : ''
                }`}
                onClick={() => setPaymentMethod('esewa')}
              >
                <div className={styles.paymentIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 15h.01M11 15h4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className={styles.paymentInfo}>
                  <div className={styles.paymentName}>eSewa</div>
                  <div className={styles.paymentDesc}>Secure Online Payment</div>
                </div>
              </div>

              <div
                className={`${styles.paymentOption} ${
                  paymentMethod === 'cash' ? styles.selected : ''
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                <div className={styles.paymentIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 12h.01M17 12h.01" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className={styles.paymentInfo}>
                  <div className={styles.paymentName}>Cash on Delivery</div>
                  <div className={styles.paymentDesc}>Pay when delivered</div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className={styles.deliverySection}>
            <h3>Delivery Time</h3>
            <div className={styles.deliveryOptions}>
              <div
                className={`${styles.deliveryOption} ${
                  deliveryTime === 'morning' ? styles.selected : ''
                }`}
                onClick={() => setDeliveryTime('morning')}
              >
                <div className={styles.deliveryIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className={styles.deliveryInfo}>
                  <div className={styles.deliveryName}>Morning</div>
                  <div className={styles.deliveryTime}>8:00 AM - 12:00 PM</div>
                </div>
              </div>

              <div
                className={`${styles.deliveryOption} ${
                  deliveryTime === 'evening' ? styles.selected : ''
                }`}
                onClick={() => setDeliveryTime('evening')}
              >
                <div className={styles.deliveryIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className={styles.deliveryInfo}>
                  <div className={styles.deliveryName}>Evening</div>
                  <div className={styles.deliveryTime}>4:00 PM - 8:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            className={styles.placeOrderBtn}
            onClick={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className={styles.spinner}></div>
                {paymentMethod === 'esewa' ? 'Initiating Payment...' : 'Processing Order...'}
              </>
            ) : (
              `${paymentMethod === 'esewa' ? 'Pay with eSewa' : 'Place Order'} - ₹${total.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}