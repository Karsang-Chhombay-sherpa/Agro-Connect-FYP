import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import logoImg from '../../assets/Logo.png';

const FarmerHeader = ({ activeTab, onTabChange }) => {
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        setUser(null);
      }
    };
    
    checkUser();
    
    // Listen for storage changes
    window.addEventListener('storage', checkUser);
    window.addEventListener('focus', checkUser);
    
    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('focus', checkUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setShowPopup(false);
    window.location.href = "/";
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div
          className={styles.logo}
          style={{ cursor: onTabChange ? 'pointer' : 'default' }}
          onClick={() => onTabChange && onTabChange('dashboard')}
        >
          <div className={styles.logoIcon}>
            <img src={logoImg} alt="AgroConnect" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
          <span className={styles.logoText}>AgroConnect</span>
        </div>
        
        <nav className={styles.nav}>
          {onTabChange ? (
            <>
              <button 
                className={`${styles.navLink} ${activeTab === 'analytics' ? styles.navLinkActive : ''}`}
                onClick={() => onTabChange('analytics')}
              >
                Analytics
              </button>
              <button 
                className={`${styles.navLink} ${activeTab === 'orders' ? styles.navLinkActive : ''}`}
                onClick={() => onTabChange('orders')}
              >
                Orders
              </button>
              <button 
                className={`${styles.navLink} ${activeTab === 'subscriptions' ? styles.navLinkActive : ''}`}
                onClick={() => onTabChange('subscriptions')}
              >
                Subscriptions
              </button>
              <button 
                className={`${styles.navLink} ${activeTab === 'bulk-orders' ? styles.navLinkActive : ''}`}
                onClick={() => onTabChange('bulk-orders')}
              >
                Bulk Orders
              </button>
              <button 
                className={`${styles.navLink} ${activeTab === 'wallet' ? styles.navLinkActive : ''}`}
                onClick={() => onTabChange('wallet')}
              >
                Wallet
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/farmer-dashboard"
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/farmer-dashboard');
                }}
              >
                Analytics
              </Link>
              <Link 
                to="/farmer-dashboard"
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/farmer-dashboard');
                }}
              >
                Orders
              </Link>
              <Link 
                to="/farmer-dashboard"
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/farmer-dashboard');
                }}
              >
                Subscriptions
              </Link>
              <Link 
                to="/farmer-dashboard"
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/farmer-dashboard');
                }}
              >
                Wallet
              </Link>
            </>
          )}
        </nav>

        <div className={styles.actions}>
          {user && (
            <div className={styles.userSection}>
              <button 
                className={styles.userButton}
                onClick={() => setShowPopup(!showPopup)}
              >
                <div className={styles.userAvatar}>
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" />
                  ) : (
                    <span>{user.firstName?.[0] || 'F'}</span>
                  )}
                </div>
                <span className={styles.userName}>{user.firstName} {user.lastName}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {showPopup && (
                <div className={styles.userPopup}>
                  <div className={styles.userInfo}>
                    <div className={styles.userDetails}>
                      <div className={styles.userNameLarge}>{user.firstName} {user.lastName}</div>
                      <div className={styles.userEmail}>{user.email}</div>
                      <div className={styles.userType}>Farmer Account</div>
                    </div>
                  </div>
                  <div className={styles.popupActions}>
                    <Link to="/farmer-profile" className={styles.popupLink}>
                      Profile Settings
                    </Link>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default FarmerHeader;