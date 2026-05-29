import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Header from '../Header/Header';
import Cart from '../Cart/Cart';
import styles from './ProductDetail.module.css';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Review form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setUserName(`${parsedUser.firstName} ${parsedUser.lastName}`);
    }
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    
    fetchProductDetails();
    fetchReviews();
  }, [productId]);

  // Listen for cart changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      } else {
        setCart([]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const fetchProductDetails = async () => {
    try {
      const response = await axios.get(`/api/products/${productId}`);
      if (response.data.success) {
        setProduct(response.data.product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`/api/reviews/product/${productId}`);
      if (response.data.success) {
        setReviews(response.data.reviews);
        setAverageRating(parseFloat(response.data.averageRating));
        setTotalReviews(response.data.totalReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please login to leave a review');
      return;
    }
    
    if (!user._id) {
      setError('User ID not found. Please try logging in again.');
      console.error('User object:', user);
      return;
    }
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      setError('Please write a comment');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      console.log('Submitting review:', { productId, userId: user._id, userName, rating, comment: comment.trim() });
      
      const response = await axios.post('/api/reviews/add', {
        productId,
        userId: user._id,
        userName,
        rating,
        comment: comment.trim()
      });
      
      console.log('Review response:', response.data);
      
      if (response.data.success) {
        // Reset form
        setRating(0);
        setComment('');
        setError('');
        
        // Refresh reviews
        await fetchReviews();
        
        toast.success('Review submitted successfully!');
      } else {
        setError(response.data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      console.error('Error response:', error.response);
      
      if (error.response) {
        // Server responded with error
        setError(error.response.data?.message || `Server error: ${error.response.status}`);
      } else if (error.request) {
        // Request made but no response
        setError('No response from server. Please check if the backend is running.');
      } else {
        // Error setting up request
        setError(error.message || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.quantity === 0) {
      toast.error('This product is currently out of stock.');
      return;
    }
    
    if (quantity < 1) {
      toast.error('Please select a valid quantity.');
      return;
    }
    
    if (quantity > product.quantity) {
      toast.error(`Only ${product.quantity} ${product.unit} available in stock.`);
      return;
    }
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item._id === product._id);
    
    if (existingItem) {
      // Check if adding more would exceed available stock
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.quantity) {
        toast.error(`Only ${product.quantity} ${product.unit} available in stock. You already have ${existingItem.quantity} in cart.`);
        return;
      }
      
      // Update quantity
      existingItem.quantity = newQuantity;
      existingItem.availableStock = product.quantity; // Update available stock
    } else {
      // Add new item to cart
      cart.push({ 
        ...product, 
        quantity: quantity,
        availableStock: product.quantity // Store original stock for validation
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update local cart state
    setCart(cart);
    
    // Dispatch custom event to update cart in header
    window.dispatchEvent(new Event('storage'));
    
    toast.success(`Added ${quantity} ${product.unit} to cart!`);
    setQuantity(1); // Reset quantity
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) {
      setQuantity(1);
    } else if (newQuantity > product.quantity) {
      setQuantity(product.quantity);
    } else {
      setQuantity(newQuantity);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const updatedCart = cart.map((item) =>
      item._id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter((item) => item._id !== productId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const renderStars = (rating, interactive = false, size = 20) => {
    return (
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={star <= (interactive ? (hoverRating || rating) : rating) ? '#fbbf24' : '#d1d5db'}
            className={interactive ? styles.interactiveStar : ''}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && setRating(star)}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />
        <div className={styles.loading}>Loading product details...</div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />
        <div className={styles.error}>Product not found</div>
      </>
    );
  }

  return (
    <div className={styles.productDetail}>
      <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />
      
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Back Button */}
          <button onClick={() => navigate('/marketplace')} className={styles.backBtn}>
            ← Back to Marketplace
          </button>

          {/* Product Section */}
          <div className={styles.productSection}>
            {/* Product Image */}
            <div className={styles.imageContainer}>
              {product.image ? (
                <img src={product.image} alt={product.productName} className={styles.productImage} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="#9ca3af" strokeWidth="2" />
                  </svg>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className={styles.productInfo}>
              {product.quantity > 0 ? (
                <div className={styles.availabilityBadge}>
                  {product.quantity} {product.unit} available
                </div>
              ) : (
                <div className={styles.outOfStockBadge}>Out of Stock</div>
              )}
              
              <h1 className={styles.productName}>{product.productName}</h1>
              
              <p className={styles.description}>{product.description}</p>
              
              <div className={styles.ratingDisplay}>
                {renderStars(averageRating)}
                <span className={styles.ratingText}>
                  {averageRating.toFixed(1)} ({totalReviews} reviews)
                </span>
              </div>
              
              <div className={styles.price}>₹{product.pricePerUnit} / {product.unit}</div>
              
              {product.distance && (
                <div className={styles.distance}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {product.distance} km away
                </div>
              )}
              
              {/* Quantity Selector */}
              {product.quantity > 0 && (
                <div className={styles.quantitySelector}>
                  <label className={styles.quantityLabel}>Quantity:</label>
                  <div className={styles.quantityControls}>
                    <button 
                      className={styles.quantityBtn}
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <input 
                      type="number" 
                      className={styles.quantityInput}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      min="1"
                      max={product.quantity}
                    />
                    <button 
                      className={styles.quantityBtn}
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= product.quantity}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              
              <button 
                className={styles.addToCartBtn}
                onClick={handleAddToCart}
                disabled={product.quantity === 0}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>

          {/* About the Farm */}
          <div className={styles.farmSection}>
            <h2 className={styles.sectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#22c55e" strokeWidth="2"/>
              </svg>
              About the Farm
            </h2>
            <h3 className={styles.farmName}>{product.farmerId?.farmName || 'Unknown Farm'}</h3>
            <p className={styles.farmDescription}>
              {product.farmerId?.description || 'A family-owned organic farm nestled in the valley, growing pesticide-free produce since 2005.'}
            </p>
            {product.distance && (
              <div className={styles.farmDistance}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {product.distance} km from your location
              </div>
            )}
          </div>

          {/* Ratings & Reviews */}
          <div className={styles.reviewsSection}>
            <h2 className={styles.sectionTitle}>Ratings & Reviews</h2>

            {/* Leave a Review */}
            <div className={styles.leaveReview}>
              <h3 className={styles.reviewTitle}>Leave a Review</h3>
              
              <form onSubmit={handleSubmitReview}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Your Rating</label>
                  {renderStars(rating, true, 32)}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Your Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Your Review</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Share your experience with this product..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>

            {/* Reviews List */}
            <div className={styles.reviewsList}>
              {reviews.length === 0 ? (
                <p className={styles.noReviews}>No reviews yet. Be the first to review this product!</p>
              ) : (
                reviews.map((review) => (
                  <div key={review._id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewerAvatar}>
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.reviewerName}>{review.userName}</div>
                        <div className={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className={styles.reviewRating}>
                        {renderStars(review.rating, false, 16)}
                      </div>
                    </div>
                    <p className={styles.reviewComment}>{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Cart Sidebar */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        setCart={setCart}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
      />
    </div>
  );
}
