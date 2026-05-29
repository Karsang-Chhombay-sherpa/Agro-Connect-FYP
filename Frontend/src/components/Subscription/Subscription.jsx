import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header/Header';
import ToastContainer from '../Toast/ToastContainer';
import { useToast } from '../../hooks/useToast';
import styles from './Subscription.module.css';
import vegetableSubBox from '../../assets/vegetableSubBox.png';

export default function Subscription() {
  const { toasts, removeToast, showWarning } = useToast();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType === 'farmer') {
      navigate('/farmer-dashboard');
      return;
    }

    setUser(parsedUser);

    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Check for active subscriptions
    checkActiveSubscriptions(parsedUser._id);
  }, [navigate]);

  const checkActiveSubscriptions = async (userId) => {
    try {
      setLoadingSubscriptions(true);
      const response = await axios.get(`/api/subscriptions/user?userId=${userId}&status=active`);
      
      if (response.data && response.data.length > 0) {
        setHasActiveSubscription(true);
        console.log('User has active subscription:', response.data[0]);
      } else {
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error('Error checking active subscriptions:', error);
      setHasActiveSubscription(false);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basic Box',
      price: 599,
      description: 'Perfect for individuals or couples',
      features: [
        'Sourced from single local farm only',
        'Weekly delivery',
        'Delivery slot selection',
        '5% discount on marketplace purchases',
      ],
      popular: false
    },
    {
      id: 'family',
      name: 'Premium Box',
      price: 1499,
      description: 'Ideal for families of 4-6',
      features: [
        'Premium selection from top farms',
        'Sourced from multiple local farms only',
        'Free delivery on all orders',
        '10% discount on marketplace purchases',
        'Skip or pause anytime'
      ],
      popular: true
    }
  ];

  return (
    <div className={styles.subscription}>
      <Header cart={cart} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Fresh Vegetables,<br />
                Delivered Weekly
              </h1>
              <p className={styles.heroDescription}>
                Subscribe to our curated boxes and enjoy farm-fresh organic produce delivered to
                your doorstep every week. Support local farmers while eating healthy.
              </p>
              
              <div className={styles.heroFeatures}>
                <div className={styles.heroFeature}>
                  <div className={styles.featureIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="#22c55e" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.featureTitle}>Free Delivery</div>
                    <div className={styles.featureDesc}>On all subscriptions</div>
                  </div>
                </div>
                
                <div className={styles.heroFeature}>
                  <div className={styles.featureIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#22c55e" strokeWidth="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="#22c55e" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.featureTitle}>Flexible Schedule</div>
                    <div className={styles.featureDesc}>Skip or pause anytime</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroImage}>
              <div className={styles.imageBox}>
                <img src={vegetableSubBox} alt="Fresh Vegetables Box" className={styles.boxImage} />
              </div>
            </div>

          </div>
        </section>

        {/* Plans Section */}
        <section className={styles.plansSection}>
          <div className={styles.container}>
            <h2 className={styles.plansTitle}>Choose Your Plan</h2>
            <p className={styles.plansSubtitle}>Select the perfect subscription box for your household</p>
            
            <div className={styles.plansGrid}>
              {plans.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`${styles.planCard} ${plan.popular ? styles.popularPlan : ''}`}
                >
                  {plan.popular && (
                    <div className={styles.popularBadge}>Most Popular</div>
                  )}
                  
                  <div className={styles.planHeader}>
                    <h3 className={styles.planName}>{plan.name}</h3>
                    <p className={styles.planDescription}>{plan.description}</p>
                  </div>
                  
                  <div className={styles.planPrice}>
                    <span className={styles.currency}>₹</span>
                    <span className={styles.amount}>{plan.price}</span>
                    <span className={styles.period}>per week</span>
                  </div>
                  
                  <ul className={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <li key={index} className={styles.feature}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                    className={styles.subscribeBtn}
                    onClick={() => {
                      if (hasActiveSubscription) {
                        showWarning('You already have an active subscription. Please cancel or complete your current subscription before subscribing to a new one.');
                        setTimeout(() => navigate('/user-profile'), 2000);
                      } else {
                        navigate('/subscription-checkout', { state: { plan } });
                      }
                    }}
                    disabled={loadingSubscriptions}
                  >
                    {loadingSubscriptions ? 'Loading...' : hasActiveSubscription ? 'View Active Subscription' : 'Subscribe Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
