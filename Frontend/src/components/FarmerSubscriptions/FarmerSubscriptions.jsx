import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './FarmerSubscriptions.module.css';

export default function FarmerSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [farmer, setFarmer] = useState(null);
  const [expandedSub, setExpandedSub] = useState(null);
  const [dailySelections, setDailySelections] = useState({});
  const [loadingSelections, setLoadingSelections] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, label }
  const [confirmComplete, setConfirmComplete] = useState(null); // { id, label }

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setFarmer(user);
      fetchSubscriptions(user._id);
    }
  }, []);

  const fetchSubscriptions = async (farmerId) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/subscriptions/farmer/' + farmerId);
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySelections = async (subscriptionId) => {
    if (dailySelections[subscriptionId]) return; // already loaded
    try {
      setLoadingSelections(prev => ({ ...prev, [subscriptionId]: true }));
      const res = await axios.get(`/api/subscriptions/${subscriptionId}/daily-selections`);
      if (res.data.success) {
        setDailySelections(prev => ({ ...prev, [subscriptionId]: res.data.dailySelections || [] }));
      }
    } catch (err) {
      console.error('Error fetching daily selections:', err);
      setDailySelections(prev => ({ ...prev, [subscriptionId]: [] }));
    } finally {
      setLoadingSelections(prev => ({ ...prev, [subscriptionId]: false }));
    }
  };

  const toggleExpand = (subscriptionId) => {
    if (expandedSub === subscriptionId) {
      setExpandedSub(null);
    } else {
      setExpandedSub(subscriptionId);
      fetchDailySelections(subscriptionId);
    }
  };

  const handleMarkCompleted = async (subscriptionId, subscriptionLabel) => {
    setConfirmComplete({ id: subscriptionId, label: subscriptionLabel });
  };

  const confirmCompleteAction = async () => {
    if (!confirmComplete) return;
    try {
      await axios.patch(`/api/subscriptions/${confirmComplete.id}/status`, { status: 'completed' });
      setSubscriptions(prev => prev.map(s =>
        s._id === confirmComplete.id ? { ...s, status: 'completed' } : s
      ));
      toast.success('Subscription marked as completed. Invoice sent to customer!');
    } catch (err) {
      toast.error('Failed to complete subscription. Please try again.');
    } finally {
      setConfirmComplete(null);
    }
  };

  const handleDelete = async (subscriptionId, subscriptionLabel) => {
    setConfirmDelete({ id: subscriptionId, label: subscriptionLabel });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await axios.delete(`/api/subscriptions/${confirmDelete.id}`);
      setSubscriptions(prev => prev.filter(s => s._id !== confirmDelete.id));
      if (expandedSub === confirmDelete.id) setExpandedSub(null);
      toast.success('Subscription deleted successfully');
    } catch (err) {
      toast.error('Failed to delete subscription. Please try again.');
    } finally {
      setConfirmDelete(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isToday = (dateString) => new Date(dateString).toDateString() === new Date().toDateString();
  const isTomorrow = (dateString) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(dateString).toDateString() === tomorrow.toDateString();
  };
  const isPast = (dateString) => new Date(dateString) < new Date() && !isToday(dateString);

  const getStatusColor = (status) => ({
    active: '#22c55e', pending: '#f59e0b', completed: '#6b7280',
    cancelled: '#ef4444', paused: '#3b82f6'
  }[status] || '#6b7280');

  const filteredSubscriptions = subscriptions.filter(sub =>
    filter === 'all' ? true : sub.status === filter
  );

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    completed: subscriptions.filter(s => s.status === 'completed').length,
    totalRevenue: subscriptions
      .filter(s => s.status === 'active' || s.status === 'completed')
      .reduce((sum, s) => sum + (s.farmerAmount || s.totalAmount), 0)
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading subscriptions...</div></div>;
  }

  return (
    <div className={styles.container}>
      {/* Confirm Complete Modal */}
      {confirmComplete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '52px', height: '52px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="22 4 12 14.01 9 11.01" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>Mark as Completed</h3>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              Mark <strong>{confirmComplete.label}</strong> as completed?
            </p>
            <div style={{ margin: '0 0 24px', fontSize: '13px', color: '#166534', textAlign: 'center', background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #86efac' }}>
              An invoice will be automatically sent to the customer's email with a full breakdown of products received and the discounted total.
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmComplete(null)}
                style={{ flex: 1, padding: '12px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={confirmCompleteAction}
                style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Complete & Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '52px', height: '52px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 6l-1 14H6L5 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 6V4h6v2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>Delete Subscription</h3>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              Are you sure you want to delete
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'center' }}>
              {confirmDelete.label}?
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#ef4444', textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '12px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={confirmDeleteAction}
                style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Subscription Orders</h1>
          <p className={styles.subtitle}>Manage your recurring subscription deliveries</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dbeafe' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#3b82f6" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="#3b82f6" strokeWidth="2"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Subscriptions</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="22 4 12 14.01 9 11.01" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.active}</div>
            <div className={styles.statLabel}>Active Subscriptions</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="1" x2="12" y2="23" stroke="#22c55e" strokeWidth="2"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#22c55e" strokeWidth="2"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>₹{stats.totalRevenue.toFixed(0)}</div>
            <div className={styles.statLabel}>Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {['all', 'active', 'completed'].map(f => (
          <button key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${stats.total})` : f === 'active' ? `Active (${stats.active})` : `Completed (${stats.completed})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredSubscriptions.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#d1d5db" strokeWidth="2"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="#d1d5db" strokeWidth="2"/>
          </svg>
          <h3>No {filter !== 'all' ? filter : ''} subscriptions found</h3>
          <p>Subscription orders will appear here when customers subscribe to your farm.</p>
        </div>
      ) : (
        <div className={styles.subscriptionsList}>
          {filteredSubscriptions.map((subscription) => {
            const isExpanded = expandedSub === subscription._id;
            const selections = dailySelections[subscription._id] || [];
            const isLoadingSel = loadingSelections[subscription._id];

            return (
              <div key={subscription._id} className={styles.subscriptionCard}>
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <div className={styles.subscriptionIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="white" strokeWidth="2"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="white" strokeWidth="2"/>
                        <line x1="12" y1="22.08" x2="12" y2="12" stroke="white" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className={styles.subscriptionId}>{subscription.subscriptionId}</h3>
                      <p className={styles.planName}>{subscription.planName} - {subscription.planType}</p>
                    </div>
                  </div>
                  <div className={styles.statusBadge} style={{ background: getStatusColor(subscription.status) }}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </div>
                  <button
                    onClick={() => handleDelete(subscription._id, subscription.subscriptionId)}
                    title="Delete subscription"
                    style={{
                      background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                      color: 'white', fontSize: '13px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '5px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.7)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Delete
                  </button>
                </div>

                {/* Card Body */}
                <div className={styles.cardBody}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <div className={styles.infoLabel}>Customer</div>
                        <div className={styles.infoValue}>{subscription.deliveryInfo?.fullName || 'N/A'}</div>
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <div className={styles.infoLabel}>Delivery Location</div>
                        <div className={styles.infoValue}>
                          {subscription.deliveryInfo?.city || 'N/A'}
                          {subscription.deliveryInfo?.area && `, ${subscription.deliveryInfo.area}`}
                        </div>
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <div className={styles.infoLabel}>Start Date</div>
                        <div className={styles.infoValue}>{formatDate(subscription.startDate)}</div>
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <div className={styles.infoLabel}>Delivery Time</div>
                        <div className={styles.infoValue}>
                          {subscription.schedule?.timeSlot?.charAt(0).toUpperCase() + subscription.schedule?.timeSlot?.slice(1) || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <div className={styles.infoLabel}>Contact</div>
                        <div className={styles.infoValue}>{subscription.deliveryInfo?.phoneNumber || 'N/A'}</div>
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <div className={styles.infoLabel}>Your Earnings</div>
                        <div className={styles.infoValue} style={{ color: '#22c55e', fontWeight: '600' }}>
                          ₹{subscription.farmerAmount || subscription.totalAmount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {subscription.deliveryInfo?.deliveryInstructions && (
                    <div className={styles.instructions}>
                      <strong>Delivery Instructions:</strong> {subscription.deliveryInfo.deliveryInstructions}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <div className={styles.frequency}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>{subscription.deliveryFrequency?.charAt(0).toUpperCase() + subscription.deliveryFrequency?.slice(1)} delivery</span>
                    </div>
                    <div className={styles.weeks}>
                      {subscription.numberOfWeeks} week{subscription.numberOfWeeks > 1 ? 's' : ''} subscription
                    </div>
                  </div>

                  {/* View Daily Schedule Button */}
                  <button
                    onClick={() => toggleExpand(subscription._id)}
                    style={{
                      width: '100%', marginTop: '16px', padding: '12px',
                      background: isExpanded ? '#f0fdf4' : '#22c55e',
                      color: isExpanded ? '#16a34a' : 'white',
                      border: isExpanded ? '1px solid #86efac' : 'none',
                      borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 600, fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s'
                    }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {isExpanded ? 'Hide Daily Schedule' : 'View Daily Product Schedule'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>

                  {/* Mark as Completed & Send Invoice - only for active */}
                  {subscription.status === 'active' && (
                    <button
                      onClick={() => handleMarkCompleted(subscription._id, subscription.subscriptionId)}
                      style={{
                        width: '100%', marginTop: '8px', padding: '12px',
                        background: 'white', color: '#22c55e',
                        border: '2px solid #22c55e', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseOut={e => e.currentTarget.style.background = 'white'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Mark as Completed & Send Invoice
                    </button>
                  )}
                </div>

                {/* Daily Schedule Panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div style={{ padding: '20px 24px' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                        Daily Product Schedule
                      </h4>

                      {isLoadingSel ? (
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading schedule...</p>
                      ) : selections.length === 0 ? (
                        <div style={{ padding: '24px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                            The customer has not selected products for any day yet.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {selections
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((sel, i) => {
                              const past = isPast(sel.date);
                              const today = isToday(sel.date);
                              const tomorrow = isTomorrow(sel.date);
                              return (
                                <div key={i} style={{
                                  background: 'white', borderRadius: '10px',
                                  border: `1px solid ${today ? '#22c55e' : tomorrow ? '#fbbf24' : '#e5e7eb'}`,
                                  overflow: 'hidden',
                                  opacity: past ? 0.6 : 1
                                }}>
                                  {/* Day header */}
                                  <div style={{
                                    padding: '10px 16px',
                                    background: today ? '#f0fdf4' : tomorrow ? '#fffbeb' : '#f9fafb',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderBottom: '1px solid #e5e7eb'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                                        {formatDayDate(sel.date)}
                                      </span>
                                      {today && <span style={{ background: '#22c55e', color: 'white', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>TODAY</span>}
                                      {tomorrow && <span style={{ background: '#f59e0b', color: 'white', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>TOMORROW</span>}
                                      {past && <span style={{ background: '#e5e7eb', color: '#6b7280', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>PAST</span>}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                      {sel.products?.length || 0} product{sel.products?.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  {/* Products */}
                                  <div style={{ padding: '12px 16px' }}>
                                    {(!sel.products || sel.products.length === 0) ? (
                                      <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>No products selected for this day</p>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {sel.products.map((product, pi) => (
                                          <div key={pi} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '8px 12px', background: '#f9fafb', borderRadius: '8px'
                                          }}>
                                            {/* Product image */}
                                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#e5e7eb', flexShrink: 0 }}>
                                              {product.productId?.image
                                                ? <img src={product.productId.image} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🌿</div>}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{product.productName}</div>
                                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                ₹{product.pricePerUnit}/{product.unit}
                                              </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                              <div style={{ fontWeight: 700, fontSize: '15px', color: '#22c55e' }}>
                                                {product.quantity} {product.unit}
                                              </div>
                                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                ₹{(product.quantity * product.pricePerUnit).toFixed(2)}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {/* Day total */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid #e5e7eb', marginTop: '4px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                            Day Total: ₹{sel.products.reduce((sum, p) => sum + (p.quantity * p.pricePerUnit), 0).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
