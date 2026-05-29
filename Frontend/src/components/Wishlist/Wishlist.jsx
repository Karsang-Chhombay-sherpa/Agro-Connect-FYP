import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './Wishlist.module.css';
import Header from '../Header/Header';

export default function Wishlist() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/login'); return; }
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlistIds(saved);

      if (saved.length === 0) { setLoading(false); return; }

      // Fetch fresh product details from backend (always fresh, never cached)
      const results = await Promise.allSettled(
        saved.map(id => axios.get(`/api/products/${id}`))
      );

      const loaded = results
        .filter(r => r.status === 'fulfilled' && r.value.data.success)
        .map(r => r.value.data.product);

      setProducts(loaded);

      // Clear stale notifications for products that are now available
      // so the bell can re-notify if they go out of stock and come back again
      const availableIds = loaded.filter(p => p.isAvailable && p.quantity > 0).map(p => p._id);
      const existingNotifs = JSON.parse(localStorage.getItem('userNotifications') || '[]');
      // Remove notifications for products that are already available (user can see them)
      // Keep only unread ones that haven't been acted on
      const cleanedNotifs = existingNotifs.filter(n =>
        !availableIds.includes(n.productId) || !n.read
      );
      if (cleanedNotifs.length !== existingNotifs.length) {
        localStorage.setItem('userNotifications', JSON.stringify(cleanedNotifs));
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      }

    } catch (err) {
      console.error('Error loading wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = (productId) => {
    const updated = wishlistIds.filter(id => id !== productId);
    setWishlistIds(updated);
    setProducts(prev => prev.filter(p => p._id !== productId));
    localStorage.setItem('wishlist', JSON.stringify(updated));
    // Also remove any notification for this product
    const notifs = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    localStorage.setItem('userNotifications', JSON.stringify(notifs.filter(n => n.productId !== productId)));
    window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    toast.success('Removed from wishlist');
  };

  const addToCart = (product) => {
    if (!product.isAvailable || product.quantity === 0) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    toast.success(`${product.productName} added to cart!`);
  };

  const isAvailable = (product) => product.isAvailable && product.quantity > 0;

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>My Wishlist</h1>
            <span className={styles.count}>{products.length} item{products.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className={styles.empty}>
              <div className={styles.spinner} />
              <p>Loading wishlist...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>
              <p>Your wishlist is empty</p>
              <Link to="/marketplace" className={styles.shopBtn}>Browse Products</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {products.map(product => (
                <div key={product._id} className={styles.card}>
                  <div className={styles.imageWrap} onClick={() => navigate(`/product/${product._id}`)}>
                    {product.image ? (
                      <img src={product.image} alt={product.productName} className={styles.image} />
                    ) : (
                      <div className={styles.noImage}>🌿</div>
                    )}

                    {/* Availability badge */}
                    <div className={styles.stockBadge} style={{
                      background: isAvailable(product) ? '#22c55e' : '#ef4444'
                    }}>
                      {isAvailable(product) ? `${product.quantity} ${product.unit} available` : 'Out of Stock'}
                    </div>

                    <button
                      className={styles.removeBtn}
                      onClick={(e) => { e.stopPropagation(); removeFromWishlist(product._id); }}
                      title="Remove from wishlist"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                          stroke="#ef4444" strokeWidth="2" fill="#ef4444"/>
                      </svg>
                    </button>
                  </div>

                  <div className={styles.info}>
                    <h3 className={styles.name} onClick={() => navigate(`/product/${product._id}`)}>
                      {product.productName}
                    </h3>
                    <p className={styles.farm}>From {product.farmerId?.farmName || 'local farm'}</p>
                    <p className={styles.price}>₹{product.pricePerUnit} / {product.unit}</p>

                    <button
                      className={styles.cartBtn}
                      onClick={() => addToCart(product)}
                      disabled={!isAvailable(product)}
                      style={{
                        background: isAvailable(product) ? '#22c55e' : '#d1d5db',
                        cursor: isAvailable(product) ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isAvailable(product) ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
