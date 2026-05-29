import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './NotificationBell.module.css';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // User-specific localStorage keys
  const userId = user?._id || user?.id || 'guest';
  const NOTIF_KEY = `userNotifications_${userId}`;
  const STOCK_KEY = `wishlistStockState_${userId}`;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load saved notifications on mount (user-specific)
  useEffect(() => {
    if (!user) return;

    const saved = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    setNotifications(saved);

    // Listen for updates from Marketplace or other components
    const handleUpdate = () => {
      const updated = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
      setNotifications(updated);
    };
    window.addEventListener('notificationsUpdated', handleUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleUpdate);
  }, [user, NOTIF_KEY]);

  // Check wishlist on mount and every 30 seconds
  useEffect(() => {
    if (!user) return;
    checkWishlist();
    const interval = setInterval(checkWishlist, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkWishlist = async () => {
    try {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      if (wishlist.length === 0) return;

      // Fetch ALL wishlist products with current stock status
      const res = await axios.post('/api/notifications/check-wishlist-all', {
        productIds: wishlist
      });
      if (!res.data.success) return;

      const allProducts = res.data.products || [];

      // Load previous stock state (user-specific)
      const prevStockState = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
      const newStockState = { ...prevStockState };
      const newNotifications = [];

      allProducts.forEach(p => {
        const isNowAvailable = p.isAvailable && p.quantity > 0;
        const wasAvailable = prevStockState[p._id]; // undefined = first time

        // Update stock state
        newStockState[p._id] = isNowAvailable;

        // Only notify when product transitions from out-of-stock → in-stock
        // wasAvailable === false means we previously recorded it as out of stock
        if (isNowAvailable && wasAvailable === false) {
          newNotifications.push({
            id: `notif-${p._id}-${Date.now()}`,
            productId: p._id,
            productName: p.productName,
            image: p.image || null,
            message: `${p.productName} is back in stock!`,
            detail: `${p.quantity} ${p.unit} available`,
            price: `₹${p.pricePerUnit}/${p.unit}`,
            read: false,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Save updated stock state
      localStorage.setItem(STOCK_KEY, JSON.stringify(newStockState));

      // Add new notifications if any
      if (newNotifications.length > 0) {
        const existing = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
        const updated = [...newNotifications, ...existing].slice(0, 50);
        localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
        setNotifications(updated);
      }

    } catch (err) {
      console.error('Notification check error:', err);
    }
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem(NOTIF_KEY, JSON.stringify([]));
  };

  const handleNotificationClick = (notification) => {
    const updated = notifications.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    setOpen(false);
    navigate('/wishlist');
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className={styles.bellBtn}
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>
              Notifications
              {unreadCount > 0 && (
                <span className={styles.unreadLabel}>{unreadCount} new</span>
              )}
            </span>
            <div className={styles.dropdownActions}>
              {unreadCount > 0 && (
                <button className={styles.actionBtn} onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className={styles.actionBtn} onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                    stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"
                    stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>No notifications yet</p>
                <span>We'll notify you when wishlisted products are back in stock</span>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={styles.itemIcon}>
                    {n.image ? (
                      <img src={n.image} alt={n.productName} className={styles.itemImg} />
                    ) : (
                      <div className={styles.itemIconFallback}>🌿</div>
                    )}
                    {!n.read && <span className={styles.unreadDot} />}
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemMessage}>{n.message}</p>
                    {n.detail && <span className={styles.itemDetail}>{n.detail}</span>}
                    <span className={styles.itemPrice}>{n.price}</span>
                    <span className={styles.itemTime}>{formatTime(n.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className={styles.dropdownFooter}>
              <button
                className={styles.viewWishlistBtn}
                onClick={() => { setOpen(false); navigate('/wishlist'); }}
              >
                View Wishlist
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
