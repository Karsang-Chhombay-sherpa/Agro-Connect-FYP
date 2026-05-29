import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './FarmerBulkOrders.module.css';
import { toast } from 'react-toastify';

export default function FarmerBulkOrders() {
  const [bulkOrders, setBulkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [farmer, setFarmer] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setFarmer(user);
      fetchBulkOrders(user._id);
    }
  }, []);

  const fetchBulkOrders = async (farmerId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/bulk-orders/farmer/${farmerId}`);
      
      if (response.data.success) {
        setBulkOrders(response.data.data || []);
      } else {
        toast.error('Failed to load bulk orders');
      }
    } catch (error) {
      console.error('Error fetching bulk orders:', error);
      toast.error('Error loading bulk orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (farmer) {
      fetchBulkOrders(farmer._id);
    }
  };

  const getFilteredOrders = () => {
    if (filterStatus === 'All') return bulkOrders;
    return bulkOrders.filter(order => order.status === filterStatus);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.patch(`/api/bulk-orders/${orderId}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        setBulkOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#3b82f6';
      case 'processing':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading bulk orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Bulk Orders Management</h2>
          <p className={styles.subtitle}>View and manage your bulk orders</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={handleRefresh}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 03.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
          <select 
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Stats Section */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statNumber}>{bulkOrders.length}</div>
          <div className={styles.statLabel}>TOTAL</div>
        </div>
        <div className={`${styles.statCard} ${styles.pending}`}>
          <div className={styles.statNumber}>{bulkOrders.filter(o => o.status === 'pending').length}</div>
          <div className={styles.statLabel}>PENDING</div>
        </div>
        <div className={`${styles.statCard} ${styles.confirmed}`}>
          <div className={styles.statNumber}>{bulkOrders.filter(o => o.status === 'confirmed').length}</div>
          <div className={styles.statLabel}>CONFIRMED</div>
        </div>
        <div className={`${styles.statCard} ${styles.delivered}`}>
          <div className={styles.statNumber}>{bulkOrders.filter(o => o.status === 'delivered').length}</div>
          <div className={styles.statLabel}>DELIVERED</div>
        </div>
        <div className={`${styles.statCard} ${styles.cancelled}`}>
          <div className={styles.statNumber}>{bulkOrders.filter(o => o.status === 'cancelled').length}</div>
          <div className={styles.statLabel}>CANCELLED</div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No bulk orders found</p>
        </div>
      ) : (
        <div className={styles.ordersGrid}>
          {filteredOrders.map(order => (
            <div key={order._id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <h3 className={styles.orderTitle}>Order #{order.orderId}</h3>
                  <p className={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </div>
              </div>

              <div className={styles.customerInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Customer:</span>
                  <span className={styles.value}>{order.deliveryInfo?.fullName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Email:</span>
                  <span className={styles.value}>{order.deliveryInfo?.email}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Phone:</span>
                  <span className={styles.value}>{order.deliveryInfo?.phoneNumber}</span>
                </div>
              </div>

              <div className={styles.deliveryInfo}>
                <h4>Delivery Details</h4>
                <p>
                  {order.deliveryInfo?.streetAddress}, {order.deliveryInfo?.area}, {order.deliveryInfo?.city}
                </p>
                <p className={styles.deliveryDate}>
                  Scheduled: {new Date(order.schedule?.startDate).toLocaleDateString()} - {order.schedule?.timeSlot}
                </p>
              </div>

              <div className={styles.itemsList}>
                <h4>Items ({order.items?.length})</h4>
                {order.items?.map((item, idx) => (
                  <div key={idx} className={styles.item}>
                    <span>{item.productName}</span>
                    <span className={styles.itemQty}>{item.quantity} {item.unit}</span>
                    <span className={styles.itemPrice}>₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              <div className={styles.pricingInfo}>
                <div className={styles.priceRow}>
                  <span>Subtotal:</span>
                  <span>₹{order.pricing?.subtotal}</span>
                </div>
                {order.pricing?.discountPercentage > 0 && (
                  <div className={styles.priceRow}>
                    <span>Discount ({order.pricing?.discountPercentage}%):</span>
                    <span>-₹{order.pricing?.discountAmount}</span>
                  </div>
                )}
                <div className={styles.priceRow}>
                  <span>Delivery:</span>
                  <span>₹{order.pricing?.deliveryCharge}</span>
                </div>
                <div className={styles.priceRow + ' ' + styles.total}>
                  <span>Total:</span>
                  <span>₹{order.pricing?.totalAmount}</span>
                </div>
              </div>

              <div className={styles.paymentStatus}>
                <span className={styles.label}>Payment:</span>
                <span
                  className={styles.paymentBadge}
                  style={{
                    backgroundColor: order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b'
                  }}
                >
                  {order.paymentStatus?.toUpperCase()}
                </span>
              </div>

              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className={styles.actions}>
                  {order.status === 'pending' && (
                    <button
                      className={styles.actionBtn + ' ' + styles.confirmBtn}
                      onClick={() => updateOrderStatus(order._id, 'confirmed')}
                    >
                      Confirm Order
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      className={styles.actionBtn + ' ' + styles.processBtn}
                      onClick={() => updateOrderStatus(order._id, 'processing')}
                    >
                      Mark as Processing
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      className={styles.actionBtn + ' ' + styles.deliverBtn}
                      onClick={() => updateOrderStatus(order._id, 'delivered')}
                    >
                      Mark as Delivered
                    </button>
                  )}
                  <button
                    className={styles.actionBtn + ' ' + styles.cancelBtn}
                    onClick={() => updateOrderStatus(order._id, 'cancelled')}
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
