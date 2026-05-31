import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import styles from './Header.module.css'
import logoImg from '../../assets/Logo.png'
import NotificationBell from '../Notifications/NotificationBell'

const Header = ({ cart = [], onCartClick }) => {
  const [user, setUser] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem("user")
      if (userData) {
        setUser(JSON.parse(userData))
      } else {
        setUser(null)
      }
    }
    
    checkUser()
    
    // Listen for storage changes (when user logs in from another tab/window)
    window.addEventListener('storage', checkUser)
    
    // Also check when window gains focus (in case user logged in in same window)
    window.addEventListener('focus', checkUser)
    
    return () => {
      window.removeEventListener('storage', checkUser)
      window.removeEventListener('focus', checkUser)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user")
    setUser(null)
    setShowPopup(false)
    window.location.href = "/"
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <img src={logoImg} alt="AgroConnect" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
          <span className={styles.logoText}>AgroConnect</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link 
            to="/marketplace" 
            className={`${styles.navLink} ${location.pathname === '/marketplace' ? styles.navLinkActive : ''}`}
            onClick={(e) => {
              if (!user || user.userType === "farmer") {
                e.preventDefault()
                toast.info("Please login as a user to access Marketplace.")
                if (!user) window.location.href = "/login"
              }
            }}
          >
            Marketplace
          </Link>
          <Link 
            to="/subscription" 
            className={`${styles.navLink} ${location.pathname === '/subscription' ? styles.navLinkActive : ''}`}
            onClick={(e) => {
              if (!user || user.userType === "farmer") {
                e.preventDefault()
                toast.info("Please login as a user to access Subscription.")
                if (!user) window.location.href = "/login"
              }
            }}
          >
            Subscription
          </Link>
          <Link 
            to="/bulk-orders" 
            className={`${styles.navLink} ${location.pathname === '/bulk-orders' ? styles.navLinkActive : ''}`}
            onClick={(e) => {
              if (!user || user.userType === "farmer") {
                e.preventDefault()
                toast.info("Please login as a user to access Bulk Orders.")
                if (!user) window.location.href = "/login"
              }
            }}
          >
            Bulk Orders
          </Link>
          <Link 
            to="/wishlist"
            className={styles.navLink}
            onClick={(e) => {
              if (!user || user.userType === "farmer") {
                e.preventDefault();
                toast.info("Please login as a user to access Wishlist.")
                if (!user) window.location.href = "/login"
              }
            }}
          >
            Wishlist
          </Link>
          {!user && (
            <Link to="/about" className={styles.navLink}>
              About
            </Link>
          )}
        </nav>
        
        <div className={styles.actions}>
          {user && user.userType !== "farmer" && (
            <NotificationBell user={user} />
          )}
          {user && user.userType !== "farmer" && onCartClick && (
            <button 
              className={styles.cartBtn}
              onClick={onCartClick}
              title="View Cart"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              {cart.length > 0 && (
                <span className={styles.cartBadge}>{cart.length}</span>
              )}
            </button>
          )}
          {user ? (
            <div className={styles.userSection}>
              <button 
                className={styles.userButton}
                onClick={() => {
                  const userData = localStorage.getItem("user")
                  if (userData) {
                    setUser(JSON.parse(userData))
                  }
                  setShowPopup(!showPopup)
                }}
              >
                <div className={styles.userAvatar}>
                  {(user.profilePicture || localStorage.getItem('userProfilePicture')) ? (
                    <img src={user.profilePicture || localStorage.getItem('userProfilePicture')} alt="Profile" />
                  ) : (
                    <span>{user.firstName?.[0] || 'U'}</span>
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
                      <div className={styles.userType}>User Account</div>
                    </div>
                  </div>
                  <div className={styles.popupActions}>
                    <Link to="/user-profile" className={styles.popupLink} onClick={() => setShowPopup(false)}>
                      Profile Settings
                    </Link>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className={styles.loginBtn}>Login</Link>
          <Link to="/signup" className={styles.signupBtn}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
