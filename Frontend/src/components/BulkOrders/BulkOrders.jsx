import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header/Header';
import styles from './BulkOrders.module.css';
import { toast } from 'react-toastify';

export default function BulkOrders() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [selectedFarmerName, setSelectedFarmerName] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [productQuantities, setProductQuantities] = useState({});

  const categories = [
    'All',
    'Vegetables',
    'Fruits',
    'Meat & Poultry',
    'Fish & Seafood',
    'Dairy Products',
    'Bakery',
    'Grains & Cereals',
    'Pulses & Legumes',
    'Spices & Herbs',
    'Honey & Natural Products',
    'Seeds & Plants',
    'Dried Items',
    'Farm Essentials'
  ];

  // New discount structure: minimum 25kg required
  const bulkDiscounts = {
    25: 5,    // 25-50 kg: 5% discount
    50: 10,   // 50-100 kg: 10% discount
    100: 18   // 100+ kg: 18% discount
  };
  
  const MIN_BULK_ORDER = 25; // Minimum 25kg for bulk orders

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
    const savedCart = localStorage.getItem('bulkCart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    fetchFarmersAndProducts();
  }, [navigate]);

  const fetchFarmersAndProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch farmers
      const farmersResponse = await axios.get('/api/auth/farmers');
      if (farmersResponse.data.success) {
        setFarmers(farmersResponse.data.farmers || []);
        if (farmersResponse.data.farmers?.length > 0) {
          const firstFarmer = farmersResponse.data.farmers[0];
          setSelectedFarmer(firstFarmer._id);
          setSelectedFarmerName(firstFarmer.farmName);
        }
      }

      // Fetch products
      const productsResponse = await axios.get('/api/products');
      console.log('Products API Response:', productsResponse.data);
      
      if (productsResponse.data.success) {
        const productsList = productsResponse.data.products || [];
        console.log('Products loaded:', productsList.length);
        setProducts(productsList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    let filtered = products;

    if (selectedFarmer) {
      // Handle both string IDs and object IDs
      filtered = filtered.filter(p => {
        const productFarmerId = typeof p.farmerId === 'object' ? p.farmerId._id : p.farmerId;
        return productFarmerId === selectedFarmer;
      });
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.productName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getDiscountPercentage = () => {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    for (const [qty, discount] of Object.entries(bulkDiscounts).sort((a, b) => b[0] - a[0])) {
      if (totalQuantity >= parseInt(qty)) {
        return discount;
      }
    }
    return 0;
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
    const discountPercentage = getDiscountPercentage();
    const discountAmount = subtotal * (discountPercentage / 100);
    const total = subtotal - discountAmount;

    return { subtotal, discountAmount, discountPercentage, total };
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        );
      }

      return [...prevCart, product];
    });

    toast.success(`${product.productName} added to cart`);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item._id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity < MIN_BULK_ORDER) {
      toast.error(`Minimum bulk order is ${MIN_BULK_ORDER}kg. You have ${totalQuantity}kg in cart.`);
      return;
    }

    localStorage.setItem('bulkCart', JSON.stringify(cart));
    navigate('/bulk-checkout', { state: { cart, selectedFarmer } });
  };

  const filteredProducts = getFilteredProducts();
  const { subtotal, discountAmount, discountPercentage, total } = calculateTotals();

  if (loading) {
    return (
      <>
        <Header cart={cart} />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading bulk orders...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header cart={cart} />
      <div className={styles.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Order Fresh, Save More</h1>
            <p>Designed for hotels, restaurants & caterers. Get farm-to-table produce at wholesale rates with guaranteed freshness.</p>
            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <div className={styles.statValue}>48hr</div>
                <div className={styles.statLabel}>delivery SLA</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{farmers.length}+</div>
                <div className={styles.statLabel}>verified farmers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.contentWrapper}>
          <div className={styles.content}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
              <div className={styles.sidebarSection}>
                <h3>Choose a Farmer</h3>
                <p className={styles.sidebarSubtext}>You can bulk order from one farm at a time</p>
                
                <div className={styles.searchFarmers}>
                  <input
                    type="text"
                    placeholder="Search farmers"
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.farmerList}>
                  {farmers.map(farmer => {
                    const farmerProductCount = products.filter(p => {
                      const productFarmerId = typeof p.farmerId === 'object' ? p.farmerId._id : p.farmerId;
                      return productFarmerId === farmer._id;
                    }).length;

                    return (
                      <button
                        key={farmer._id}
                        className={`${styles.farmerCard} ${selectedFarmer === farmer._id ? styles.active : ''}`}
                        onClick={() => {
                          setSelectedFarmer(farmer._id);
                          setSelectedFarmerName(farmer.farmName);
                        }}
                      >
                        <div className={styles.farmerInitials}>
                          {farmer.farmName.split(' ').map(word => word[0]).join('').substring(0, 2)}
                        </div>
                        <div className={styles.farmerInfo}>
                          <div className={styles.farmerName}>{farmer.farmName}</div>
                          <div className={styles.farmerLocation}>{farmer.location}</div>
                          <div className={styles.farmerStatus}>
                            <span className={styles.verifiedBadge}>✓ Verified</span>
                            <span className={styles.productCount}>{farmerProductCount} products</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className={styles.main}>
              {/* Catalog Header */}
              <div className={styles.catalogHeader}>
                <div>
                  <h2>{selectedFarmerName}'s Bulk Catalogue</h2>
                  <p className={styles.catalogSubtext}>Bulk Catalog • 24km • {filteredProducts.length} products available</p>
                </div>
                
                {/* Category Tabs */}
                <div className={styles.categoryTabs}>
                  {categories.map(category => (
                    <button
                      key={category}
                      className={`${styles.categoryTab} ${selectedCategory === category ? styles.active : ''}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No products found. Try selecting a different farmer or category.</p>
                </div>
              ) : (
                <div className={styles.productsGrid}>
                  {filteredProducts.map(product => {
                    const discount = getDiscountPercentage();
                    const discountedPrice = product.pricePerUnit * (1 - discount / 100);
                    
                    return (
                      <div key={product._id} className={styles.productCard}>
                        <div className={styles.productImageContainer}>
                          {product.image && (
                            <img src={product.image} alt={product.productName} className={styles.productImage} />
                          )}
                          {discount > 0 && (
                            <div className={styles.discountBadge}>{discount}% off</div>
                          )}
                        </div>

                        <div className={styles.productContent}>
                          <h4 className={styles.productName}>{product.productName}</h4>
                          <p className={styles.productCategory}>{product.category}</p>

                          <div className={styles.priceSection}>
                            <div className={styles.priceRow}>
                              <span className={styles.priceLabel}>₹{discountedPrice.toFixed(0)}/{product.unit}</span>
                              {discount > 0 && (
                                <span className={styles.originalPrice}>₹{product.pricePerUnit}</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.quantityControl}>
                            <div className={styles.qtyInputGroup}>
                              <button
                                className={styles.qtyBtn}
                                onClick={() => {
                                  const current = productQuantities[product._id] || 0;
                                  if (current > 0) {
                                    setProductQuantities(prev => ({
                                      ...prev,
                                      [product._id]: current - 1
                                    }));
                                  }
                                }}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={productQuantities[product._id] || 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setProductQuantities(prev => ({
                                    ...prev,
                                    [product._id]: val
                                  }));
                                }}
                                className={styles.qtyInput}
                              />
                              <button
                                className={styles.qtyBtn}
                                onClick={() => {
                                  const current = productQuantities[product._id] || 0;
                                  setProductQuantities(prev => ({
                                    ...prev,
                                    [product._id]: current + 1
                                  }));
                                }}
                              >
                                +
                              </button>
                              <span className={styles.qtyUnit}>{product.unit}</span>
                            </div>
                          </div>

                          <button
                            className={styles.addBtn}
                            onClick={() => {
                              const qty = productQuantities[product._id] || 0;
                              if (qty > 0) {
                                addToCart({ ...product, quantity: qty });
                                setProductQuantities(prev => ({
                                  ...prev,
                                  [product._id]: 0
                                }));
                              } else {
                                toast.error('Please select a quantity');
                              }
                            }}
                          >
                            🛒 Added to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>

          {/* Cart Summary Sidebar */}
          {cart.length > 0 && (
            <aside className={styles.cartSummary}>
              <div className={styles.cartSummaryHeader}>
                <span className={styles.cartIcon}>🛒</span>
                <h3>Bulk Order Summary</h3>
              </div>

              <div className={styles.cartItemsList}>
                {cart.map((item, index) => (
                  <div key={item._id} className={styles.cartSummaryItem}>
                    <div className={styles.cartItemLeft}>
                      <span className={styles.cartItemEmoji}>🍅</span>
                      <div className={styles.cartItemInfo}>
                        <div className={styles.cartItemName}>{item.productName}</div>
                        <div className={styles.cartItemQty}>{item.quantity} {item.unit}</div>
                      </div>
                    </div>
                    <div className={styles.cartItemRight}>
                      <div className={styles.cartItemPrice}>₹{(item.pricePerUnit * item.quantity).toFixed(0)}</div>
                      <button
                        className={styles.cartRemoveBtn}
                        onClick={() => removeFromCart(item._id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount Information Section */}
              <div className={styles.discountInfoSection}>
                <div className={styles.discountTitle}>💰 Bulk Discount Tiers</div>
                <div className={styles.discountTiers}>
                  <div className={`${styles.discountTier} ${cart.reduce((sum, item) => sum + item.quantity, 0) >= 25 && cart.reduce((sum, item) => sum + item.quantity, 0) < 50 ? styles.active : ''}`}>
                    <div className={styles.tierRange}>25-50 kg</div>
                    <div className={styles.tierDiscount}>5% off</div>
                  </div>
                  <div className={`${styles.discountTier} ${cart.reduce((sum, item) => sum + item.quantity, 0) >= 50 && cart.reduce((sum, item) => sum + item.quantity, 0) < 100 ? styles.active : ''}`}>
                    <div className={styles.tierRange}>50-100 kg</div>
                    <div className={styles.tierDiscount}>10% off</div>
                  </div>
                  <div className={`${styles.discountTier} ${cart.reduce((sum, item) => sum + item.quantity, 0) >= 100 ? styles.active : ''}`}>
                    <div className={styles.tierRange}>100+ kg</div>
                    <div className={styles.tierDiscount}>18% off</div>
                  </div>
                </div>
              </div>

              {/* Minimum Order Warning */}
              {cart.reduce((sum, item) => sum + item.quantity, 0) < MIN_BULK_ORDER && (
                <div className={styles.minimumOrderWarning}>
                  <span className={styles.warningIcon}>⚠️</span>
                  <div className={styles.warningText}>
                    <div className={styles.warningTitle}>Minimum Order Required</div>
                    <div className={styles.warningMessage}>
                      Add {MIN_BULK_ORDER - cart.reduce((sum, item) => sum + item.quantity, 0)}kg more to reach minimum
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.cartSummaryTotals}>
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
                  <span>Delivery</span>
                  <span>₹120</span>
                </div>
                <div className={styles.totalRow + ' ' + styles.finalTotal}>
                  <span>Total</span>
                  <span>₹{(total + 120).toFixed(0)}</span>
                </div>
              </div>

              <button
                className={styles.confirmBtn}
                onClick={handleCheckout}
                disabled={cart.reduce((sum, item) => sum + item.quantity, 0) < MIN_BULK_ORDER}
              >
                {cart.reduce((sum, item) => sum + item.quantity, 0) < MIN_BULK_ORDER 
                  ? `Add ${MIN_BULK_ORDER - cart.reduce((sum, item) => sum + item.quantity, 0)}kg more`
                  : 'Confirm Bulk Order & Schedule Delivery ✓'}
              </button>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
