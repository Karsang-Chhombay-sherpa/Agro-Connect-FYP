import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../Header/Header";
import Cart from "../Cart/Cart";
import styles from "./Marketplace.module.css";
import { getUserLocation, saveUserLocation, getSavedLocation } from "../../utils/locationService";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [apiError, setApiError] = useState("");
  const [showNearbyOnly, setShowNearbyOnly] = useState(false); // Start with all products
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [customDistance, setCustomDistance] = useState(28); // Default 28 km
  const [showDistanceInput, setShowDistanceInput] = useState(false);
  const [subscribedFarmers, setSubscribedFarmers] = useState([]);
  const [subscriptionDiscount, setSubscriptionDiscount] = useState(null);
  const navigate = useNavigate();

  const categories = [
    "All Categories",
    "Vegetables",
    "Fruits",
    "Meat & Poultry",
    "Fish & Seafood",
    "Dairy Products",
    "Bakery",
    "Grains & Cereals",
    "Pulses & Legumes",
    "Spices & Herbs",
    "Honey & Natural Products",
    "Seeds & Plants",
    "Dried Items",
    "Farm Essentials",
  ];

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType === "farmer") {
      navigate("/farmer-dashboard");
      return;
    }

    setUser(parsedUser);

    // Load cart and wishlist from localStorage
    const savedCart = localStorage.getItem("cart");
    const savedWishlist = localStorage.getItem("wishlist");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      setCart([]); // Ensure cart is empty if no saved cart
    }
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

    // Check for saved location but don't auto-fetch
    const savedLocation = getSavedLocation();
    if (savedLocation) {
      setUserLocation(savedLocation);
    }

    fetchProducts();
  }, [navigate]);

  // Fetch user's active subscription and subscribed farmers
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      if (!user) return;

      try {
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
            setSubscriptionDiscount({
              percentage: discountPercentage,
              planName: activeSubscription.planName,
              planType: activeSubscription.planType
            });
            
            // Extract farmer IDs from subscription
            const farmerIds = activeSubscription.selectedFarmers.map(farmer => 
              typeof farmer === 'string' ? farmer : farmer._id
            );
            setSubscribedFarmers(farmerIds);
            
            console.log('Subscribed farmers:', farmerIds);
            console.log('Discount:', discountPercentage + '%');
          }
        }
      } catch (error) {
        console.error('Error fetching subscription info:', error);
      }
    };

    fetchSubscriptionInfo();
  }, [user]);

  // Add effect to listen for cart changes (e.g., when returning from payment)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      } else {
        setCart([]);
      }
    };

    const handleCartCleared = () => {
      console.log('Cart cleared event received');
      setCart([]);
    };

    // Listen for storage changes (when cart is cleared from another tab/page)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom cart cleared event
    window.addEventListener('cartCleared', handleCartCleared);
    
    // Also check on focus (when user returns to this tab)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartCleared', handleCartCleared);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Re-run search whenever products load or category changes
    handleSearch();
  }, [products, selectedCategory]);

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    let filtered = products;

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (q) {
      filtered = filtered.filter(p =>
        p.productName.toLowerCase().includes(q) ||
        (p.farmerId?.farmName && p.farmerId.farmName.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    setFilteredProducts(filtered);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setApiError("");
      
      let url = "/api/products"; // Default to all products
      
      // Only use nearby filter if enabled and we have user location
      if (showNearbyOnly && userLocation) {
        const maxDistance = customDistance * 1000; // Convert km to meters
        url = `/api/location/nearby-products?lat=${userLocation.latitude}&lng=${userLocation.longitude}&maxDistance=${maxDistance}`;
        console.log("Fetching nearby products from:", url, `(${customDistance} km)`);
      } else {
        console.log("Fetching all products from /api/products...");
      }
      
      const response = await axios.get(url);
      console.log("API Response:", response.data);

      if (response.data && response.data.success) {
        const productsList = response.data.products || [];
        console.log(`Successfully loaded ${productsList.length} products`);
        
        // Fetch ratings for all products
        const productsWithRatings = await Promise.all(
          productsList.map(async (product) => {
            try {
              const reviewResponse = await axios.get(`/api/reviews/product/${product._id}`);
              if (reviewResponse.data.success) {
                return {
                  ...product,
                  averageRating: parseFloat(reviewResponse.data.averageRating) || 0,
                  totalReviews: reviewResponse.data.totalReviews || 0
                };
              }
            } catch (error) {
              console.error(`Error fetching reviews for product ${product._id}:`, error);
            }
            return {
              ...product,
              averageRating: 0,
              totalReviews: 0
            };
          })
        );
        
        setProducts(productsWithRatings);

        // Check wishlist for back-in-stock notifications
        try {
          const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
          const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
          if (wishlist.length > 0 && currentUser) {
            const uid = currentUser._id || currentUser.id;
            const NOTIF_KEY = `userNotifications_${uid}`;
            const STOCK_KEY = `wishlistStockState_${uid}`;

            const prevStockState = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
            const newStockState = { ...prevStockState };
            const newNotifs = [];

            productsWithRatings.forEach(p => {
              if (!wishlist.includes(p._id)) return;
              const isNowAvailable = p.isAvailable && p.quantity > 0;
              const wasAvailable = prevStockState[p._id];
              newStockState[p._id] = isNowAvailable;

              // Only notify on out-of-stock → in-stock transition
              if (isNowAvailable && wasAvailable === false) {
                newNotifs.push({
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

            localStorage.setItem(STOCK_KEY, JSON.stringify(newStockState));

            if (newNotifs.length > 0) {
              const existing = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
              const updated = [...newNotifs, ...existing].slice(0, 50);
              localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
              window.dispatchEvent(new CustomEvent('notificationsUpdated'));
            }
          }
        } catch (e) { console.error('Notification check error:', e); }
        setApiError(""); // Clear any previous errors

        // Don't show error if no products - just show empty state message
        if (productsWithRatings.length === 0) {
          console.log(
            "No products found - this is normal if no products have been added yet."
          );
        }
      } else {
        console.error(
          "Failed to fetch products - invalid response:",
          response.data
        );
        setProducts([]);
        // Only show error if response structure is wrong, not if it's just empty
        if (response.data && !response.data.success) {
          setApiError(
            "Failed to load products. Please try refreshing the page."
          );
        } else {
          setApiError("");
        }
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);

      // Only show error for actual network/server errors, not 404s that might be normal
      if (err.response) {
        // If it's a 404, it might mean the route doesn't exist - show error
        // If it's a 500, show error
        if (err.response.status === 404 || err.response.status >= 500) {
          console.error(
            "Server error response:",
            err.response.status,
            err.response.data
          );
          setApiError(
            `Server error: ${
              err.response.data?.message ||
              err.response.statusText ||
              "Unknown error"
            }`
          );
        } else {
          // For other status codes, don't show error (might be normal)
          setApiError("");
        }
      } else if (err.request) {
        // Network error - definitely show this
        console.error("Network error - no response received:", err.request);
        setApiError(
          "Network error: Could not connect to server. Make sure the backend is running."
        );
      } else {
        // Request setup error - show this
        console.error("Error setting up request:", err.message);
        setApiError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if product is eligible for subscription discount
  const isProductDiscounted = (product) => {
    if (!subscriptionDiscount || !subscribedFarmers.length) return false;
    
    const productFarmerId = typeof product.farmerId === 'string' 
      ? product.farmerId 
      : product.farmerId?._id;
    
    return subscribedFarmers.includes(productFarmerId);
  };

  // Calculate discounted price
  const getDiscountedPrice = (product) => {
    if (!isProductDiscounted(product)) return null;
    
    const discount = (product.pricePerUnit * subscriptionDiscount.percentage) / 100;
    return product.pricePerUnit - discount;
  };

  const handleAddToCart = (product) => {
    // Check if product is out of stock
    if (product.quantity === 0) {
      toast.error('This product is currently out of stock.');
      return;
    }

    const existingItem = cart.find((item) => item._id === product._id);
    
    if (existingItem) {
      // Check if adding one more would exceed available stock
      if (existingItem.quantity >= product.quantity) {
        toast.error(`Only ${product.quantity} ${product.unit} available in stock.`);
        return;
      }
      
      const updatedCart = cart.map((item) =>
        item._id === product._id
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              availableStock: product.quantity // Update available stock
            }
          : item
      );
      setCart(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
    } else {
      const newCart = [...cart, { 
        ...product, 
        quantity: 1,
        availableStock: product.quantity // Store original stock for validation
      }];
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
    }
    
    // Show cart sidebar when item is added
    setIsCartOpen(true);
    toast.success(`Added ${product.productName} to cart!`);
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const updatedCart = cart.map((item) =>
      item._id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter((item) => item._id !== productId);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const handleToggleWishlist = (productId) => {    const isInWishlist = wishlist.includes(productId);
    let newWishlist;

    if (isInWishlist) {
      newWishlist = wishlist.filter((id) => id !== productId);
    } else {
      newWishlist = [...wishlist, productId];
    }

    setWishlist(newWishlist);
    localStorage.setItem("wishlist", JSON.stringify(newWishlist));
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    setLocationError("");
    
    try {
      const location = await getUserLocation();
      setUserLocation(location);
      saveUserLocation(location);
      setShowNearbyOnly(true); // Enable filter when location is obtained
      console.log("Location obtained:", location);
    } catch (error) {
      console.error("Location error:", error);
      setLocationError(error.message);
      setShowNearbyOnly(false);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleToggleNearby = async () => {
    if (!showNearbyOnly) {
      // Turning on nearby filter
      if (!userLocation) {
        await handleGetLocation();
      }
      setShowNearbyOnly(true);
      setShowDistanceInput(true); // Auto-show distance slider when nearby is enabled
    } else {
      // Turning off nearby filter - show all products
      setShowNearbyOnly(false);
      setShowDistanceInput(false);
    }
  };

  const handleDistanceChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 100) {
      setCustomDistance(value);
    }
  };

  const handleApplyDistance = () => {
    if (userLocation) {
      fetchProducts();
    }
  };

  // Fetch products when nearby filter or distance changes
  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [showNearbyOnly, customDistance]);

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>Loading products...</div>
        </div>
      </>
    );
  }

  return (
    <div className={styles.marketplace}>
      <Header 
        cart={cart} 
        onCartClick={() => setIsCartOpen(true)} 
      />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Local Marketplace</h1>

          {/* Location Distance Control */}
          <div className={styles.locationToggle}>
            <div className={styles.buttonRow}>
              {/* Show All Products Button */}
              <button 
                className={`${styles.filterBtn} ${!showNearbyOnly ? styles.active : ''}`}
                onClick={() => {
                  setShowNearbyOnly(false);
                  setShowDistanceInput(false);
                }}
              >
                Show All Products
              </button>
              
              {/* Nearby Farms Button */}
              <button 
                className={`${styles.filterBtn} ${showNearbyOnly ? styles.active : ''}`}
                onClick={handleToggleNearby}
                disabled={locationLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {locationLoading ? 'Getting location...' : `Nearby Farms (${customDistance} km)`}
              </button>
              
              {/* Distance Slider - Always visible when nearby is active */}
              {showNearbyOnly && showDistanceInput && (
                <>
                  <div className={styles.sliderIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12h18" stroke="#6b7280" strokeWidth="2"/>
                    </svg>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={customDistance}
                    onChange={handleDistanceChange}
                    className={styles.inlineSlider}
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customDistance}
                    onChange={handleDistanceChange}
                    className={styles.inlineInput}
                  />
                  <span className={styles.inlineUnit}>km</span>
                </>
              )}
            </div>
            
            {locationError && (
              <span className={styles.locationError}>
                {locationError}
              </span>
            )}
          </div>

          {/* Search and Filter */}
          <div className={styles.searchFilter}>
            <div className={styles.searchBar}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className={styles.searchIcon}
              >
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                type="text"
                placeholder="Search for fresh produce..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.clearSearchBtn}
                  onClick={() => { setSearchQuery(''); setFilteredProducts(products.filter(p => selectedCategory === 'All Categories' || p.category === selectedCategory)); }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                className={styles.searchBtn}
                onClick={handleSearch}
              >
                Search
              </button>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categoryFilter}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {apiError && (
            <div
              style={{
                padding: "16px",
                marginBottom: "24px",
                background: "#fef2f2",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                color: "#ef4444",
              }}
            >
              <strong>Error:</strong> {apiError}
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className={styles.emptyState}>
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              {products.length === 0 ? (
                <div>
                  <p
                    style={{
                      fontSize: "18px",
                      marginBottom: "8px",
                      fontWeight: "600",
                    }}
                  >
                    No products available yet.
                  </p>
                  <p style={{ color: "#6b7280" }}>
                    Check back later or ask farmers to add products!
                  </p>
                </div>
              ) : (
                <p>
                  No products found matching your search or filters. Try
                  adjusting your search or filters.
                </p>
              )}
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {filteredProducts.map((product) => {
                const isInWishlist = wishlist.includes(product._id);
                const distance = product.distance; // Use actual distance from API, or undefined
                const rating = product.averageRating || 0;
                const reviewCount = product.totalReviews || 0;
                const hasDiscount = isProductDiscounted(product);
                const discountedPrice = getDiscountedPrice(product);

                return (
                  <div 
                    key={product._id} 
                    className={styles.productCard}
                    onClick={() => navigate(`/product/${product._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Subscription Discount Badge */}
                    {hasDiscount && (
                      <div className={styles.discountBadge}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: '4px' }}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="white"/>
                        </svg>
                        {subscriptionDiscount.percentage}% OFF
                      </div>
                    )}
                    
                    {/* Stock Status Badge */}
                    {product.quantity > 0 ? (
                      <div className={hasDiscount ? styles.availabilityBadgeWithDiscount : styles.availabilityBadge}>
                        {product.quantity} {product.unit} available
                      </div>
                    ) : (
                      <div className={styles.outOfStockBadge}>
                        Out of Stock
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      className={`${styles.wishlistBtn} ${
                        isInWishlist ? styles.wishlistActive : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist(product._id);
                      }}
                      title={
                        isInWishlist
                          ? "Remove from wishlist"
                          : "Add to wishlist"
                      }
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={isInWishlist ? "#ef4444" : "none"}
                      >
                        <path
                          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill={isInWishlist ? "#ef4444" : "none"}
                        />
                      </svg>
                    </button>

                    {/* Product Image */}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.productName}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>
                        <svg
                          width="60"
                          height="60"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            stroke="#9ca3af"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Product Info */}
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>
                        {product.productName}
                      </h3>

                      <div className={styles.productMeta}>
                        {distance && (
                          <div className={styles.location}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <circle
                                cx="12"
                                cy="10"
                                r="3"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                            <span>{distance} km away</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.farmName}>
                        From {product.farmerId?.farmName || "Unknown Farm"}
                      </div>

                      <div className={styles.productPrice}>
                        {hasDiscount ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '18px' }}>
                                ₹{discountedPrice.toFixed(2)}
                              </span>
                              <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '14px' }}>
                                ₹{product.pricePerUnit}
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              per {product.unit}
                            </span>
                          </div>
                        ) : (
                          <>₹{product.pricePerUnit} / {product.unit}</>
                        )}
                      </div>

                      <div className={styles.productRating}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="#fbbf24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>
                          {rating > 0 ? `${rating.toFixed(1)} (${reviewCount})` : 'No reviews yet'}
                        </span>
                      </div>

                      <button
                        className={`${styles.addToCartBtn} ${product.quantity === 0 ? styles.outOfStockBtn : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={product.quantity === 0}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
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
                        {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
