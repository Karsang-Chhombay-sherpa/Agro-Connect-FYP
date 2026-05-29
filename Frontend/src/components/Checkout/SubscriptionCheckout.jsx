import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header/Header';
import styles from './SubscriptionCheckout.module.css';
import EsewaPayment from '../EsewaPayment/EsewaPayment';
import ToastContainer from '../Toast/ToastContainer';
import { useToast } from '../../hooks/useToast';

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const plan = location.state?.plan;
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast();

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
    numberOfWeeks: 1,
    timeSlot: 'morning',
    selectedFarmers: [],
    agreeToTerms: false
  });

  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [selectedFarmerDetails, setSelectedFarmerDetails] = useState(null);
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    // Check for active subscriptions first
    checkActiveSubscription();
    
    // Load user data if available
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setFormData(prev => ({
        ...prev,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      }));
    }

    // Fetch farmers
    fetchFarmers();
  }, []);

  const checkActiveSubscription = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(userData);
      const response = await axios.get(`/api/subscriptions/user?userId=${user._id}&status=active`);
      
      if (response.data && response.data.length > 0) {
        showWarning('You already have an active subscription. Please cancel or complete your current subscription before subscribing to a new one.');
        setTimeout(() => navigate('/user-profile'), 2000);
        return;
      }
    } catch (error) {
      console.error('Error checking active subscriptions:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      setLoadingFarmers(true);
      console.log('Fetching farmers from /api/auth/farmers...');
      
      const response = await axios.get('/api/auth/farmers');
      console.log('Farmers API response:', response.data);
      
      if (response.data.success) {
        const farmersList = response.data.farmers || [];
        setFarmers(farmersList);
        console.log(`Loaded ${farmersList.length} farmers:`, farmersList);
        
        if (farmersList.length === 0) {
          console.warn('No farmers found in database. Please register farmers first.');
        }
      } else {
        console.error('Failed to fetch farmers:', response.data.message);
        showError('Failed to load farmers. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching farmers:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Show user-friendly error message
      if (error.response) {
        showError(error.response.data?.message || 'Failed to load farmers');
      } else if (error.request) {
        showError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        showError('An error occurred while loading farmers.');
      }
    } finally {
      setLoadingFarmers(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleWeeksSelect = (weeks) => {
    setFormData(prev => ({ ...prev, numberOfWeeks: weeks }));
  };

  const handleTimeSlotSelect = (slot) => {
    setFormData(prev => ({ ...prev, timeSlot: slot }));
  };

  const handleFarmerToggle = (farmerId) => {
    setFormData(prev => {
      const isSelected = prev.selectedFarmers.includes(farmerId);
      
      // For Basic Box, only allow single farmer selection
      if (plan?.id === 'basic') {
        return {
          ...prev,
          selectedFarmers: isSelected ? [] : [farmerId]
        };
      }
      
      // For Family Box, allow multiple farmers
      return {
        ...prev,
        selectedFarmers: isSelected
          ? prev.selectedFarmers.filter(id => id !== farmerId)
          : [...prev.selectedFarmers, farmerId]
      };
    });
  };

  const handleFarmerClick = (farmer, e) => {
    // Check if click is on the card itself (not checkbox area)
    if (e.target.closest(`.${styles.farmerCheckbox}`)) {
      handleFarmerToggle(farmer._id);
    } else {
      setSelectedFarmerDetails(farmer);
      setShowFarmerModal(true);
    }
  };

  const closeFarmerModal = () => {
    setShowFarmerModal(false);
    setSelectedFarmerDetails(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!plan) {
      showWarning('Please select a subscription plan first');
      setTimeout(() => navigate('/subscription'), 2000);
      return;
    }
    
    if (formData.selectedFarmers.length === 0) {
      showWarning('Please select at least one farmer');
      return;
    }

    // Show payment modal
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handlePayNow = async () => {
    if (!selectedPaymentMethod) {
      showWarning('Please select a payment method');
      return;
    }

    if (selectedPaymentMethod !== 'esewa') {
      showInfo('Only eSewa payment is currently supported');
      return;
    }

    setProcessingPayment(true);

    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      console.log('User data from localStorage:', userData ? 'Found' : 'Not found');
      
      if (!userData) {
        throw new Error('Please login to continue');
      }
      
      const user = JSON.parse(userData);
      console.log('Parsed user:', { id: user._id, email: user.email });
      
      // Validate form data
      if (!formData.startDate) {
        throw new Error('Please select a start date');
      }
      
      if (!formData.selectedFarmers || formData.selectedFarmers.length === 0) {
        throw new Error('Please select at least one farmer');
      }
      
      // Create subscription order (similar to marketplace order creation)
      const subscriptionData = {
        userId: user._id,
        planId: plan.id,
        planName: plan.name,
        weeklyPrice: plan.price,
        numberOfWeeks: formData.numberOfWeeks,
        totalAmount: totalPrice,
        deliveryInfo: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          city: formData.city,
          area: formData.area,
          ward: formData.ward,
          streetAddress: formData.streetAddress,
          landmark: formData.landmark,
          deliveryInstructions: formData.deliveryInstructions
        },
        schedule: {
          startDate: formData.startDate,
          timeSlot: formData.timeSlot
        },
        selectedFarmers: formData.selectedFarmers,
        paymentMethod: 'esewa'
      };

      console.log('Creating subscription order:', subscriptionData);
      console.log('API endpoint:', '/api/subscriptions/create');

      // Create subscription order
      const orderResponse = await axios.post('/api/subscriptions/create', subscriptionData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      console.log('Subscription creation response:', orderResponse.data);

      if (!orderResponse.data.success) {
        const errorMessage = orderResponse.data.message || 'Failed to create subscription';
        
        // If user already has active subscription, redirect to profile
        if (errorMessage.includes('already have an active subscription')) {
          showWarning(errorMessage);
          setTimeout(() => navigate('/user-profile'), 2000);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const subscription = orderResponse.data.data;
      console.log('Subscription created successfully:', subscription);

      // Validate subscription data
      if (!subscription || !subscription._id) {
        throw new Error('Invalid subscription response from server');
      }

      // Initiate eSewa payment (same as marketplace)
      console.log('Initiating eSewa payment for subscription ID:', subscription._id);
      
      const paymentResponse = await axios.post('/api/payments/initiate-subscription', {
        subscriptionId: subscription._id
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      console.log('Payment initiation response:', paymentResponse.data);

      if (!paymentResponse.data.success) {
        throw new Error(paymentResponse.data.message || 'Failed to initiate payment');
      }

      console.log('eSewa payment initiated successfully:', paymentResponse.data);

      // Store payment data and show eSewa payment component
      setPaymentData(paymentResponse.data.data);
      setShowPaymentModal(false);

    } catch (error) {
      console.error('Error processing payment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to process payment. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (error.response) {
        console.error('Server error response:', error.response.data);
        errorMessage = error.response.data.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'Cannot connect to server. Please ensure the backend is running and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
      setProcessingPayment(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod(null);
  };

  const totalPrice = plan ? plan.price * formData.numberOfWeeks : 0;

  // If payment data is available, show eSewa payment component
  if (paymentData) {
    return (
      <EsewaPayment
        paymentData={paymentData}
        onCancel={() => {
          setPaymentData(null);
          setProcessingPayment(false);
        }}
      />
    );
  }

  // Show loading while checking for active subscriptions
  if (checkingSubscription) {
    return (
      <>
        <Header />
        <div className={styles.checkoutContainer}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', color: '#6b7280' }}>Checking subscription status...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.checkoutContainer}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        <div className={styles.content}>
        {!plan ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ color: '#111827', marginBottom: '16px' }}>No Plan Selected</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Please select a subscription plan first.</p>
            <button 
              onClick={() => navigate('/subscription')}
              style={{
                padding: '12px 24px',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              View Subscription Plans
            </button>
          </div>
        ) : (
          <>
        {/* Left Column - Form */}
        <div className={styles.leftColumn}>
          {/* Plan Summary */}
          <div className={styles.planSummary}>
            <div className={styles.planIcon}>🥬</div>
            <div className={styles.planInfo}>
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planDetails}>
                {plan.features[0]} • {plan.features[2]} • {plan.features[1]}
              </p>
            </div>
            <div className={styles.planPrice}>
              <span className={styles.currency}>₹</span>
              <span className={styles.amount}>{plan.price}</span>
              <span className={styles.period}>per week</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Delivery Information */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📦</span>
                Delivery Information
              </h3>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Full Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    className={styles.input}
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Phone Number <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    className={styles.input}
                    placeholder="+977 98XXXXXXXX"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>
                    Email Address <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    City <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    className={styles.input}
                    placeholder="Kathmandu"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Area</label>
                  <input
                    type="text"
                    name="area"
                    className={styles.input}
                    placeholder="Thamel"
                    value={formData.area}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Ward</label>
                  <input
                    type="text"
                    name="ward"
                    className={styles.input}
                    placeholder="Ward No."
                    value={formData.ward}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Street Address</label>
                  <input
                    type="text"
                    name="streetAddress"
                    className={styles.input}
                    placeholder="Street name / number"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Landmark (optional)</label>
                  <input
                    type="text"
                    name="landmark"
                    className={styles.input}
                    placeholder="Near..."
                    value={formData.landmark}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Delivery Instructions</label>
                  <textarea
                    name="deliveryInstructions"
                    className={styles.textarea}
                    placeholder="Any special instructions for delivery..."
                    value={formData.deliveryInstructions}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Delivery Schedule */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📅</span>
                Delivery Schedule
              </h3>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Start Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  className={styles.input}
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Number of Weeks <span className={styles.required}>*</span>
                </label>
                <div className={styles.weeksSelector}>
                  {[1, 2, 3, 4].map(weeks => (
                    <button
                      key={weeks}
                      type="button"
                      className={`${styles.weekButton} ${formData.numberOfWeeks === weeks ? styles.active : ''}`}
                      onClick={() => handleWeeksSelect(weeks)}
                    >
                      <div className={styles.weekNumber}>{weeks}</div>
                      <div className={styles.weekLabel}>Week{weeks > 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Time Slot <span className={styles.required}>*</span>
                </label>
                <div className={styles.timeSlots}>
                  <button
                    type="button"
                    className={`${styles.timeSlot} ${formData.timeSlot === 'morning' ? styles.active : ''}`}
                    onClick={() => handleTimeSlotSelect('morning')}
                  >
                    <div className={styles.timeSlotName}>Morning</div>
                    <div className={styles.timeSlotTime}>7:00 AM - 11:00 AM</div>
                  </button>
                  <button
                    type="button"
                    className={`${styles.timeSlot} ${formData.timeSlot === 'afternoon' ? styles.active : ''}`}
                    onClick={() => handleTimeSlotSelect('afternoon')}
                  >
                    <div className={styles.timeSlotName}>Afternoon</div>
                    <div className={styles.timeSlotTime}>12:00 PM - 4:00 PM</div>
                  </button>
                  <button
                    type="button"
                    className={`${styles.timeSlot} ${formData.timeSlot === 'evening' ? styles.active : ''}`}
                    onClick={() => handleTimeSlotSelect('evening')}
                  >
                    <div className={styles.timeSlotName}>Evening</div>
                    <div className={styles.timeSlotTime}>5:00 PM - 8:00 PM</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Select Farmers */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>👨‍🌾</span>
                Select Farmer{plan?.id === 'family' ? 's' : ''}
                {farmers.length > 0 && (
                  <span className={styles.farmerCount}>({farmers.length} available)</span>
                )}
              </h3>
              <p className={styles.sectionDescription}>
                {plan?.id === 'basic' 
                  ? 'Choose one farm to source your produce from'
                  : 'Choose one or more farms to source your produce from'}
              </p>

              {loadingFarmers ? (
                <div className={styles.loadingFarmers}>Loading farmers...</div>
              ) : farmers.length === 0 ? (
                <div className={styles.noFarmers}>
                  <p>No farmers available at the moment.</p>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                    Farmers need to register first before they can be selected for subscriptions.
                  </p>
                </div>
              ) : (
                <div className={styles.farmersGrid}>
                  {farmers.map((farmer) => (
                    <div
                      key={farmer._id}
                      className={`${styles.farmerCard} ${
                        formData.selectedFarmers.includes(farmer._id) ? styles.selected : ''
                      }`}
                      onClick={(e) => handleFarmerClick(farmer, e)}
                    >
                      <div 
                        className={styles.farmerCheckbox}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFarmerToggle(farmer._id);
                        }}
                      >
                        {formData.selectedFarmers.includes(farmer._id) && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      
                      <div className={styles.farmerAvatar}>
                        {farmer.profilePicture ? (
                          <img src={farmer.profilePicture} alt={farmer.farmName} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {farmer.farmName?.charAt(0) || 'F'}
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.farmerInfo}>
                        <h4 className={styles.farmerName}>{farmer.farmName}</h4>
                        <p className={styles.farmerLocation}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {farmer.location || 'Location not specified'}
                        </p>
                        {farmer.description && (
                          <p className={styles.farmerDescription}>
                            {farmer.description.length > 80 
                              ? `${farmer.description.substring(0, 80)}...` 
                              : farmer.description}
                          </p>
                        )}
                      </div>
                      
                      <div className={styles.viewDetailsHint}>Click to view details</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Column - Order Summary */}
        <div className={styles.rightColumn}>
          <div className={styles.orderSummary}>
            <h3 className={styles.summaryTitle}>Order Summary</h3>
            
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{plan.name}</span>
              <span className={styles.summaryValue}>₹{plan.price}</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Weeks</span>
              <span className={styles.summaryValue}>{formData.numberOfWeeks}</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Frequency</span>
              <span className={styles.summaryValue} style={{ color: '#22c55e' }}>Monthly</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Delivery</span>
              <span className={styles.summaryValue} style={{ color: '#22c55e' }}>Free</span>
            </div>
            
            <div className={styles.summaryDivider}></div>
            
            <div className={styles.summaryRow} style={{ fontSize: '18px', fontWeight: '600' }}>
              <span className={styles.summaryLabel}>Total</span>
              <span className={styles.summaryValue}>₹{totalPrice}/wk</span>
            </div>

            <button 
              type="submit" 
              className={styles.confirmButton}
              onClick={handleSubmit}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Confirm Subscription
            </button>

            <p className={styles.cancelNote}>
              You can cancel or pause your subscription anytime.
            </p>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Farmer Details Modal */}
      {showFarmerModal && selectedFarmerDetails && (
        <div className={styles.modalOverlay} onClick={closeFarmerModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeFarmerModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className={styles.modalHeader}>
              <div className={styles.modalAvatar}>
                {selectedFarmerDetails.profilePicture ? (
                  <img src={selectedFarmerDetails.profilePicture} alt={selectedFarmerDetails.farmName} />
                ) : (
                  <div className={styles.modalAvatarPlaceholder}>
                    {selectedFarmerDetails.farmName?.charAt(0) || 'F'}
                  </div>
                )}
              </div>
              <h2 className={styles.modalTitle}>{selectedFarmerDetails.farmName}</h2>
              <p className={styles.modalLocation}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {selectedFarmerDetails.location || 'Location not specified'}
              </p>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>About the Farm</h3>
                <p className={styles.modalDescription}>
                  {selectedFarmerDetails.description || 'No description available.'}
                </p>
              </div>

              {selectedFarmerDetails.email && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Contact Information</h3>
                  <div className={styles.contactInfo}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{selectedFarmerDetails.email}</span>
                  </div>
                </div>
              )}

              {selectedFarmerDetails.geoLocation && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Farm Location</h3>
                  <a
                    href={`https://map.gallimap.com/?lat=${selectedFarmerDetails.geoLocation.coordinates[1]}&lng=${selectedFarmerDetails.geoLocation.coordinates[0]}&zoom=15`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.viewMapButton}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    View on Galli Map
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.selectFarmerButton}
                onClick={() => {
                  handleFarmerToggle(selectedFarmerDetails._id);
                  closeFarmerModal();
                }}
              >
                {formData.selectedFarmers.includes(selectedFarmerDetails._id) ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Selected
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Select This Farmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className={styles.paymentModalOverlay} onClick={closePaymentModal}>
          <div className={styles.paymentModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.paymentModalClose} onClick={closePaymentModal}>
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
                <span className={styles.amountValue}>Rs. {totalPrice.toLocaleString()}</span>
              </div>
              <p className={styles.planDescription}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {plan.name} - {formData.numberOfWeeks} Week{formData.numberOfWeeks > 1 ? 's' : ''} Subscription
              </p>

              <div className={styles.paymentGatewaySection}>
                <h3 className={styles.gatewayTitle}>Select Payment Gateway</h3>
                
                <div className={styles.paymentMethods}>
                  <button
                    className={`${styles.paymentMethod} ${selectedPaymentMethod === 'esewa' ? styles.selectedMethod : ''}`}
                    onClick={() => handlePaymentMethodSelect('esewa')}
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
              <button className={styles.cancelButton} onClick={closePaymentModal}>
                Cancel
              </button>
              <button 
                className={styles.payNowButton}
                onClick={handlePayNow}
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
      )}
    </div>
    </>
  );
}
