import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ManageSubscriptionModal({ subscription, onClose, showSuccess, showError }) {
  const [products, setProducts] = useState([]);
  const [dailySelections, setDailySelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Generate delivery days based on subscription start date and frequency
  const getDeliveryDays = () => {
    const start = new Date(subscription.startDate || subscription.schedule?.startDate || Date.now());
    const days = [];
    const count = subscription.deliveryFrequency === 'weekly' ? 7
      : subscription.deliveryFrequency === 'biweekly' ? 14 : 30;

    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const days = getDeliveryDays();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch available products from subscribed farmers
      const farmerIds = subscription.selectedFarmers?.map(f => f._id || f) || [];
      let allProducts = [];

      if (farmerIds.length > 0) {
        const res = await axios.get(`/api/products?farmerId=${farmerIds[0]}`);
        allProducts = res.data.products || [];
        // If no products from specific farmer, get all
        if (allProducts.length === 0) {
          const allRes = await axios.get('/api/products');
          allProducts = allRes.data.products || [];
        }
      } else {
        const allRes = await axios.get('/api/products');
        allProducts = allRes.data.products || [];
      }

      setProducts(allProducts.filter(p => p.isAvailable && p.quantity > 0));

      // Fetch existing daily selections
      const selRes = await axios.get(`/api/subscriptions/${subscription._id}/daily-selections`);
      if (selRes.data.success) {
        // Convert array to object keyed by date string
        const selMap = {};
        (selRes.data.dailySelections || []).forEach(sel => {
          const key = new Date(sel.date).toDateString();
          selMap[key] = sel.products || [];
        });
        setDailySelections(selMap);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (day, product) => {
    const key = day.toDateString();
    const current = dailySelections[key] || [];
    const exists = current.find(p => p.productId === product._id);

    if (exists) {
      setDailySelections(prev => ({
        ...prev,
        [key]: current.filter(p => p.productId !== product._id)
      }));
    } else {
      setDailySelections(prev => ({
        ...prev,
        [key]: [...current, {
          productId: product._id,
          productName: product.productName,
          quantity: 1,
          pricePerUnit: product.pricePerUnit,
          unit: product.unit
        }]
      }));
    }
  };

  const updateQuantity = (day, productId, qty) => {
    const key = day.toDateString();
    setDailySelections(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(p =>
        p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p
      )
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Convert map back to array
      const selectionsArray = Object.entries(dailySelections)
        .filter(([, products]) => products.length > 0)
        .map(([dateStr, products]) => ({
          date: new Date(dateStr),
          products
        }));

      await axios.patch(`/api/subscriptions/${subscription._id}/daily-selections`, {
        dailySelections: selectionsArray
      });

      showSuccess('Daily selections saved successfully!');
      onClose();
    } catch (err) {
      showError('Failed to save selections. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const isToday = (date) => date.toDateString() === new Date().toDateString();
  const isPast = (date) => date < new Date() && !isToday(date);

  const selectedDayKey = selectedDay?.toDateString();
  const selectedProducts = dailySelections[selectedDayKey] || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '860px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Manage Subscription</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Choose vegetables for each delivery day · {subscription.planType}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#6b7280', padding: '4px' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Loading...</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {/* Left: Day selector */}
            <div style={{ width: '220px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 4px' }}>
                Delivery Days
              </p>
              {days.map((day, i) => {
                const key = day.toDateString();
                const count = (dailySelections[key] || []).length;
                const past = isPast(day);
                const active = selectedDay?.toDateString() === key;
                return (
                  <button key={i} onClick={() => !past && setSelectedDay(day)}
                    disabled={past}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
                      background: active ? '#22c55e' : past ? '#f9fafb' : '#f3f4f6',
                      color: active ? 'white' : past ? '#d1d5db' : '#374151',
                      cursor: past ? 'not-allowed' : 'pointer',
                      textAlign: 'left', marginBottom: '4px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '13px', fontWeight: active ? 600 : 400
                    }}>
                    <span>{formatDate(day)}{isToday(day) ? ' (Today)' : ''}</span>
                    {count > 0 && (
                      <span style={{
                        background: active ? 'rgba(255,255,255,0.3)' : '#22c55e',
                        color: active ? 'white' : 'white',
                        borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 700
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Product picker */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {!selectedDay ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  <p style={{ fontSize: '15px' }}>← Select a delivery day to choose vegetables</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                      {formatDate(selectedDay)}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>

                  {products.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>No products available from your subscribed farmers.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {products.map(product => {
                        const selected = selectedProducts.find(p => p.productId === product._id);
                        return (
                          <div key={product._id} onClick={() => toggleProduct(selectedDay, product)}
                            style={{
                              border: `2px solid ${selected ? '#22c55e' : '#e5e7eb'}`,
                              borderRadius: '10px', padding: '12px', cursor: 'pointer',
                              background: selected ? '#f0fdf4' : 'white',
                              transition: 'all 0.15s'
                            }}>
                            {/* Product image */}
                            <div style={{ width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden', background: '#f3f4f6', marginBottom: '8px' }}>
                              {product.image
                                ? <img src={product.image} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🌿</div>}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: '2px' }}>{product.productName}</div>
                            <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>₹{product.pricePerUnit}/{product.unit}</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{product.quantity} {product.unit} available</div>

                            {/* Quantity control */}
                            {selected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}
                                onClick={e => e.stopPropagation()}>
                                <button onClick={() => updateQuantity(selectedDay, product._id, selected.quantity - 1)}
                                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{selected.quantity}</span>
                                <button onClick={() => updateQuantity(selectedDay, product._id, selected.quantity + 1)}
                                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                <span style={{ fontSize: '11px', color: '#6b7280' }}>{product.unit}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            {Object.values(dailySelections).filter(d => d.length > 0).length} days with selections
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose}
              style={{ padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 24px', background: saving ? '#86efac' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px' }}>
              {saving ? 'Saving...' : 'Save Selections'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
