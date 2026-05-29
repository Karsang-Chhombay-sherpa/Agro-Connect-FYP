import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './AdminDashboard.module.css';

const TABS = [
  { key: 'overview',       label: 'Overview'       },
  { key: 'users',          label: 'Users'          },
  { key: 'farmers',        label: 'Farmers'        },
  { key: 'products',       label: 'Products'       },
  { key: 'orders',         label: 'Orders'         },
  { key: 'subscriptions',  label: 'Subscriptions'  },
  { key: 'payments',       label: 'Payments'       },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const parsed = JSON.parse(userData);
    if (parsed.userType !== 'admin') { navigate('/login'); return; }
    setAdmin(parsed);
    loadStats();
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== 'overview') loadTab(activeTab);
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data.stats);
    } catch (e) {
      console.error('Stats error:', e);
      // Fallback: fetch counts individually
      try {
        const [uRes, fRes, pRes, oRes, sRes] = await Promise.allSettled([
          axios.get('/api/admin/users'),
          axios.get('/api/admin/farmers'),
          axios.get('/api/admin/products'),
          axios.get('/api/admin/orders'),
          axios.get('/api/admin/subscriptions'),
        ]);
        setStats({
          users:         uRes.status === 'fulfilled' ? uRes.value.data.users?.length || 0 : 0,
          farmers:       fRes.status === 'fulfilled' ? fRes.value.data.farmers?.length || 0 : 0,
          products:      pRes.status === 'fulfilled' ? pRes.value.data.products?.length || 0 : 0,
          orders:        oRes.status === 'fulfilled' ? oRes.value.data.orders?.length || 0 : 0,
          subscriptions: sRes.status === 'fulfilled' ? sRes.value.data.subscriptions?.length || 0 : 0,
          totalRevenue: 0, platformRevenue: 0, ordersByStatus: {}
        });
      } catch (e2) { console.error(e2); }
    } finally {
      setLoading(false);
    }
  };

  const loadTab = async (tab) => {
    if (data[tab]) return; // cached
    try {
      const res = await axios.get(`/api/admin/${tab}`);
      const key = Object.keys(res.data).find(k => k !== 'success');
      setData(prev => ({ ...prev, [tab]: res.data[key] || [] }));
    } catch (e) { console.error(e); }
  };

  const refresh = (tab) => {
    setData(prev => { const n = { ...prev }; delete n[tab]; return n; });
    loadTab(tab);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await axios.delete(`/api/admin/users/${id}`);
    setData(prev => ({ ...prev, users: prev.users.filter(u => u._id !== id) }));
  };

  const handleDeleteFarmer = async (id) => {
    if (!window.confirm('Delete this farmer and all their products?')) return;
    await axios.delete(`/api/admin/farmers/${id}`);
    setData(prev => ({ ...prev, farmers: prev.farmers.filter(f => f._id !== id) }));
  };

  const handleToggleFarmerVerify = async (farmer) => {
    const res = await axios.patch(`/api/admin/farmers/${farmer._id}/verify`, { verified: !farmer.verified });
    setData(prev => ({
      ...prev,
      farmers: prev.farmers.map(f => f._id === farmer._id ? res.data.farmer : f)
    }));
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await axios.delete(`/api/admin/products/${id}`);
    setData(prev => ({ ...prev, products: prev.products.filter(p => p._id !== id) }));
  };

  const handleOrderStatus = async (id, status) => {
    const res = await axios.patch(`/api/admin/orders/${id}/status`, { status });
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o._id === id ? { ...o, status: res.data.order.status } : o)
    }));
  };

  const handleLogout = () => { localStorage.removeItem('user'); navigate('/login'); };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const filtered = (list = []) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(item =>
      Object.values(item).some(v => String(v).toLowerCase().includes(q))
    );
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} />Loading...</div>;

  const statCards = [
    { label: 'Users',         value: stats?.users || 0,         color: '#22c55e' },
    { label: 'Farmers',       value: stats?.farmers || 0,       color: '#3b82f6' },
    { label: 'Products',      value: stats?.products || 0,      color: '#f59e0b' },
    { label: 'Orders',        value: stats?.orders || 0,        color: '#8b5cf6' },
    { label: 'Subscriptions', value: stats?.subscriptions || 0, color: '#ec4899' },
    { label: 'Total Revenue', value: fmt(stats?.totalRevenue),  color: '#10b981', wide: true },
    { label: 'Platform Revenue', value: fmt(stats?.platformRevenue), color: '#06b6d4', wide: true },
  ];

  const orderStatusColors = { pending: '#f59e0b', confirmed: '#3b82f6', delivered: '#22c55e', cancelled: '#ef4444' };
  const paymentStatusColors = { pending: '#f59e0b', completed: '#22c55e', failed: '#ef4444', refunded: '#8b5cf6' };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.logoText}>AgroConnect Admin</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.adminBadge}>
            <span className={styles.adminAvatar}>{(admin?.name || 'A')[0]}</span>
            <span className={styles.adminName}>{admin?.name || 'Admin'}</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`${styles.sidebarItem} ${activeTab === tab.key ? styles.active : ''}`}
              onClick={() => { setActiveTab(tab.key); setSearch(''); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className={styles.content}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Dashboard Overview</h2>
                <button className={styles.refreshBtn} onClick={loadStats}>↻ Refresh</button>
              </div>
              <div className={styles.statsGrid}>
                {statCards.map(card => (
                  <div key={card.label} className={`${styles.statCard} ${card.wide ? styles.wide : ''}`} style={{ borderTop: `4px solid ${card.color}` }}>
                    <div className={styles.statValue} style={{ color: card.color }}>{card.value}</div>
                    <div className={styles.statLabel}>{card.label}</div>
                  </div>
                ))}
              </div>

              {stats?.ordersByStatus && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Orders by Status</h3>
                  <div className={styles.statusRow}>
                    {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                      <div key={status} className={styles.statusChip} style={{ background: orderStatusColors[status] + '20', color: orderStatusColors[status], border: `1px solid ${orderStatusColors[status]}40` }}>
                        <span className={styles.statusDot} style={{ background: orderStatusColors[status] }} />
                        {status}: <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Users ({filtered(data.users)?.length ?? '…'})</h2>
                <div className={styles.headerActions}>
                  <input className={styles.searchInput} placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={styles.refreshBtn} onClick={() => refresh('users')}>↻</button>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {!data.users ? <tr><td colSpan={5} className={styles.empty}>Loading…</td></tr>
                    : filtered(data.users).length === 0 ? <tr><td colSpan={5} className={styles.empty}>No users found</td></tr>
                    : filtered(data.users).map((u, i) => (
                      <tr key={u._id}>
                        <td className={styles.muted}>{i + 1}</td>
                        <td>{u.firstName} {u.lastName}</td>
                        <td>{u.email}</td>
                        <td><span className={u.verified ? styles.badgeGreen : styles.badgeGray}>{u.verified ? 'Verified' : 'Unverified'}</span></td>
                        <td>
                          <button className={styles.btnDanger} onClick={() => handleDeleteUser(u._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── FARMERS ── */}
          {activeTab === 'farmers' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Farmers ({filtered(data.farmers)?.length ?? '…'})</h2>
                <div className={styles.headerActions}>
                  <input className={styles.searchInput} placeholder="Search farmers…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={styles.refreshBtn} onClick={() => refresh('farmers')}>↻</button>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>#</th><th>Name</th><th>Farm</th><th>Email</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {!data.farmers ? <tr><td colSpan={7} className={styles.empty}>Loading…</td></tr>
                    : filtered(data.farmers).length === 0 ? <tr><td colSpan={7} className={styles.empty}>No farmers found</td></tr>
                    : filtered(data.farmers).map((f, i) => (
                      <tr key={f._id}>
                        <td className={styles.muted}>{i + 1}</td>
                        <td>{f.firstName} {f.lastName}</td>
                        <td>{f.farmName}</td>
                        <td>{f.email}</td>
                        <td>{f.location || '—'}</td>
                        <td><span className={f.verified ? styles.badgeGreen : styles.badgeGray}>{f.verified ? 'Verified' : 'Unverified'}</span></td>
                        <td className={styles.actions}>
                          <button className={f.verified ? styles.btnWarning : styles.btnSuccess} onClick={() => handleToggleFarmerVerify(f)}>
                            {f.verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button className={styles.btnDanger} onClick={() => handleDeleteFarmer(f._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === 'products' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Products ({filtered(data.products)?.length ?? '…'})</h2>
                <div className={styles.headerActions}>
                  <input className={styles.searchInput} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={styles.refreshBtn} onClick={() => refresh('products')}>↻</button>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>#</th><th>Product</th><th>Farmer</th><th>Category</th><th>Price</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {!data.products ? <tr><td colSpan={8} className={styles.empty}>Loading…</td></tr>
                    : filtered(data.products).length === 0 ? <tr><td colSpan={8} className={styles.empty}>No products found</td></tr>
                    : filtered(data.products).map((p, i) => (
                      <tr key={p._id}>
                        <td className={styles.muted}>{i + 1}</td>
                        <td>{p.productName}</td>
                        <td>{p.farmerId?.farmName || '—'}</td>
                        <td>{p.category}</td>
                        <td>₹{p.pricePerUnit}/{p.unit}</td>
                        <td>{p.quantity} {p.unit}</td>
                        <td><span className={p.isAvailable ? styles.badgeGreen : styles.badgeGray}>{p.isAvailable ? 'Available' : 'Unavailable'}</span></td>
                        <td><button className={styles.btnDanger} onClick={() => handleDeleteProduct(p._id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Orders ({filtered(data.orders)?.length ?? '…'})</h2>
                <div className={styles.headerActions}>
                  <input className={styles.searchInput} placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={styles.refreshBtn} onClick={() => refresh('orders')}>↻</button>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Update Status</th></tr></thead>
                  <tbody>
                    {!data.orders ? <tr><td colSpan={7} className={styles.empty}>Loading…</td></tr>
                    : filtered(data.orders).length === 0 ? <tr><td colSpan={7} className={styles.empty}>No orders found</td></tr>
                    : filtered(data.orders).map(o => (
                      <tr key={o._id}>
                        <td className={styles.mono}>{o.orderId}</td>
                        <td>{o.customerId?.firstName || o.customerName || '—'}</td>
                        <td>{fmt(o.totalAmount)}</td>
                        <td><span style={{ color: paymentStatusColors[o.paymentStatus] }}>{o.paymentStatus}</span></td>
                        <td><span className={styles.statusBadge} style={{ background: orderStatusColors[o.status] + '20', color: orderStatusColors[o.status] }}>{o.status}</span></td>
                        <td className={styles.muted}>{fmtDate(o.orderDate || o.createdAt)}</td>
                        <td>
                          <select
                            className={styles.statusSelect}
                            value={o.status}
                            onChange={e => handleOrderStatus(o._id, e.target.value)}
                          >
                            {['pending','confirmed','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── SUBSCRIPTIONS ── */}
          {activeTab === 'subscriptions' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Subscriptions ({filtered(data.subscriptions)?.length ?? '…'})</h2>
                <div className={styles.headerActions}>
                  <input className={styles.searchInput} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={styles.refreshBtn} onClick={() => refresh('subscriptions')}>↻</button>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Sub ID</th><th>User</th><th>Plan</th><th>Amount</th><th>Frequency</th><th>Status</th><th>Start Date</th></tr></thead>
                  <tbody>
                    {!data.subscriptions ? <tr><td colSpan={7} className={styles.empty}>Loading…</td></tr>
                    : filtered(data.subscriptions).length === 0 ? <tr><td colSpan={7} className={styles.empty}>No subscriptions found</td></tr>
                    : filtered(data.subscriptions).map(s => (
                      <tr key={s._id}>
                        <td className={styles.mono}>{s.subscriptionId || s._id?.slice(-6)}</td>
                        <td>{s.userId?.firstName || '—'} {s.userId?.lastName || ''}</td>
                        <td>{s.planType || s.planName}</td>
                        <td>{fmt(s.totalAmount)}</td>
                        <td>{s.deliveryFrequency}</td>
                        <td>
                          <span className={styles.statusBadge} style={{
                            background: (s.status === 'active' ? '#22c55e' : s.status === 'cancelled' ? '#ef4444' : '#f59e0b') + '20',
                            color: s.status === 'active' ? '#22c55e' : s.status === 'cancelled' ? '#ef4444' : '#f59e0b'
                          }}>{s.status}</span>
                        </td>
                        <td className={styles.muted}>{fmtDate(s.startDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── PAYMENTS ── */}
          {activeTab === 'payments' && (
            <>
              <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Payments ({filtered(data.payments)?.length ?? '…'})</h2>
                <div className={styles.headerActions}>
                  <input className={styles.searchInput} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={styles.refreshBtn} onClick={() => refresh('payments')}>↻</button>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Payment ID</th><th>User</th><th>Amount</th><th>Commission</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {!data.payments ? <tr><td colSpan={7} className={styles.empty}>Loading…</td></tr>
                    : filtered(data.payments).length === 0 ? <tr><td colSpan={7} className={styles.empty}>No payments found</td></tr>
                    : filtered(data.payments).map(p => (
                      <tr key={p._id}>
                        <td className={styles.mono}>{p.paymentId?.slice(-10)}</td>
                        <td>{p.userId?.firstName || '—'} {p.userId?.lastName || ''}</td>
                        <td>{fmt(p.amount)}</td>
                        <td>{fmt(p.platformCommission)}</td>
                        <td>{p.paymentMethod}</td>
                        <td><span className={styles.statusBadge} style={{ background: (paymentStatusColors[p.status] || '#6b7280') + '20', color: paymentStatusColors[p.status] || '#6b7280' }}>{p.status}</span></td>
                        <td className={styles.muted}>{fmtDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
