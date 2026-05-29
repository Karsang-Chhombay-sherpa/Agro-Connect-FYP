import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import styles from './UserProfile.module.css';

const statusColor = (s) => ({
  delivered: { bg: '#dcfce7', color: '#166534' },
  confirmed: { bg: '#dbeafe', color: '#1e40af' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b' },
  pending:    { bg: '#fef9c3', color: '#854d0e' },
}[s] || { bg: '#f3f4f6', color: '#374151' });

export default function OrderHistory({ user }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = user._id || user.id;
      console.log('Fetching orders for user:', userId);
      const url = filter === 'all'
        ? `/api/orders/customer/${userId}`
        : `/api/orders/customer/${userId}?status=${filter}`;
      const res = await axios.get(url);
      console.log('Orders response:', res.data);
      if (res.data.success) setOrders(res.data.orders);
      else console.error('API returned failure:', res.data);
    } catch (err) {
      console.error('Error fetching orders:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order) => {
    const cart = order.items.map(item => ({
      _id: item.productId?._id || item.productId,
      productName: item.productName,
      pricePerUnit: item.pricePerUnit,
      unit: item.unit,
      quantity: item.quantity,
      image: item.productId?.image || null,
      availableStock: 999
    }));
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    toast.success('Items added to cart!');
    navigate('/marketplace');
  };

  const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAABRxJREFUeAHFWV9MU1cY/85t7YYSVoxYXzBFZrJlKCzhAbsHSyIL3R5WfNHEKfbFvYEsmu1ls2Z7wJgwMHuBF1RiMl6EvUizkdE9WPfAkoq47UGwri9tMaMyOmYZPfu+c3ubS7m9f7oOfsn13nvO99nf/c737xwYlIl9o51eZmfNjIMXX1s4gJPhRXP4nMbnGNDF+cOcBOHnZ0NhKAPMirBz1Ot02Hf3cs4vKmQsIMaBhdc3clfTgVDMrJIpgkRsl63qCgpfhAoAid40S9SQYN0tXy9KBcuwmBFiXOLBpQ9Dt/SEdAnW3fZ9VSmrlQL66+DSuam+UvOaBMWSSlUTjIkA2A5Esxtr7elAOF08IWlJO2xVM9tIjtBCBtGa2EKQlpUUYJtBBsn/9ibY1C91tzvPM2D9sENAf2ur7jr8IjPx5CfVmAznaKfbYWMz+OiGCqPGsQd+eP9r8dw6ETAST6M/Nij+WFjiXRIL/l/kJjr6ob7aJa5TjSeMVETOVV6EBfPWewoVBBE73dgBF974QBBTEEnOQdd3nxrqoxVryYp2eslb7z8Taqo9BE17G8FX34bPjWJMkErMwWc/j6Alr4HHdRTq9+yHeCal+/85pFcp/wYFQYyg41AGPK4jSOYY+A4ewx91bZknYsO/TUIoLvv8Nwvfw4U3/ajjgREc1wVjvYLgvrFOL6ZzN1gAWeZy8xlcPn9hbGU9A7//mYD7yUfweHkRpuIPYCWb2aQ3j+Piww4cMSaInkfc7FIOE7KFnkZxelpKIjX8y6TwqwgSM4IiQ65gBjbOWuw5xpolMI8vWz8S5OKZJDr7JxBfTZnWXcmuinuNo9qcAudeiVlILeo0YZUc4UV+yV/LB48hP2E8C/53+egZcSdnt0quTDgljGDTfd5btQ3iPvLrt5rzZOHZrlFxaervlX0vvpoE0wTBAsj3CI/z0agGpQ8qZyIplwg6JTjmNfRLwc45bnBYed0yJdzTr3fAqUMnCtWC0ktPZEBTXvFfkjGJtB3JUVE2RZCWhojc8PSJZFujcnaK6p77AyXTDZF7B6sIyZkmyCFmz2E3K5mMZFoaOZI7xDvlwXvPIjC+OK2bB0lHCbDxJ9NbEngpMODP7LABP2JX6DcSvoSVg8qaAlrG8YVpIzVBTulm5pcX4PrcHTALLoxn51EjQbUFqGoQ6L2+er+uHtVqhRwt7fnwF2AFtOEX8YZby2W9QLnh+Vj4EOW/z2dH4O67/aJbIYzj2DCmHSWyKXB8Bz2io6HORXwUNg09Dwas5U70v1T3VIPczQAfwn+vlJJV5z+qBiexn7uEFqTUQv6o+GQxyEevR++YaQy2gvGwzA2oYfU7HbaXy6Vkk2fvibtr7L1N47R0RLQJP0DJkRTp838sQiT1SFjcbEAUQ9rgDQk8eSikVFzmQVzmXi3h2ZNyZWi9a7ifqBD4zdS5kPgx1abJj5v1l0/LTdoVA/qelOPtify5TaHUpQOTac7gKuwwOPBgQnWotGlf/BfuR3f7D9eiFdtgB4Bld2ipO3RNPaZZ1uvGfDP5g8ntA4coppW3i4c1u5n1f17pwq8xTOCVAh6IhrO5tXatOf3jN53IrhTkZZ0qecSn2w+SIjptgCILKgzR5gH06ZEjmNrPHcCTB6yLQdyrdkMFQFZbz60Ftc4Di2HpEL1AFNhx1HRbUM1bjA9lc38PmiFWFkE1aFMt76lZM5c3Xm4lyctdOkcSLIrPYZ7jD58HyvszxL9qhQVUbdIgoAAAAABJRU5ErkJggg==';

  const handleDownloadInvoice = (order) => {
    const sc = statusColor(order.status);
    const date = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const deliveryDate = order.deliveryDate
      ? new Date(order.deliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    const itemRows = order.items.map(item => {
      const farmerName = item.farmerId?.farmName || item.farmerId?.firstName || 'Local Farm';
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">
          <div style="font-weight:600">${item.productName}</div>
          <div style="font-size:12px;color:#6b7280">From: ${farmerName}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${item.quantity} ${item.unit}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">₹${item.pricePerUnit}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right">₹${item.totalPrice?.toFixed(2)}</td>
      </tr>`;
    }).join('');

    const discountRow = order.subscriptionDiscount?.amount > 0
      ? `<div class="total-row" style="color:#22c55e"><span>Discount (${order.subscriptionDiscount.percentage}%)</span><span>-₹${order.subscriptionDiscount.amount.toFixed(2)}</span></div>`
      : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice - ${order.orderId}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#111827;padding:48px;background:white}
    .no-print{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999}
    .btn-back{padding:10px 20px;background:white;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    .btn-print{padding:10px 20px;background:#22c55e;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
    .btn-back:hover{background:#f9fafb}
    .btn-print:hover{background:#16a34a}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
    .brand{display:flex;align-items:center;gap:10px}
    .brand img{width:44px;height:44px;object-fit:contain}
    .brand-text{font-size:24px;font-weight:700;color:#22c55e}
    .brand-sub{font-size:13px;color:#6b7280;margin-top:2px}
    .inv-label{font-size:32px;font-weight:700;color:#111827;text-align:right}
    .inv-id{font-size:14px;color:#6b7280;text-align:right;margin-top:4px}
    .divider{border:none;border-top:2px solid #22c55e;margin:24px 0}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
    .info-box h4{font-size:11px;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;letter-spacing:1px}
    .info-box p{font-size:14px;color:#374151;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead tr{background:#f9fafb}
    th{padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;border-bottom:2px solid #e5e7eb}
    .totals{margin-left:auto;width:300px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#374151}
    .total-row.grand{font-size:18px;font-weight:700;color:#22c55e;border-top:2px solid #22c55e;padding-top:12px;margin-top:8px}
    .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${sc.bg};color:${sc.color};text-transform:uppercase}
    .footer{margin-top:48px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:24px}
    @media print{.no-print{display:none}body{padding:24px}}
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-back" onclick="window.close()">← Back</button>
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
  </div>

  <div class="header">
    <div class="brand">
      <img src="${LOGO_BASE64}" alt="AgroConnect Logo"/>
      <div>
        <div class="brand-text">AgroConnect</div>
        <div class="brand-sub">Fresh from the farm to your door</div>
      </div>
    </div>
    <div>
      <div class="inv-label">INVOICE</div>
      <div class="inv-id">${order.orderId}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div class="info-box">
      <h4>Bill To</h4>
      <p><strong>${order.customerName}</strong></p>
      <p>${order.customerEmail}</p>
      <p>${order.primaryMobile}${order.secondaryMobile ? ' / ' + order.secondaryMobile : ''}</p>
      <p style="margin-top:8px;color:#6b7280">${order.deliveryAddress}</p>
    </div>
    <div class="info-box" style="text-align:right">
      <h4>Invoice Details</h4>
      <p><span style="color:#6b7280">Order Date:</span> <strong>${date}</strong></p>
      <p><span style="color:#6b7280">Delivery Date:</span> <strong>${deliveryDate}</strong></p>
      <p><span style="color:#6b7280">Delivery Slot:</span> <strong>${order.deliveryTimeSlot || order.deliveryTime}</strong></p>
      <p><span style="color:#6b7280">Payment:</span> <strong>${order.paymentMethod === 'esewa' ? 'eSewa' : 'Cash on Delivery'}</strong></p>
      <p><span style="color:#6b7280">Payment Status:</span> <strong>${order.paymentStatus?.toUpperCase()}</strong></p>
      <p style="margin-top:8px"><span style="color:#6b7280">Order Status:</span> <span class="badge">${order.status}</span></p>
    </div>
  </div>
  ${order.paymentId?.transactionId ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px"><span style="color:#6b7280">Transaction ID:</span> <strong>${order.paymentId.transactionId}</strong></div>` : ''}
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>₹${order.subtotal?.toFixed(2)}</span></div>
    <div class="total-row"><span>Delivery Fee</span><span>₹${(order.deliveryFee ?? 2.50).toFixed(2)}</span></div>
    ${discountRow}
    <div class="total-row grand"><span>Total</span><span>₹${order.totalAmount?.toFixed(2)}</span></div>
  </div>
  <div class="footer">Thank you for choosing AgroConnect! Supporting local farmers, one order at a time.<br/>For support, contact us at support@agroconnect.com</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const filters = ['all', 'pending', 'confirmed', 'delivered', 'cancelled'];
  const totalSpent = orders
    .filter(o => o.paymentStatus === 'paid' || o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Purchase History</h2>
        <p className={styles.sectionSubtitle}>View all your past purchases and download invoices</p>
      </div>

      {/* Summary stats */}
      {!loading && orders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Orders', value: orders.length },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length },
            { label: 'Total Spent', value: `₹${totalSpent.toFixed(0)}` },
          ].map((stat, i) => (
            <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: '999px', border: `1px solid ${filter === f ? '#22c55e' : '#e5e7eb'}`, background: filter === f ? '#22c55e' : 'white', color: filter === f ? 'white' : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s' }}>
            {f === 'all' ? 'All Orders' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.emptyState}><div className={styles.spinner} /><p>Loading orders...</p></div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No {filter !== 'all' ? filter : ''} purchases found</p>
          <button className={styles.browseButton} onClick={() => navigate('/marketplace')}>Start Shopping</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map(order => {
            const sc = statusColor(order.status);
            const isExpanded = expandedOrder === order._id;
            const date = new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const deliveryDate = order.deliveryDate
              ? new Date(order.deliveryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
              : null;

            return (
              <div key={order._id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Header */}
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: isExpanded ? '#f9fafb' : 'white' }}
                  onClick={() => setExpandedOrder(isExpanded ? null : order._id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{order.orderId}</span>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>{order.status}</span>
                      {order.paymentStatus === 'paid' && <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>Paid</span>}
                      {order.paymentMethod === 'cash' && order.paymentStatus !== 'paid' && <span style={{ background: '#fef9c3', color: '#854d0e', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>COD</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                      {date} · {order.items.length} item{order.items.length !== 1 ? 's' : ''} · <strong style={{ color: '#111827' }}>₹{order.totalAmount?.toFixed(2)}</strong>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    {/* Items */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Items</div>
                      {order.items.map((item, i) => {
                        const farmerName = item.farmerId?.farmName || item.farmerId?.firstName || 'Local Farm';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#f3f4f6', overflow: 'hidden', flexShrink: 0 }}>
                              {item.productId?.image
                                ? <img src={item.productId.image} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🌿</div>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{item.productName}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.quantity} {item.unit} × ₹{item.pricePerUnit} · {farmerName}</div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', flexShrink: 0 }}>₹{item.totalPrice?.toFixed(2)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Details grid */}
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Delivery Info</div>
                        <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                          <div>📍 {order.deliveryAddress}</div>
                          <div>🕐 {order.deliveryTimeSlot || order.deliveryTime}</div>
                          {deliveryDate && <div>📅 {deliveryDate}</div>}
                          <div>📞 {order.primaryMobile}{order.secondaryMobile ? ` / ${order.secondaryMobile}` : ''}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Payment</div>
                        <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                          <div>💳 {order.paymentMethod === 'esewa' ? 'eSewa' : 'Cash on Delivery'}</div>
                          <div>Status: <strong>{order.paymentStatus}</strong></div>
                          {order.paymentId?.transactionId && <div style={{ fontSize: '11px', color: '#9ca3af', wordBreak: 'break-all' }}>TXN: {order.paymentId.transactionId}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Totals */}
                    <div style={{ padding: '12px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ maxWidth: '260px', marginLeft: 'auto', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', marginBottom: '4px' }}><span>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', marginBottom: '4px' }}><span>Delivery Fee</span><span>₹{(order.deliveryFee ?? 2.50).toFixed(2)}</span></div>
                        {order.subscriptionDiscount?.amount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', marginBottom: '4px' }}>
                            <span>Discount ({order.subscriptionDiscount.percentage}%)</span>
                            <span>-₹{order.subscriptionDiscount.amount.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', color: '#111827', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '4px' }}>
                          <span>Total</span><span>₹{order.totalAmount?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '14px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleReorder(order)}
                        style={{ padding: '9px 18px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                        Reorder
                      </button>
                      <button onClick={() => handleDownloadInvoice(order)}
                        style={{ padding: '9px 18px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                        Download Invoice
                      </button>
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
