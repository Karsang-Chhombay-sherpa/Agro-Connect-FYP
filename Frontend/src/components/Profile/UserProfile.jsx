import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header/Header';
import ToastContainer from '../Toast/ToastContainer';
import { useToast } from '../../hooks/useToast';
import styles from './UserProfile.module.css';
import OrderHistory from './OrderHistory';
import ManageSubscriptionModal from './ManageSubscriptionModal';

const GALLI_TOKEN = import.meta.env.VITE_GALLI_TOKEN || '';
const GALLI_STYLE = `https://map-init.gallimap.com/styles/light/style.json?accessToken=${GALLI_TOKEN}`;

let mlLoaded = false;
function loadML() {
  return new Promise((resolve, reject) => {
    if (window.maplibregl) { resolve(); return; }
    if (mlLoaded) {
      const t = setInterval(() => { if (window.maplibregl) { clearInterval(t); resolve(); } }, 100);
      return;
    }
    mlLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── Danger Zone Component ───────────────────────────────────────────────────
function DangerZone({ user, navigate }) {
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeactivateAccount = async () => {
    try {
      const response = await axios.put(`/api/auth/user-profile/${user._id || user.id}`, {
        isActive: false
      });
      if (response.data.success) {
        toast.success('Account deactivated successfully');
        setShowDeactivateModal(false);
        setTimeout(() => { localStorage.removeItem('user'); navigate('/'); }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate account');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    try {
      const response = await axios.delete(`/api/auth/user-profile/${user._id || user.id}`);
      if (response.data.success) {
        toast.success('Account deleted successfully');
        setShowDeleteModal(false);
        setTimeout(() => { localStorage.removeItem('user'); navigate('/'); }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  return (
    <>
      {/* Deactivate */}
      <div className={styles.dangerCard}>
        <div className={styles.dangerInfo}>
          <div className={styles.dangerTitle}>Deactivate Account</div>
          <div className={styles.dangerDesc}>Temporarily disable your account. You can reactivate anytime.</div>
        </div>
        <button className={styles.deactivateBtn} onClick={() => setShowDeactivateModal(true)}>
          Deactivate
        </button>
      </div>

      {/* Delete */}
      <div className={`${styles.dangerCard} ${styles.dangerCardDelete}`}>
        <div className={styles.dangerWarning}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="#dc2626" strokeWidth="2"/>
          </svg>
        </div>
        <div className={styles.dangerInfo}>
          <div className={styles.dangerTitle}>Delete Account</div>
          <div className={styles.dangerDesc}>Permanently delete your account and all data. This cannot be undone.</div>
        </div>
        <button className={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
          Delete Account
        </button>
      </div>

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeactivateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Deactivate Account</h3>
            <p className={styles.modalText}>
              Are you sure you want to deactivate your account? You can reactivate it anytime by logging in again.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowDeactivateModal(false)}>Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={handleDeactivateAccount}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete Account</h3>
            <p className={styles.modalText}>
              This action cannot be undone. All your data, orders, and subscriptions will be permanently deleted.
            </p>
            <p className={styles.modalWarningText}>Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              className={styles.input}
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}>Cancel</button>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteAccount}>Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Security Section Component ──────────────────────────────────────────────

const EyeIcon = ({ visible }) => visible ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
  </svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
    <line x1="4" y1="20" x2="20" y2="4" stroke="#999" strokeWidth="2"/>
  </svg>
);

const PasswordField = ({ label, value, show, onToggle, onChange, errors, successMsg, styles }) => (
  <div className={styles.formGroup}>
    <label className={styles.label}>{label}</label>
    <div className={styles.passwordInputWrapper}>
      <input
        type={show ? 'text' : 'password'}
        className={styles.input}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="••••••••"
      />
      <button type="button" className={styles.passwordToggle} onClick={onToggle} aria-label={show ? 'Hide' : 'Show'}>
        <EyeIcon visible={show} />
      </button>
    </div>
    {errors && errors.length > 0 && (
      <div className={styles.validationMessages}>
        {errors.map((err, i) => <div key={i} className={styles.errorText}>• {err}</div>)}
      </div>
    )}
    {successMsg && <div className={styles.successText}>{successMsg}</div>}
  </div>
);

function SecuritySection({ user, showSuccess, showError }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPasswordErrors, setNewPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswordCriteria = (password) => {
    const errors = [];
    if (password.length < 8 || password.length > 30) errors.push('Password must be 8-30 characters long');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain at least one special character (!@#$%^&*)');
    if (/\s/.test(password)) errors.push('Password must not contain whitespace');
    return errors;
  };

  const handleNewPasswordChange = (password) => {
    setNewPassword(password);
    setNewPasswordErrors(validatePasswordCriteria(password));
    if (confirmPassword) {
      setConfirmPasswordError(password !== confirmPassword ? 'Passwords do not match' : '');
    }
  };

  const handleConfirmPasswordChange = (password) => {
    setConfirmPassword(password);
    setConfirmPasswordError(password !== newPassword ? 'Passwords do not match' : '');
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }
    const pwdErrors = validatePasswordCriteria(newPassword);
    if (pwdErrors.length > 0) { setNewPasswordErrors(pwdErrors); return; }
    if (newPassword !== confirmPassword) { setConfirmPasswordError('Passwords do not match'); return; }

    try {
      const response = await axios.post('/api/auth/change-password', {
        email: user.email,
        currentPassword,
        newPassword,
        accountType: 'user'
      });
      if (response.data.success) {
        showSuccess('Password updated successfully!');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setPasswordError(''); setNewPasswordErrors([]); setConfirmPasswordError('');
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <form onSubmit={handleUpdatePassword}>
      <PasswordField
        label="Current Password"
        value={currentPassword}
        show={showCurrentPassword}
        onToggle={() => setShowCurrentPassword(v => !v)}
        onChange={setCurrentPassword}
        styles={styles}
      />
      <PasswordField
        label="New Password"
        value={newPassword}
        show={showNewPassword}
        onToggle={() => setShowNewPassword(v => !v)}
        onChange={handleNewPasswordChange}
        errors={newPasswordErrors}
        successMsg={newPasswordErrors.length === 0 && newPassword ? '✓ Password is valid' : null}
        styles={styles}
      />
      <PasswordField
        label="Confirm New Password"
        value={confirmPassword}
        show={showConfirmPassword}
        onToggle={() => setShowConfirmPassword(v => !v)}
        onChange={handleConfirmPasswordChange}
        errors={confirmPasswordError ? [confirmPasswordError] : []}
        successMsg={!confirmPasswordError && confirmPassword && newPassword === confirmPassword ? '✓ Passwords match' : null}
        styles={styles}
      />
      {passwordError && <div className={styles.errorMessage}>{passwordError}</div>}
      <div className={styles.actions}>
        <button type="submit" className={styles.saveButton}>Update Password</button>
      </div>
    </form>
  );
}

// ─── Address Book Component ───────────────────────────────────────────────────
function AddressBook({ showSuccess, showError, user }) {
  const [addresses, setAddresses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('userAddresses') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [form, setForm] = useState({ label: '', address: '', lat: '', lng: '' });
  const [pickedCoords, setPickedCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const markerRef = useRef(null);

  const save = (list) => {
    setAddresses(list);
    localStorage.setItem('userAddresses', JSON.stringify(list));
  };

  const openAdd = () => {
    setForm({ label: 'Home', address: '', lat: '', lng: '' });
    setEditIndex(null);
    setShowForm(true);
  };

  const openEdit = (i) => {
    setForm(addresses[i]);
    setEditIndex(i);
    setShowForm(true);
  };

  const deleteAddress = (i) => {
    const updated = addresses.filter((_, idx) => idx !== i);
    save(updated);
    showSuccess('Address removed');
  };

  const setDefault = (i) => {
    const updated = addresses.map((a, idx) => ({ ...a, isDefault: idx === i }));
    save(updated);
    showSuccess('Default address updated');
  };

  const handleSaveAddress = () => {
    if (!form.address.trim()) { showError('Please enter or pick an address'); return; }
    const entry = { ...form, isDefault: addresses.length === 0 };
    let updated;
    if (editIndex !== null) {
      updated = addresses.map((a, i) => i === editIndex ? { ...entry, isDefault: a.isDefault } : a);
    } else {
      updated = [...addresses, entry];
    }
    save(updated);
    setShowForm(false);
    showSuccess(editIndex !== null ? 'Address updated' : 'Address saved');
  };

  // Galli Maps search
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://route-init.gallimap.com/api/v1/search/autocomplete?accessToken=${GALLI_TOKEN}&name=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setSearchResults(data?.data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const selectSearchResult = (result) => {
    const lat = result.latitude || result.lat;
    const lng = result.longitude || result.lng || result.lon;
    const address = result.name || result.placeName || result.display_name || searchQuery;
    setForm(f => ({ ...f, address, lat: String(lat), lng: String(lng) }));
    setPickedCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
    setSearchResults([]);
    setSearchQuery('');
    if (markerRef.current) markerRef.current.setLngLat([parseFloat(lng), parseFloat(lat)]);
    if (mapInst.current) mapInst.current.flyTo({ center: [parseFloat(lng), parseFloat(lat)], zoom: 16 });
  };

  // Map picker
  const openMap = () => {
    setPickedCoords(
      form.lat && form.lng
        ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
        : { lat: 27.7172, lng: 85.3240 }
    );
    setShowMap(true);
  };

  const mapCallback = useCallback((node) => {
    mapRef.current = node;
    if (!node || !showMap) return;
    const center = pickedCoords || { lat: 27.7172, lng: 85.3240 };
    loadML().then(() => {
      if (mapInst.current) return;
      const ml = window.maplibregl;
      const map = new ml.Map({ container: node, style: GALLI_STYLE, center: [center.lng, center.lat], zoom: 15 });
      map.addControl(new ml.NavigationControl(), 'top-left');
      mapInst.current = map;

      const el = document.createElement('div');
      el.style.cssText = 'width:26px;height:34px;cursor:grab';
      el.innerHTML = `<svg viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 8.67 13 21 13 21S26 21.67 26 13C26 5.82 20.18 0 13 0z" fill="#22c55e"/>
        <circle cx="13" cy="13" r="5.5" fill="white"/>
      </svg>`;

      markerRef.current = new ml.Marker({ element: el, draggable: true })
        .setLngLat([center.lng, center.lat]).addTo(map);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLngLat();
        setPickedCoords({ lat: pos.lat, lng: pos.lng });
      });
      map.on('click', e => {
        markerRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setPickedCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }).catch(console.error);
  }, [showMap]);

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [mapSearching, setMapSearching] = useState(false);

  const handleMapSearch = async (q) => {
    setMapSearchQuery(q);
    if (q.length < 2) { setMapSearchResults([]); return; }
    setMapSearching(true);
    try {
      const res = await fetch(
        `https://route-init.gallimap.com/api/v1/search?accessToken=${GALLI_TOKEN}&name=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      // API returns GeoJSON FeatureCollection
      const features = data?.data?.features || [];
      // Deduplicate by name
      const seen = new Set();
      const results = features
        .filter(f => {
          const name = f.properties?.searchedItem || q;
          if (seen.has(name)) return false;
          seen.add(name);
          return true;
        })
        .map(f => ({
          name: f.properties?.searchedItem || q,
          district: f.properties?.district || '',
          municipality: f.properties?.municipality || '',
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        }));
      setMapSearchResults(results);
    } catch { setMapSearchResults([]); }
    finally { setMapSearching(false); }
  };

  const selectMapResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lng);
    const name = [result.name, result.municipality, result.district].filter(Boolean).join(', ');
    setPickedCoords({ lat, lng });
    setMapSearchQuery(name);
    setMapSearchResults([]);
    setForm(f => ({ ...f, address: f.address || name }));
    if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
    if (mapInst.current) mapInst.current.flyTo({ center: [lng, lat], zoom: 16 });
  };

  const confirmMap = () => {
    if (pickedCoords) {
      setForm(f => ({
        ...f,
        lat: pickedCoords.lat.toFixed(6),
        lng: pickedCoords.lng.toFixed(6),
        address: f.address || `${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lng.toFixed(5)}`
      }));
    }
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; markerRef.current = null; }
    setShowMap(false);
  };

  const closeMap = () => {
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; markerRef.current = null; }
    setMapSearchQuery('');
    setMapSearchResults([]);
    setShowMap(false);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Address Book</h2>
          <p className={styles.sectionSubtitle}>Manage your delivery addresses</p>
        </div>
        <button className={styles.saveButton} onClick={openAdd} style={{ width: 'auto', padding: '10px 20px' }}>
          + Add Address
        </button>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#d1d5db" strokeWidth="2"/>
            <circle cx="12" cy="10" r="3" stroke="#d1d5db" strokeWidth="2"/>
          </svg>
          <p>No saved addresses</p>
          <button className={styles.browseButton} onClick={openAdd}>Add Your First Address</button>
        </div>
      )}

      {/* Saved addresses list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: showForm ? '24px' : 0 }}>
        {addresses.map((addr, i) => (
          <div key={i} style={{
            background: addr.isDefault ? '#f0fdf4' : '#f9fafb',
            border: `1px solid ${addr.isDefault ? '#86efac' : '#e5e7eb'}`,
            borderRadius: '12px', padding: '16px',
            display: 'flex', alignItems: 'flex-start', gap: '12px'
          }}>
            <div style={{ background: addr.isDefault ? '#22c55e' : '#e5e7eb', borderRadius: '8px', padding: '8px', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={addr.isDefault ? 'white' : '#6b7280'} strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke={addr.isDefault ? 'white' : '#6b7280'} strokeWidth="2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{addr.label}</span>
                {addr.isDefault && <span style={{ background: '#22c55e', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>Default</span>}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{addr.address}</p>
              {addr.lat && addr.lng && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  📍 {parseFloat(addr.lat).toFixed(5)}, {parseFloat(addr.lng).toFixed(5)}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {!addr.isDefault && (
                <button onClick={() => setDefault(i)} style={{ fontSize: '12px', color: '#22c55e', background: 'none', border: '1px solid #22c55e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                  Set Default
                </button>
              )}
              <button onClick={() => openEdit(i)} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                Edit
              </button>
              <button onClick={() => deleteAddress(i)} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            {editIndex !== null ? 'Edit Address' : 'New Address'}
          </h3>

          {/* Label */}
          <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
            <label className={styles.label}>Label</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Home', 'Work', 'Other'].map(l => (
                <button key={l} onClick={() => setForm(f => ({ ...f, label: l }))}
                  style={{ padding: '6px 16px', borderRadius: '999px', border: `1px solid ${form.label === l ? '#22c55e' : '#e5e7eb'}`, background: form.label === l ? '#22c55e' : 'white', color: form.label === l ? 'white' : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
            <label className={styles.label}>Location</label>
            <button onClick={openMap} style={{ padding: '10px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📍 Pick on Map
            </button>
          </div>

          {/* Address text */}
          <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
            <label className={styles.label}>Full Address</label>
            <input
              className={styles.input}
              placeholder="e.g. Thamel, Kathmandu"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
            {form.lat && form.lng && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#22c55e' }}>
                ✅ Location pinned: {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={styles.saveButton} onClick={handleSaveAddress} style={{ flex: 1 }}>
              Save Address
            </button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {showMap && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '640px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Pick Location on Map</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>Search or click/drag the pin to set your location</p>
              </div>
              <button onClick={closeMap} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>✕</button>
            </div>

            {/* Search bar inside map */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search for a place in Nepal..."
                    value={mapSearchQuery}
                    onChange={e => handleMapSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && mapSearchResults.length > 0) selectMapResult(mapSearchResults[0]); }}
                    style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#22c55e'}
                    onBlur={e => e.target.style.borderColor = '#d1d5db'}
                  />
                  {mapSearchQuery && (
                    <button onClick={() => { setMapSearchQuery(''); setMapSearchResults([]); }}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px', padding: '2px' }}>
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleMapSearch(mapSearchQuery)}
                  style={{ padding: '9px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' }}>
                  Search
                </button>
              </div>

              {/* Dropdown results */}
              {(mapSearchResults.length > 0 || mapSearching) && (
                <div style={{ position: 'absolute', left: '16px', right: '16px', top: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                  {mapSearching && (
                    <div style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>Searching...</div>
                  )}
                  {mapSearchResults.map((r, i) => (
                    <button key={i} onClick={() => selectMapResult(r)}
                      style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', borderBottom: i < mapSearchResults.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseOut={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ color: '#22c55e', flexShrink: 0 }}>📍</span>
                      <span>{r.name || r.placeName || r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={mapCallback} style={{ height: '340px', width: '100%' }} />
            {pickedCoords && (
              <div style={{ padding: '10px 20px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' }}>
                📍 Selected: {pickedCoords.lat.toFixed(5)}, {pickedCoords.lng.toFixed(5)}
              </div>
            )}
            <div style={{ padding: '16px 20px', display: 'flex', gap: '10px' }}>
              <button onClick={confirmMap} style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>
                Confirm Location
              </button>
              <button onClick={closeMap} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(null); // subscription being managed
  
  const [profilePicture, setProfilePicture] = useState('');
  const [profilePicturePreview, setProfilePicturePreview] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    deliveryAddress: '',
    city: '',
    area: '',
    ward: '',
    streetAddress: '',
    landmark: ''
  });

  useEffect(() => {
    loadUserData();
    
    // Check if redirected from subscription payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
      setActiveTab('subscription');
      window.history.replaceState({}, '', '/user-profile');
    }
    // Check if redirected to purchase history tab
    if (urlParams.get('tab') === 'orders') {
      setActiveTab('orders');
      window.history.replaceState({}, '', '/user-profile');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'subscription' && user) {
      loadSubscriptions();
    }
  }, [activeTab, user]);
  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      setFormData({
        firstName: parsedUser.firstName || '',
        lastName: parsedUser.lastName || '',
        email: parsedUser.email || '',
        phoneNumber: parsedUser.phoneNumber || '',
        deliveryAddress: parsedUser.deliveryAddress || '',
        city: parsedUser.city || '',
        area: parsedUser.area || '',
        ward: parsedUser.ward || '',
        streetAddress: parsedUser.streetAddress || '',
        landmark: parsedUser.landmark || ''
      });

      // Read picture from separate key (avoids localStorage size limit issues)
      const savedPicture = localStorage.getItem('userProfilePicture') || parsedUser.profilePicture || '';
      setProfilePicture(savedPicture);
      setProfilePicturePreview(savedPicture);      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/login');
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const token = localStorage.getItem('token');
      const userId = user?._id || user?.id;
      
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      console.log('Fetching subscriptions for user:', userId);

      const response = await axios.get(`/api/subscriptions/user?userId=${userId}`, {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      
      console.log('Subscriptions API response:', response.data);
      
      // Handle both response formats
      // The API returns array directly, not wrapped in data object
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      console.log('Parsed subscriptions:', data);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      console.error('Error details:', error.response?.data);
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateNextDelivery = (startDate, frequency) => {
    const start = new Date(startDate);
    const now = new Date();
    
    if (frequency === 'weekly') {
      const daysDiff = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const weeksPassed = Math.floor(daysDiff / 7);
      const nextDelivery = new Date(start);
      nextDelivery.setDate(start.getDate() + (weeksPassed + 1) * 7);
      return nextDelivery;
    } else if (frequency === 'biweekly') {
      const daysDiff = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const biweeksPassed = Math.floor(daysDiff / 14);
      const nextDelivery = new Date(start);
      nextDelivery.setDate(start.getDate() + (biweeksPassed + 1) * 14);
      return nextDelivery;
    } else if (frequency === 'monthly') {
      const nextDelivery = new Date(start);
      nextDelivery.setMonth(now.getMonth() + 1);
      return nextDelivery;
    }
    return start;
  };

  const toggleAutoRenew = async (subscriptionId, currentStatus) => {
    try {
      await axios.patch(`/api/subscriptions/${subscriptionId}/auto-renew`, {
        autoRenew: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      loadSubscriptions();
    } catch (error) {
      console.error('Error updating auto-renew:', error);
      showError('Failed to update auto-renew setting');
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      await axios.patch(`/api/subscriptions/${subscriptionId}/status`, {
        status: 'cancelled'
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      showSuccess('Subscription cancelled successfully');
      loadSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showError('Failed to cancel subscription');
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('Image size must be less than 2MB');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        showError('Only JPG and PNG images are allowed');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress the image before storing to avoid localStorage size limits
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 200; // max 200x200px for avatar
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
          else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setProfilePicture(compressed);
          setProfilePicturePreview(compressed);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture('');
    setProfilePicturePreview('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      // Store profile picture separately to avoid localStorage size limits
      if (profilePicture) {
        try {
          localStorage.setItem('userProfilePicture', profilePicture);
        } catch (e) {
          console.warn('Could not save profile picture to localStorage:', e);
        }
      } else {
        localStorage.removeItem('userProfilePicture');
      }

      // Save user data without the large base64 image inline
      const updatedUser = { ...user, ...formData, profilePicture };
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) {
        // If still too large, save without picture in main user object
        const userWithoutPic = { ...user, ...formData, profilePicture: '' };
        localStorage.setItem('user', JSON.stringify(userWithoutPic));
      }

      setUser(updatedUser);
      window.dispatchEvent(new Event('storage'));
      showSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.userProfile}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className={styles.userProfile}>
      <div className={styles.container}>
      <div className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>SETTINGS</h3>
        
        <button
          className={`${styles.sidebarItem} ${activeTab === 'profile' ? styles.active : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Profile Information
        </button>

        <button
          className={`${styles.sidebarItem} ${activeTab === 'orders' ? styles.active : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Purchase History
        </button>

        <button
          className={`${styles.sidebarItem} ${activeTab === 'subscription' ? styles.active : ''}`}
          onClick={() => setActiveTab('subscription')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Active Subscription
        </button>

        <button
          className={`${styles.sidebarItem} ${activeTab === 'address' ? styles.active : ''}`}
          onClick={() => setActiveTab('address')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Address Book
        </button>

        <button
          className={`${styles.sidebarItem} ${activeTab === 'security' ? styles.active : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Security
        </button>

        <button
          className={`${styles.sidebarItem} ${styles.danger}`}
          onClick={() => setActiveTab('danger')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Danger Zone
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'profile' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Profile Information</h2>
              <p className={styles.sectionSubtitle}>Update your personal details and delivery preferences</p>
            </div>

            <div className={styles.profileHeader}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  {profilePicturePreview ? (
                    <img src={profilePicturePreview} alt="Profile" className={styles.avatarImage} />
                  ) : (
                    <>{formData.firstName?.charAt(0) || 'U'}{formData.lastName?.charAt(0) || 'S'}</>
                  )}
                  <div className={styles.avatarBadge}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                    </svg>
                  </div>
                </div>
                <input
                  type="file"
                  id="user-profile-picture-upload"
                  className={styles.fileInput}
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleProfilePictureChange}
                />
                <div className={styles.avatarActions}>
                  <label htmlFor="user-profile-picture-upload" className={styles.uploadAvatarBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Upload Photo
                  </label>
                  {profilePicturePreview && (
                    <button className={styles.removeAvatarBtn} onClick={handleRemoveProfilePicture}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.profileInfo}>
                <h3 className={styles.profileName}>
                  {formData.firstName} {formData.lastName}
                </h3>
                <p className={styles.profileBadge}>USER ACCOUNT</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  name="firstName"
                  className={styles.input}
                  value={`${formData.firstName} ${formData.lastName}`}
                  onChange={(e) => {
                    const names = e.target.value.split(' ');
                    setFormData(prev => ({
                      ...prev,
                      firstName: names[0] || '',
                      lastName: names.slice(1).join(' ') || ''
                    }));
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  className={styles.input}
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  className={styles.input}
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles.deliverySection}>
              <h3 className={styles.deliveryTitle}>Default Delivery Location</h3>
              
              <div className={styles.deliveryCard}>
                <div className={styles.deliveryIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="white" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
                <div className={styles.deliveryInfo}>
                  <h4 className={styles.deliveryLabel}>Delivery Address</h4>
                  <p className={styles.deliveryText}>
                    {formData.deliveryAddress || 'No default address set'}
                  </p>
                </div>
                <button className={styles.viewMapButton}>View on Map</button>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.saveButton} onClick={handleSaveChanges}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <OrderHistory user={user} />
        )}

        {activeTab === 'subscription' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Active Subscription</h2>
                <p className={styles.sectionSubtitle}>Manage your subscription plans</p>
              </div>
              <button 
                onClick={() => loadSubscriptions()}
                disabled={loadingSubscriptions}
                style={{
                  padding: '10px 20px',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loadingSubscriptions ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !loadingSubscriptions && (e.target.style.background = '#16a34a')}
                onMouseOut={(e) => !loadingSubscriptions && (e.target.style.background = '#22c55e')}
              >
                <span style={{ fontSize: '16px' }}>🔄</span>
                {loadingSubscriptions ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {loadingSubscriptions ? (
              <div className={styles.emptyState}>
                <p>Loading subscriptions...</p>
              </div>
            ) : (
              <>
                {subscriptions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No subscriptions found</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                      Subscribe to a plan to get fresh vegetables delivered weekly
                    </p>
                    <button 
                      className={styles.browseButton}
                      onClick={() => navigate('/subscription')}
                    >
                      Browse Subscription Plans
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Show warning if no active subscriptions but have other statuses */}
                    {subscriptions.filter(sub => sub.status === 'active').length === 0 && (
                      <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '8px', marginBottom: '16px' }}>
                        <p style={{ margin: 0, color: '#92400e' }}>
                          No active subscriptions found. 
                          {subscriptions.filter(sub => sub.status === 'pending').length > 0 && 
                            ' You have pending subscriptions waiting for payment confirmation.'}
                        </p>
                      </div>
                    )}

                {/* Pending subscriptions */}
                {subscriptions
                  .filter(sub => sub.status === 'pending')
                  .map((subscription) => {
                    return (
                      <div key={subscription._id} className={styles.subscriptionCard} style={{ opacity: 0.7, border: '2px dashed #fbbf24' }}>
                        <div className={styles.subscriptionHeader}>
                          <div className={styles.subscriptionIcon} style={{ background: '#fbbf24' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div className={styles.subscriptionInfo}>
                            <h3 className={styles.subscriptionName}>
                              {subscription.deliveryFrequency?.charAt(0).toUpperCase() + subscription.deliveryFrequency?.slice(1) || 'Weekly'} Organic Box
                            </h3>
                            <p className={styles.subscriptionPlan}>{subscription.planType} Plan</p>
                          </div>
                          <span className={styles.activeBadge} style={{ background: '#fbbf24' }}>Pending Payment</span>
                        </div>
                        <div style={{ padding: '16px', fontSize: '14px', color: '#92400e', background: '#fef3c7', borderRadius: '8px', margin: '16px' }}>
                          This subscription is waiting for payment confirmation. If you've already paid, please wait a few moments for the payment to be processed.
                        </div>
                      </div>
                    );
                  })}

                {subscriptions
                  .filter(sub => sub.status === 'active')
                  .map((subscription) => {
                    const nextDelivery = calculateNextDelivery(subscription.startDate, subscription.deliveryFrequency);
                    
                    return (
                      <div key={subscription._id} className={styles.subscriptionCard}>
                        <div className={styles.subscriptionHeader}>
                          <div className={styles.subscriptionIcon}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="12" y1="22.08" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div className={styles.subscriptionInfo}>
                            <h3 className={styles.subscriptionName}>
                              {subscription.deliveryFrequency.charAt(0).toUpperCase() + subscription.deliveryFrequency.slice(1)} Organic Box
                            </h3>
                            <p className={styles.subscriptionPlan}>{subscription.planType} Plan</p>
                          </div>
                          <span className={styles.activeBadge}>Active</span>
                        </div>

                        <div className={styles.subscriptionDetails}>
                          <div className={styles.detailItem}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            <div>
                              <p className={styles.detailLabel}>Next Delivery</p>
                              <p className={styles.detailValue}>{formatDate(nextDelivery)}</p>
                            </div>
                          </div>
                          <div className={styles.detailItem}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div>
                              <p className={styles.detailLabel}>Billing Cycle</p>
                              <p className={styles.detailValue}>
                                {subscription.deliveryFrequency.charAt(0).toUpperCase() + subscription.deliveryFrequency.slice(1)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className={styles.subscriptionPricing}>
                          <div>
                            <p className={styles.pricingLabel}>Amount per cycle</p>
                            <p className={styles.pricingAmount}>₹{subscription.totalAmount}</p>
                          </div>
                        </div>

                        <div className={styles.subscriptionActions}>
                          <button 
                            className={styles.manageButton}
                            onClick={() => setManagingSubscription(subscription)}
                          >
                            Manage Subscription
                          </button>
                          <button 
                            className={styles.cancelButton}
                            onClick={() => handleCancelSubscription(subscription._id)}
                          >
                            Cancel Subscription
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {/* Subscription History */}
                {subscriptions.length > 0 && (
                  <div className={styles.historySection}>
                    <h3 className={styles.historyTitle}>Subscription History</h3>
                    <p className={styles.historySubtitle}>Past deliveries and billing records</p>

                    <div className={styles.historyList}>
                      {subscriptions
                        .filter(sub => sub.status === 'completed' || sub.status === 'active')
                        .slice(0, 5)
                        .map((subscription, index) => (
                          <div key={`${subscription._id}-${index}`} className={styles.historyItem}>
                            <div className={styles.historyInfo}>
                              <p className={styles.historyName}>
                                {subscription.deliveryFrequency.charAt(0).toUpperCase() + subscription.deliveryFrequency.slice(1)} Organic Box
                              </p>
                              <p className={styles.historyDate}>{formatDate(subscription.startDate)}</p>
                            </div>
                            <div className={styles.historyAmount}>
                              <p className={styles.historyPrice}>₹{subscription.totalAmount}</p>
                              <span className={styles.historyStatus}>
                                {subscription.status === 'active' ? 'Active' : 'Delivered'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Manage Subscription Modal */}
        {managingSubscription && (
          <ManageSubscriptionModal
            subscription={managingSubscription}
            onClose={() => setManagingSubscription(null)}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {activeTab === 'address' && (
          <AddressBook showSuccess={showSuccess} showError={showError} user={user} />
        )}

        {activeTab === 'security' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Change Password</h2>
              <p className={styles.sectionSubtitle}>Ensure your account stays secure by updating your password regularly.</p>
            </div>
            <SecuritySection user={user} showSuccess={showSuccess} showError={showError} />
          </div>
        )}

        {activeTab === 'danger' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Danger Zone</h2>
              <p className={styles.sectionSubtitle}>Irreversible actions for your account.</p>
            </div>
            <DangerZone user={user} navigate={navigate} />
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  );
}
