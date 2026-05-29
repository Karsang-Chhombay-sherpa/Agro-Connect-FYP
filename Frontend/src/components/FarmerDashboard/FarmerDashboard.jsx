import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./FarmerDashboard.module.css";
import { toast } from 'react-toastify';
import FarmerHeader from '../Header/FarmerHeader';
import OrderManagement from '../OrderManagement/OrderManagement';
import FarmerWallet from '../FarmerWallet/FarmerWallet';
import Analytics from '../Analytics/Analytics';
import FarmerSubscriptions from '../FarmerSubscriptions/FarmerSubscriptions';
import FarmerBulkOrders from '../FarmerBulkOrders/FarmerBulkOrders';

export default function FarmerDashboard() {
  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // New state for tab management
  const [formData, setFormData] = useState({
    productName: "",
    quantity: "",
    unit: "kg",
    pricePerUnit: "",
    description: "",
    category: "Vegetables",
    image: ""
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState({ open: false, productId: null });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(userData);
    if (user.userType !== "farmer") {
      navigate("/dashboard");
      return;
    }

    setFarmer(user);
    fetchProducts(user._id);
  }, [navigate]);

  const fetchProducts = async (farmerId) => {
    try {
      setLoading(true);
      // Clean up any existing duplicates first
      await axios.post(`/api/products/cleanup-duplicates/${farmerId}`).catch(() => {});
      const response = await axios.get(`/api/products/farmer/${farmerId}`);
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file.");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData({ ...formData, image: base64String });
        setImagePreview(base64String);
        setError("");
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.productName || !formData.quantity || !formData.pricePerUnit) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      // Prepare the data to send
      const productData = {
        farmerId: farmer._id,
        productName: formData.productName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        description: formData.description || "",
        category: formData.category || "Vegetables",
        image: formData.image || ""
      };

      const response = await axios.post("/api/products", productData, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.data.success) {
        if (response.data.updated) {
          // Duplicate — update the existing product in the list
          setProducts(products.map(p => p._id === response.data.product._id ? response.data.product : p));
          toast.info(`"${response.data.product.productName}" already exists — price and quantity updated.`);
        } else {
          setProducts([response.data.product, ...products]);
          toast.success("Product added successfully!");
        }
        resetForm();
        setShowAddForm(false);
      }
    } catch (err) {
      console.error("Add product error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to add product. Please try again.";
      setError(errorMessage);
      
      // Show more detailed error if available
      if (err.response?.data?.error) {
        console.error("Server error details:", err.response.data.error);
      }
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      productName: product.productName,
      quantity: product.quantity.toString(),
      unit: product.unit,
      pricePerUnit: product.pricePerUnit.toString(),
      description: product.description || "",
      category: product.category || "Vegetables",
      image: product.image || ""
    });
    setImagePreview(product.image || null);
    setShowAddForm(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.productName || !formData.quantity || !formData.pricePerUnit) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      // Prepare the data to send
      const productData = {
        productName: formData.productName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        description: formData.description || "",
        category: formData.category || "Vegetables",
        image: formData.image || ""
      };

      const response = await axios.put(`/api/products/${editingProduct._id}`, productData, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.data.success) {
        setProducts(products.map(p => p._id === editingProduct._id ? response.data.product : p));
        resetForm();
        setShowAddForm(false);
        setEditingProduct(null);
      }
    } catch (err) {
      console.error("Update product error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to update product. Please try again.";
      setError(errorMessage);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setConfirmModal({ open: true, productId });
  };

  const confirmDelete = async () => {
    const productId = confirmModal.productId;
    setConfirmModal({ open: false, productId: null });

    try {
      const response = await axios.delete(`/api/products/${productId}`);
      if (response.data.success) {
        setProducts(products.filter(p => p._id !== productId));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product. Please try again.");
    }
  };

  const toggleProductAvailability = async (product) => {
    try {
      const response = await axios.put(`/api/products/${product._id}`, {
        isAvailable: !product.isAvailable
      });
      if (response.data.success) {
        setProducts(products.map(p => p._id === product._id ? response.data.product : p));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update product availability.");
    }
  };

  const resetForm = () => {
    setFormData({
      productName: "",
      quantity: "",
      unit: "kg",
      pricePerUnit: "",
      description: "",
      category: "Vegetables",
      image: ""
    });
    setImagePreview(null);
    setError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (loading && !farmer) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!farmer) return null;

  return (
    <>
    <div className={styles.dashboard}>
      {/* Use the new FarmerHeader component */}
      <FarmerHeader activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className={styles.container}>
        {/* Main Content - Conditional based on active tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Hero Section with Profile */}
            <div className={styles.heroSection}>
              <div className={styles.heroContent}>
                <div className={styles.profileSection}>
                  <div className={styles.profilePicture}>
                    {farmer.profilePicture ? (
                      <div className={styles.profilePlaceholder} style={{ backgroundImage: `url(${farmer.profilePicture})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0 }}>
                          <circle cx="40" cy="30" r="15" stroke="white" strokeWidth="2" fill="none"/>
                          <path d="M20 65 Q20 50 40 50 Q60 50 60 65" stroke="white" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    ) : (
                      <div className={styles.profilePlaceholder}>
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="40" cy="30" r="15" stroke="white" strokeWidth="2" fill="none"/>
                          <path d="M20 65 Q20 50 40 50 Q60 50 60 65" stroke="white" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.farmInfo}>
                    <h1 className={styles.farmName}>{farmer.farmName}</h1>
                    <p className={styles.farmDescription}>
                      {farmer.description || "Fresh organic vegetables grown with love and care. Family-owned farm serving the community for over 15 years."}
                    </p>
                    <div className={styles.farmLocation}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span>{farmer.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsSection}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{products.length}</div>
                    <div className={styles.statLabel}>Total Products</div>
                  </div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{products.filter(p => p.isAvailable).length}</div>
                    <div className={styles.statLabel}>Available Products</div>
                  </div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{products.filter(p => !p.isAvailable).length}</div>
                    <div className={styles.statLabel}>Out of Stock</div>
                  </div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>₹{products.reduce((sum, p) => sum + (p.pricePerUnit * p.quantity), 0).toFixed(0)}</div>
                    <div className={styles.statLabel}>Total Inventory Value</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className={styles.productsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>My Products</h2>
                <button
                  onClick={() => {
                    resetForm();
                    setEditingProduct(null);
                    setShowAddForm(!showAddForm);
                  }}
                  className={styles.addBtn}
                >
                  {showAddForm ? "Cancel" : "+ Add Product"}
                </button>
              </div>

              {/* Add/Edit Product Form */}
              {showAddForm && (
                <div className={styles.formCard}>
                  <h3 className={styles.formTitle}>
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h3>
                  <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Product Name *</label>
                        <input
                          type="text"
                          name="productName"
                          className={styles.input}
                          value={formData.productName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Quantity *</label>
                        <input
                          type="number"
                          name="quantity"
                          className={styles.input}
                          value={formData.quantity}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Unit *</label>
                        <select
                          name="unit"
                          className={styles.input}
                          value={formData.unit}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="kg">kg</option>
                          <option value="liter">liter</option>
                          <option value="piece">piece</option>
                          <option value="dozen">dozen</option>
                          <option value="box">box</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Price per {formData.unit} *</label>
                        <input
                          type="number"
                          name="pricePerUnit"
                          className={styles.input}
                          value={formData.pricePerUnit}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Category</label>
                        <select
                          name="category"
                          className={styles.input}
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="Vegetables">Vegetables</option>
                          <option value="Fruits">Fruits</option>
                          <option value="Meat & Poultry">Meat & Poultry</option>
                          <option value="Fish & Seafood">Fish & Seafood</option>
                          <option value="Dairy Products">Dairy Products</option>
                          <option value="Bakery">Bakery</option>
                          <option value="Grains & Cereals">Grains & Cereals</option>
                          <option value="Pulses & Legumes">Pulses & Legumes</option>
                          <option value="Spices & Herbs">Spices & Herbs</option>
                          <option value="Honey & Natural Products">Honey & Natural Products</option>
                          <option value="Seeds & Plants">Seeds & Plants</option>
                          <option value="Farm Essentials">Farm Essentials</option>
                        </select>
                      </div>

                      <div className={styles.formGroupFull}>
                        <label className={styles.label}>Product Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className={styles.input}
                          style={{ padding: "8px" }}
                        />
                        {imagePreview && (
                          <div style={{ marginTop: "12px" }}>
                            <img
                              src={imagePreview}
                              alt="Product preview"
                              style={{
                                maxWidth: "200px",
                                maxHeight: "200px",
                                borderRadius: "8px",
                                border: "1px solid #ddd",
                                objectFit: "cover"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImagePreview(null);
                                setFormData({ ...formData, image: "" });
                              }}
                              style={{
                                marginTop: "8px",
                                padding: "6px 12px",
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              Remove Image
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={styles.formGroupFull}>
                        <label className={styles.label}>Description</label>
                        <textarea
                          name="description"
                          className={styles.textarea}
                          value={formData.description}
                          onChange={handleInputChange}
                          rows="3"
                          placeholder="Add product description..."
                        />
                      </div>
                    </div>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.submitBtn}>
                        {editingProduct ? "Update Product" : "Add Product"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Products List */}
              {loading ? (
                <div className={styles.loading}>Loading products...</div>
              ) : products.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No products added yet. Click "Add Product" to get started!</p>
                </div>
              ) : (
                <div className={styles.productsGrid}>
                  {products.map((product) => (
                    <div key={product._id} className={styles.productCard}>
                      {product.image && (
                        <div style={{ marginBottom: "12px" }}>
                          <img
                            src={product.image}
                            alt={product.productName}
                            style={{
                              width: "100%",
                              height: "200px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid #ddd"
                            }}
                          />
                        </div>
                      )}
                      <div className={styles.productHeader}>
                        <h3 className={styles.productName}>{product.productName}</h3>
                        <div className={styles.productActions}>
                          <button
                            onClick={() => toggleProductAvailability(product)}
                            className={`${styles.statusBtn} ${product.isAvailable ? styles.available : styles.unavailable}`}
                            title={product.isAvailable ? "Mark as unavailable" : "Mark as available"}
                          >
                            {product.isAvailable ? "✓" : "✗"}
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className={styles.editBtn}
                            title="Edit product"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className={styles.deleteBtn}
                            title="Delete product"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className={styles.productDetails}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Quantity:</span>
                          <span className={styles.detailValue}>
                            {product.quantity} {product.unit}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Price:</span>
                          <span className={styles.detailValue}>
                            ₹{product.pricePerUnit} / {product.unit}
                          </span>
                        </div>
                        {product.category && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Category:</span>
                            <span className={styles.detailValue}>{product.category}</span>
                          </div>
                        )}
                        {product.description && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Description:</span>
                            <span className={styles.detailValue}>{product.description}</span>
                          </div>
                        )}
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Status:</span>
                          <span className={`${styles.statusBadge} ${product.isAvailable ? styles.available : styles.unavailable}`}>
                            {product.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <Analytics />
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <OrderManagement />
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <FarmerSubscriptions />
        )}

        {/* Bulk Orders Tab */}
        {activeTab === 'bulk-orders' && (
          <FarmerBulkOrders />
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <FarmerWallet />
        )}
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    {confirmModal.open && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}>
        <div style={{
          background: 'white', borderRadius: '16px', padding: '32px',
          maxWidth: '400px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', background: '#fef2f2', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
              Delete Product
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setConfirmModal({ open: false, productId: null })}
              style={{
                flex: 1, padding: '12px', background: 'white', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{
                flex: 1, padding: '12px', background: '#ef4444', color: 'white',
                border: 'none', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

