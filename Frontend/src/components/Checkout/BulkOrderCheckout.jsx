import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header/Header';
import styles from './BulkOrderCheckout.module.css';
import EsewaPayment from '../EsewaPayment/EsewaPayment';
import { toast } from 'react-toastify';

export default function BulkOrderCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart = [], selectedFarmer } = location.state || {};

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    city: '',
    area: '',
    ward: '',
    streetAddress: '',
    landmark: '',
    deliveryInstructions: '',
    startDate: '',
    timeSlot: 'morning',
    agreeToTerms: false
  });

  const [farmer, setFarmer] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);

  useEffect(() => {
    // Verify user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Pre-fill form with user data
    setFormData(prev => ({
      ...prev,
      fullName: `${parsedUser.firstName || ''} ${parsedUser.lastName || ''}`.trim(),
      email: parsedUser.email || '',
      phoneNumber: parsedUser.phoneNumber || ''
    }));

    // Fetch farmer details
    if (selectedFarmer) {
      fetchFarmerDetails();
    }

    // Verify cart has items
    if (!cart || cart.length === 0) {
      toast.error('Your cart is empty');
      navigate('/bulk-orders');
    }
  }, []);

  const fetchFarmerDetails = async () => {
    try {
      const response = await axios.get(`/api/auth/farmers/${selectedFarmer}`);
      if (response.data.success) {
        setFarmer(response.data.farmer);
      }
    } catch (error) {
      console.error('Error fetching farmer details:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
    const bulkDiscounts = { 25: 5, 50: 10, 100: 18 };
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    let discountPercentage = 0;
    for (const [qty, discount] of Object.entries(bulkDiscounts).sort((a, b) => b[0] - a[0])) {
      if (totalQuantity >= parseInt(qty)) {
        discountPercentage = discount;
        break;
      }
    }

    const discountAmount = subtotal * (discountPercentage / 100);
    const deliveryCharge = 120;
    const total = subtotal - discountAmount + deliveryCharge;

    return { subtotal, discountAmount, discountPercentage, deliveryCharge, total };
  };

  const handleConfirmOrder = async () => {
    // Validate form
    if (!formData.fullName || !formData.phoneNumber || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.city || !formData.area || !formData.streetAddress) {
      toast.error('Please provide complete delivery address');
      return;
    }

    if (!formData.startDate) {
      toast.error('Please select a delivery start date');
      return;
    }

    try {
      setProcessingPayment(true);

      // Create bulk order
      const { subtotal, discountAmount, discountPercentage, deliveryCharge, total } = calculateTotals();

      const bulkOrderData = {
        userId: user._id,
        farmerId: selectedFarmer,
        items: cart.map(item => ({
          productId: item._id,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.pricePerUnit * item.quantity
        })),
        deliveryInfo: {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          city: formData.city,
          area: formData.area,
          ward: formData.ward,
          streetAddress: formData.streetAddress,
          landmark: formData.landmark,
          deliveryInstructions: formData.deliveryInstructions
        },
        schedule: {
          startDate: new Date(formData.startDate).toISOString(),
          timeSlot: formData.timeSlot
        },
        pricing: {
          subtotal,
          discountPercentage,
          discountAmount,
          deliveryCharge,
          totalAmount: total
        },
        status: 'pending',
        paymentStatus: 'pending'
      };

      console.log('Creating bulk order:', bulkOrderData);

      // Create order in backend
      const orderResponse = await axios.post('/api/bulk-orders/create', bulkOrderData);

      console.log('Order response:', orderResponse.data);

      if (!orderResponse.data.success) {
        toast.error(orderResponse.data.message || 'Failed to create order');
        setProcessingPayment(false);
        return;
      }

      const orderId = orderResponse.data.data._id;
      console.log('Bulk order created:', orderId);
      setCreatedOrderId(orderId);
      setShowPaymentMethods(true);
      setProcessingPayment(false);

    } catch (error) {
      console.error('Error processing order:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Failed to process order');
      setProcessingPayment(false);
    }
  };

  const handlePaymentMethodSelect = async (method) => {
    if (method === 'esewa') {
      try {
        setProcessingPayment(true);
        const { total } = calculateTotals();

        console.log('Initiating payment for bulk order:', {
          orderId: createdOrderId,
          amount: total,
          userId: user._id
        });

        // Initiate payment
        const paymentResponse = await axios.post('/api/payments/initiate-bulk-payment', {
          orderId: createdOrderId,
          amount: total,
          userId: user._id
        });

        console.log('Payment response:', paymentResponse.data);

        if (!paymentResponse.data.success) {
          toast.error(paymentResponse.data.message || 'Failed to initiate payment');
          setProcessingPayment(false);
          return;
        }

        console.log('Payment initiated successfully, setting payment data');
        // Set both state variables together to ensure proper re-render
        setPaymentData(paymentResponse.data.data);
        setSelectedPaymentMethod('esewa');
        setShowPaymentMethods(false);
        setProcessingPayment(false);

      } catch (error) {
        console.error('Error initiating payment:', error);
        console.error('Error response:', error.response?.data);
        toast.error(error.response?.data?.message || error.message || 'Failed to initiate payment');
        setProcessingPayment(false);
      }
    }
  };

  const { subtotal, discountAmount, discountPercentage, deliveryCharge, total } = calculateTotals();

  if (!user || !cart || cart.length === 0) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Show payment component if payment is initiated
  if (selectedPaymentMethod === 'esewa' && paymentData) {
    return (
      <>
        <Header />
        <EsewaPayment 
          paymentData={paymentData}
          onCancel={() => {
            setSelectedPaymentMethod(null);
            setPaymentData(null);
            setProcessingPayment(false);
            setShowPaymentMethods(false);
          }}
        />
      </>
    );
  }

  // Show payment methods modal (like subscription)
  if (showPaymentMethods) {
    const { total } = calculateTotals();
    
    return (
      <>
        <Header />
        <div className={styles.container}>
          {/* Payment Modal Overlay */}
          <div className={styles.paymentModalOverlay} onClick={() => setShowPaymentMethods(false)}>
            <div className={styles.paymentModalContent} onClick={(e) => e.stopPropagation()}>
              <button 
                className={styles.paymentModalClose} 
                onClick={() => setShowPaymentMethods(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              <div className={styles.paymentModalHeader}>
                <div className={styles.paymentIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                    <path d="M2 10h20" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
                <h2 className={styles.paymentModalTitle}>Complete Payment</h2>
                <p className={styles.paymentModalSubtitle}>Choose your payment method</p>
              </div>

              <div className={styles.paymentModalBody}>
                <div className={styles.amountSection}>
                  <span className={styles.amountLabel}>Amount to Pay:</span>
                  <span className={styles.amountValue}>Rs. {total.toLocaleString()}</span>
                </div>

                <p className={styles.planDescription}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Bulk Order - {cart.length} items from {farmer?.farmName || 'Selected Farmer'}
                </p>

                <div className={styles.paymentGatewaySection}>
                  <h3 className={styles.gatewayTitle}>Select Payment Gateway</h3>
                  
                  <div className={styles.paymentMethods}>
                    <button
                      className={`${styles.paymentMethod} ${selectedPaymentMethod === 'esewa' ? styles.selectedMethod : ''}`}
                      onClick={() => setSelectedPaymentMethod('esewa')}
                    >
                      <div className={styles.paymentMethodLogo} style={{ background: '#60BB46' }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>eSewa</span>
                      </div>
                      <div className={styles.paymentMethodInfo}>
                        <h4 className={styles.paymentMethodName}>eSewa Payment</h4>
                        <p className={styles.paymentMethodDesc}>Pay with eSewa Digital Wallet</p>
                      </div>
                      <div className={styles.paymentMethodCheck}>
                        {selectedPaymentMethod === 'esewa' && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className={styles.securityNote}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <p>Your payment is secured with 256-bit encryption. You will be redirected to the payment gateway to complete your transaction.</p>
                </div>
              </div>

              <div className={styles.paymentModalFooter}>
                <button 
                  className={styles.cancelButton} 
                  onClick={() => {
                    setShowPaymentMethods(false);
                    setCreatedOrderId(null);
                  }}
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button 
                  className={styles.payNowButton}
                  onClick={() => handlePaymentMethodSelect('esewa')}
                  disabled={!selectedPaymentMethod || processingPayment}
                >
                  {processingPayment ? (
                    <>
                      <div className={styles.buttonSpinner}></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Pay Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Left Column - Delivery Details */}
          <div className={styles.leftColumn}>
            <div className={styles.section}>
              <h2>Delivery Details</h2>
              
              <div className={styles.formGroup}>
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+977 98XXXXXXXX"
                  />
                </div>
              </div>

              <h3>Delivery Address</h3>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Kathmandu"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Area *</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="Thamel"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Ward *</label>
                  <input
                    type="text"
                    name="ward"
                    value={formData.ward}
                    onChange={handleInputChange}
                    placeholder="Ward No."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Street Address *</label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    placeholder="Street name and building"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  placeholder="Near school, temple, etc."
                />
              </div>

              <div className={styles.formGroup}>
                <label>Delivery Instructions (Optional)</label>
                <textarea
                  name="deliveryInstructions"
                  value={formData.deliveryInstructions}
                  onChange={handleInputChange}
                  placeholder="Any special instructions for delivery"
                  rows="3"
                />
              </div>
            </div>

            <div className={styles.section}>
              <h2>Delivery Schedule</h2>

              <div className={styles.formGroup}>
                <label>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Preferred Time Slot *</label>
                <div className={styles.timeSlots}>
                  {['morning', 'afternoon', 'evening'].map(slot => (
                    <button
                      key={slot}
                      className={`${styles.timeSlot} ${formData.timeSlot === slot ? styles.active : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, timeSlot: slot }))}
                    >
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                      <span className={styles.timeRange}>
                        {slot === 'morning' && '6 AM - 12 PM'}
                        {slot === 'afternoon' && '12 PM - 5 PM'}
                        {slot === 'evening' && '5 PM - 9 PM'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Order Summary */}
          <div className={styles.rightColumn}>
            <div className={styles.orderSummary}>
              <h2>Order Summary</h2>

              {farmer && (
                <div className={styles.farmerInfo}>
                  <div className={styles.farmerInitials}>
                    {farmer.farmName.split(' ').map(word => word[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <div className={styles.farmerName}>{farmer.farmName}</div>
                    <div className={styles.farmerLocation}>{farmer.location}</div>
                  </div>
                </div>
              )}

              <div className={styles.orderItems}>
                <h3>Items</h3>
                {cart.map(item => (
                  <div key={item._id} className={styles.orderItem}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{item.productName}</div>
                      <div className={styles.itemQty}>{item.quantity} {item.unit}</div>
                    </div>
                    <div className={styles.itemPrice}>₹{(item.pricePerUnit * item.quantity).toFixed(0)}</div>
                  </div>
                ))}
              </div>

              <div className={styles.orderTotals}>
                <div className={styles.totalRow}>
                  <span>Subtotal (retail)</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className={styles.totalRow + ' ' + styles.discount}>
                    <span>Bulk discount ({discountPercentage}%)</span>
                    <span>-₹{discountAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className={styles.totalRow}>
                  <span>Delivery charge</span>
                  <span>₹{deliveryCharge}</span>
                </div>
                <div className={styles.totalRow + ' ' + styles.finalTotal}>
                  <span>Total Amount</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>
              </div>

              <button
                className={styles.confirmBtn}
                onClick={handleConfirmOrder}
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Confirm & Proceed to Payment'}
              </button>

              <p className={styles.disclaimer}>
                By confirming, you agree to our bulk order terms and delivery policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
