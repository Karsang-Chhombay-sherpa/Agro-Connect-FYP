import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './OrderManagement.module.css';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    delivered: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('Please login to view orders');
        return;
      }

      const user = JSON.parse(userData);
      if (user.userType !== 'farmer') {
        setError('Access denied. Farmer account required.');
        return;
      }

      console.log(`Fetching orders for farmer: ${user._id} with status filter: ${selectedStatus}`);

      const response = await axios.get(`/api/orders/farmer/${user._id}?status=${selectedStatus}`, {
        timeout: 10000
      });
      
      console.log('Orders fetch response:', response.data);

      if (response.data.success) {
        console.log('Setting orders:', response.data.orders.length);
        console.log('Setting counts:', response.data.counts);
        setOrders(response.data.orders);
        setCounts(response.data.counts);
        console.log(`Loaded ${response.data.orders.length} orders`);
      } else {
        setError(response.data.message || 'Failed to fetch orders');
      }

    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        setError('Request timeout. Please check your connection and try again.');
      } else {
        setError('Failed to fetch orders. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId); // Set loading state for this specific order
      setError(''); // Clear any previous errors
      console.log(`Updating order ${orderId} to status: ${newStatus}`);
      
      const userData = localStorage.getItem('user');
      if (!userData) {
        toast.error('Please login to update order status');
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('User data:', { userId: user._id, userType: user.userType });

      // Optimistically update the UI first for better user experience
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );

      // Update counts optimistically
      setCounts(prevCounts => {
        const newCounts = { ...prevCounts };
        
        // Find the current order to get its current status
        const currentOrder = orders.find(order => order.orderId === orderId);
        if (currentOrder) {
          // Decrease count for old status
          if (newCounts[currentOrder.status] > 0) {
            newCounts[currentOrder.status]--;
          }
          // Increase count for new status
          newCounts[newStatus]++;
        }
        
        return newCounts;
      });

      const response = await axios.patch(`/api/orders/${orderId}/status`, {
        status: newStatus,
        farmerId: user._id
      }, {
        timeout: 10000
      });

      console.log('Order status update response:', response.data);

      if (response.data.success) {
        console.log('Order status updated successfully on server');
        console.log('Updated order details:', response.data.order);
        
        // Refresh orders to ensure data consistency
        await fetchOrders();
        
        // Show success message
        const statusMessages = {
          'confirmed': 'Order confirmed successfully!',
          'delivered': 'Order marked as delivered!',
          'cancelled': 'Order cancelled successfully!'
        };
        toast.success(statusMessages[newStatus] || `Order status updated to "${newStatus}" successfully!`);
      } else {
        console.error('Failed to update order status:', response.data);
        // Revert optimistic update on failure
        await fetchOrders();
        toast.error(response.data.message || 'Failed to update order status');
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      
      // Revert optimistic update on error
      await fetchOrders();
      
      if (error.response) {
        console.error('Server error response:', error.response.data);
        toast.error(error.response.data.message || `Server error: ${error.response.status}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error('Network error: Could not connect to server');
      } else {
        console.error('Request setup error:', error.message);
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setUpdatingOrderId(null); // Clear loading state
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'confirmed': return styles.statusConfirmed;
      case 'delivered': return styles.statusDelivered;
      case 'cancelled': return styles.statusCancelled;
      default: return styles.statusPending;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading orders...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Order Management</h1>
          <p className={styles.subtitle}>View and manage your incoming orders</p>
        </div>
        <div className={styles.filterContainer}>
          <button
            onClick={fetchOrders}
            className={styles.refreshBtn}
            disabled={loading}
            title="Refresh orders"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.statusFilter}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Status Cards */}
      <div className={styles.statusCards}>
        <div className={`${styles.statusCard} ${styles.totalCard}`}>
          <div className={styles.cardNumber}>{counts.total}</div>
          <div className={styles.cardLabel}>Total</div>
        </div>
        <div className={`${styles.statusCard} ${styles.pendingCard}`}>
          <div className={styles.cardNumber}>{counts.pending}</div>
          <div className={styles.cardLabel}>Pending</div>
        </div>
        <div className={`${styles.statusCard} ${styles.confirmedCard}`}>
          <div className={styles.cardNumber}>{counts.confirmed}</div>
          <div className={styles.cardLabel}>Confirmed</div>
        </div>
        <div className={`${styles.statusCard} ${styles.deliveredCard}`}>
          <div className={styles.cardNumber}>{counts.delivered}</div>
          <div className={styles.cardLabel}>Delivered</div>
        </div>
        <div className={`${styles.statusCard} ${styles.cancelledCard}`}>
          <div className={styles.cardNumber}>{counts.cancelled}</div>
          <div className={styles.cardLabel}>Cancelled</div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Orders List */}
      <div className={styles.ordersContainer}>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
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
            <p>No orders found</p>
            <span>Orders will appear here when customers place them</span>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className={`${styles.orderCard} ${updatingOrderId === order.orderId ? styles.updating : ''}`}>
              {/* Order Header */}
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <div className={styles.orderId}>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className={styles.orderNumber}>{order.orderId}</span>
                  </div>
                  <div className={styles.customerInfo}>
                    <span className={styles.customerName}>{order.customerName}</span>
                    <span className={styles.customerPhone}>• {order.primaryMobile}</span>
                    {order.secondaryMobile && (
                      <span className={styles.customerPhone}>• {order.secondaryMobile}</span>
                    )}
                  </div>
                </div>
                <div className={styles.orderTotal}>
                  ₹{order.subtotal.toFixed(0)}
                </div>
              </div>

              {/* Order Items */}
              <div className={styles.orderItems}>
                {order.items.map((item, index) => (
                  <div key={index} className={styles.orderItem}>
                    <span className={styles.itemName}>
                      {item.productName} • {item.quantity} {item.unit}
                    </span>
                    <span className={styles.itemPrice}>
                      ₹{item.totalPrice.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Details */}
              <div className={styles.orderDetails}>
                <div className={styles.detailItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Order Date</span>
                    <span className={styles.detailValue}>{formatDate(order.orderDate)}</span>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Delivery Date</span>
                    <span className={styles.detailValue}>{formatDate(order.deliveryDate)}</span>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Slot</span>
                    <span className={styles.detailValue}>{order.deliveryTimeSlot}</span>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Address</span>
                    <span className={styles.detailValue}>{order.deliveryAddress}</span>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="7" width="20" height="10" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 12h.01M17 12h.01" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Payment</span>
                    <span className={`${styles.detailValue} ${order.paymentMethod === 'esewa' ? styles.paidOnline : styles.cashOnDelivery}`}>
                      {order.paymentMethod === 'esewa' ? 'Paid Online' : 'Cash on Delivery'}
                      {order.paymentStatus === 'paid' && (
                        <span className={styles.paidBadge}> ✓</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.orderActions}>
                {order.status === 'pending' && (
                  <>
                    <button
                      className={`${styles.actionBtn} ${styles.confirmBtn} ${updatingOrderId === order.orderId ? styles.updating : ''}`}
                      onClick={() => updateOrderStatus(order.orderId, 'confirmed')}
                      disabled={updatingOrderId === order.orderId}
                    >
                      {updatingOrderId === order.orderId ? (
                        <span className={styles.loadingSpinner}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                            </circle>
                          </svg>
                          Confirming...
                        </span>
                      ) : 'Confirm'}
                    </button>
                    {/* Only show cancel button for cash on delivery orders */}
                    {order.paymentMethod === 'cash' ? (
                      <button
                        className={`${styles.actionBtn} ${styles.cancelBtn} ${updatingOrderId === order.orderId ? styles.updating : ''}`}
                        onClick={() => updateOrderStatus(order.orderId, 'cancelled')}
                        disabled={updatingOrderId === order.orderId}
                      >
                        {updatingOrderId === order.orderId ? (
                          <span className={styles.loadingSpinner}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                            Cancelling...
                          </span>
                        ) : 'Cancel'}
                      </button>
                    ) : (
                      <div className={styles.paymentInfo}>
                        <span className={styles.paidLabel}>
                          ✓ Paid Online - Cannot Cancel
                        </span>
                      </div>
                    )}
                  </>
                )}
                {order.status === 'confirmed' && (
                  <button
                    className={`${styles.actionBtn} ${styles.deliveredBtn} ${updatingOrderId === order.orderId ? styles.updating : ''}`}
                    onClick={() => updateOrderStatus(order.orderId, 'delivered')}
                    disabled={updatingOrderId === order.orderId}
                  >
                    {updatingOrderId === order.orderId ? (
                      <span className={styles.loadingSpinner}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                          </circle>
                        </svg>
                        Updating...
                      </span>
                    ) : 'Mark as Delivered'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}