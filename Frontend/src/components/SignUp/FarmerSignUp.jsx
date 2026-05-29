import React, { useState, useRef, useCallback } from "react";
import OtpVerify from "./OtpVerify";
import axios from "axios";
import styles from "./SignUp.module.css";
import { useNavigate, Link } from "react-router-dom";
import logoImg from '../../assets/Logo.png';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,30}$/;

const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8 || password.length > 30) {
    errors.push("Password must be 8-30 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*)"
    );
  }
  if (/\s/.test(password)) {
    errors.push("Password must not contain whitespace");
  }
  return errors;
};

const validateFields = (form) => {
  const errors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "First name is required";
  } else if (!NAME_REGEX.test(form.firstName.trim())) {
    errors.firstName = "First name must contain only letters";
  } else if (form.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required";
  } else if (!NAME_REGEX.test(form.lastName.trim())) {
    errors.lastName = "Last name must contain only letters";
  } else if (form.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters";
  }

  if (!form.farmName.trim()) {
    errors.farmName = "Farm name is required";
  } else if (form.farmName.trim().length < 2) {
    errors.farmName = "Farm name must be at least 2 characters";
  }

  if (!form.location.trim()) {
    errors.location = "Location is required";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Please enter a valid email address";
  }

  return errors;
};

const GALLI_TOKEN = import.meta.env.VITE_GALLI_TOKEN || '';
const GALLI_STYLE = `https://map-init.gallimap.com/styles/light/style.json?accessToken=${GALLI_TOKEN}`;

let mlLoaded = false;
const loadML = () => new Promise((resolve, reject) => {
  if (window.maplibregl) { resolve(); return; }
  if (mlLoaded) { const t = setInterval(() => { if (window.maplibregl) { clearInterval(t); resolve(); } }, 100); return; }
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

export default function FarmerSignUp() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    farmName: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = (password) => {
    setForm({ ...form, password });
    const errors = validatePassword(password);
    setPasswordErrors(errors);
    if (form.confirmPassword) {
      if (password !== form.confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  const handleConfirmPasswordChange = (confirmPassword) => {
    setForm({ ...form, confirmPassword });
    if (confirmPassword !== form.password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setErrorMessage("");
    
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      setForm({
        ...form,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6)
      });
      
      setErrorMessage(""); // Clear any previous errors
    } catch (err) {
      let errorMessage = "Unable to get your location. ";
      if (err.code === 1) {
        errorMessage += "Please enable location access or use 'Set on Map' option.";
      } else if (err.code === 2) {
        errorMessage += "Location information unavailable.";
      } else if (err.code === 3) {
        errorMessage += "Location request timed out.";
      } else {
        errorMessage += "Please use 'Set on Map' option.";
      }
      setErrorMessage(errorMessage);
    } finally {
      setGettingLocation(false);
    }
  };

  const [showMapPicker, setShowMapPicker] = useState(false);
  const mapPickerRef   = useRef(null);
  const mapPickerInst  = useRef(null);
  const markerRef      = useRef(null);
  const [pickedCoords, setPickedCoords] = useState(null);
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
      const features = data?.data?.features || [];
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
    if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
    if (mapPickerInst.current) mapPickerInst.current.flyTo({ center: [lng, lat], zoom: 16 });
  };

  // Load MapLibre once
  const handleSetOnMap = () => {
    setPickedCoords(
      form.latitude && form.longitude
        ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }
        : { lat: 27.7172, lng: 85.3240 }
    );
    setShowMapPicker(true);
  };

  // Init map when modal opens — use a callback ref so we know when the div mounts
  const mapPickerCallback = useCallback((node) => {
    mapPickerRef.current = node;
    if (!node || !showMapPicker) return;
    const center = pickedCoords || { lat: 27.7172, lng: 85.3240 };

    loadML().then(() => {
      if (mapPickerInst.current) return;
      const ml  = window.maplibregl;
      const map = new ml.Map({
        container: node,
        style:     GALLI_STYLE,
        center:    [center.lng, center.lat],
        zoom:      14,
      });
      map.addControl(new ml.NavigationControl(), 'top-left');
      mapPickerInst.current = map;

      const el = document.createElement('div');
      el.style.cssText = 'width:26px;height:34px;cursor:grab';
      el.innerHTML = `<svg viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 8.67 13 21 13 21S26 21.67 26 13C26 5.82 20.18 0 13 0z" fill="#22c55e"/>
        <circle cx="13" cy="13" r="5.5" fill="white"/>
      </svg>`;

      markerRef.current = new ml.Marker({ element: el, draggable: true })
        .setLngLat([center.lng, center.lat])
        .addTo(map);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLngLat();
        setPickedCoords({ lat: pos.lat, lng: pos.lng });
      });

      map.on('click', e => {
        markerRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setPickedCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }).catch(console.error);
  }, [showMapPicker]);

  const confirmMapLocation = () => {
    if (pickedCoords) {
      setForm(f => ({
        ...f,
        latitude:  pickedCoords.lat.toFixed(6),
        longitude: pickedCoords.lng.toFixed(6),
      }));
      setErrorMessage('');
    }
    // destroy map instance so it re-inits fresh next open
    if (mapPickerInst.current) {
      mapPickerInst.current.remove();
      mapPickerInst.current = null;
      markerRef.current = null;
    }
    setShowMapPicker(false);
  };

  const closeMapPicker = () => {
    if (mapPickerInst.current) {
      mapPickerInst.current.remove();
      mapPickerInst.current = null;
      markerRef.current = null;
    }
    setShowMapPicker(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate fields
    const errors = validateFields(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const pwdErrors = validatePassword(form.password);
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }
    
    // Validate coordinates
    if (!form.latitude || !form.longitude) {
      setErrorMessage("Please provide your farm location coordinates");
      return;
    }
    
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      setErrorMessage("Please enter valid coordinates");
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setErrorMessage("Latitude must be between -90 and 90");
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setErrorMessage("Longitude must be between -180 and 180");
      return;
    }
    
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await axios.post("/api/auth/farmer-register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        farmName: form.farmName,
        location: form.location,
        latitude: lat,
        longitude: lng,
      });
      if (response.data) {
        setShowOtp(true);
        setEmail(form.email);
      }
    } catch (err) {
      console.error("Farmer Registration error:", err);
      if (err?.response?.status === 404) {
        setErrorMessage(
          "Backend server not found. Please make sure your backend server is running on port 5000."
        );
      } else {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Registration failed. Please check your connection and try again.";
        setErrorMessage(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) return <OtpVerify email={email} />;

  return (
    <>
    <div className={styles.signupPage}>
      <div className={styles.container}>
        <div className={styles.brandLogo}>
          <img src={logoImg} alt="AgroConnect" />
          <span className={styles.brandName}>AgroConnect</span>
        </div>
        <div className={styles.formContainer}>
          <div className={styles.formContent}>
            <button
              onClick={() => navigate("/")}
              style={{
                marginBottom: 24,
                background: "none",
                border: "none",
                color: "#22c55e",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                textDecoration: "underline",
                alignSelf: "flex-start",
              }}
            >
              &larr; Back
            </button>
            <div className={styles.header}>
              <span className={styles.title}>Farmer Registration</span>
              <p className={styles.subtitle}>
                Register your farm business with AgroConnect
              </p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>First Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => {
                    setForm({ ...form, firstName: e.target.value });
                    if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                />
                {fieldErrors.firstName && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>• {fieldErrors.firstName}</div>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Last Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => {
                    setForm({ ...form, lastName: e.target.value });
                    if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                />
                {fieldErrors.lastName && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>• {fieldErrors.lastName}</div>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Farm Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Farm Name"
                  value={form.farmName}
                  onChange={(e) => {
                    setForm({ ...form, farmName: e.target.value });
                    if (fieldErrors.farmName) setFieldErrors(prev => ({ ...prev, farmName: '' }));
                  }}
                />
                {fieldErrors.farmName && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>• {fieldErrors.farmName}</div>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Location</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Kathmandu, Nepal"
                  value={form.location}
                  onChange={(e) => {
                    setForm({ ...form, location: e.target.value });
                    if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: '' }));
                  }}
                />
                {fieldErrors.location && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>• {fieldErrors.location}</div>
                )}
              </div>
              
              {/* Farm Location Section - Simplified */}
              <div style={{ 
                padding: '16px', 
                background: '#f9fafb', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                marginBottom: '16px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label className={styles.label} style={{ marginBottom: '8px', display: 'block' }}>
                    Farm Location *
                  </label>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                    Set your farm location to help customers find nearby products
                  </p>
                  
                  {/* Two Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={gettingLocation}
                      style={{
                        padding: '12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: gettingLocation ? 'not-allowed' : 'pointer',
                        opacity: gettingLocation ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {gettingLocation ? 'Getting...' : 'Current Location'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSetOnMap}
                      style={{
                        padding: '12px',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Set on Map
                    </button>
                  </div>
                  
                  {/* Location Status Display */}
                  {form.latitude && form.longitude ? (
                    <div style={{ 
                      padding: '12px', 
                      background: '#f0fdf4', 
                      borderRadius: '8px', 
                      border: '1px solid #86efac',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#22c55e" strokeWidth="2"/>
                      </svg>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', color: '#166534', fontWeight: '600', margin: 0 }}>
                          Location Set
                        </p>
                        <p style={{ fontSize: '12px', color: '#16a34a', margin: '2px 0 0 0' }}>
                          {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '12px', 
                      background: '#fef2f2', 
                      borderRadius: '8px', 
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#ef4444" strokeWidth="2"/>
                      </svg>
                      <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                        Please set your farm location using one of the buttons above
                      </p>
                    </div>
                  )}
                  
                  {/* Hidden inputs for form validation */}
                  <input
                    type="hidden"
                    name="latitude"
                    value={form.latitude}
                    required
                  />
                  <input
                    type="hidden"
                    name="longitude"
                    value={form.longitude}
                    required
                  />
                  
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ fontSize: '13px', color: '#6b7280', cursor: 'pointer', userSelect: 'none' }}>
                      How to set location on map?
                    </summary>
                    <ol style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '20px', marginTop: '8px', marginBottom: 0 }}>
                      <li>Click "Set on Map" button above</li>
                      <li>A map will open — click your exact farm location</li>
                      <li>Drag the green pin to fine-tune</li>
                      <li>Click "Confirm Location"</li>
                    </ol>
                  </details>
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                />
                {fieldErrors.email && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>• {fieldErrors.email}</div>
                )}
              </div>
              <div
                className={styles.inputGroup}
                style={{ position: "relative" }}
              >
                <label className={styles.label}>Password</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.input}
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    style={{ paddingRight: "36px" }}
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      height: 24,
                      width: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z"
                          stroke="#999"
                          strokeWidth="2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="#999"
                          strokeWidth="2"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z"
                          stroke="#999"
                          strokeWidth="2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="#999"
                          strokeWidth="2"
                        />
                        <line
                          x1="4"
                          y1="20"
                          x2="20"
                          y2="4"
                          stroke="#999"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div
                className={styles.inputGroup}
                style={{ position: "relative" }}
              >
                <label className={styles.label}>Confirm Password</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={styles.input}
                    placeholder="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleConfirmPasswordChange(e.target.value)
                    }
                    required
                    style={{ paddingRight: "36px" }}
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      height: 24,
                      width: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z"
                          stroke="#999"
                          strokeWidth="2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="#999"
                          strokeWidth="2"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z"
                          stroke="#999"
                          strokeWidth="2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="#999"
                          strokeWidth="2"
                        />
                        <line
                          x1="4"
                          y1="20"
                          x2="20"
                          y2="4"
                          stroke="#999"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {passwordErrors.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  {passwordErrors.map((error, index) => (
                    <div key={index} style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                      • {error}
                    </div>
                  ))}
                </div>
              )}
              {passwordErrors.length === 0 && form.password && (
                <div style={{ color: "#22c55e", fontSize: "12px", marginTop: "4px" }}>✓ Password is valid</div>
              )}
              {confirmPasswordError && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>• {confirmPasswordError}</div>
              )}
              {!confirmPasswordError && form.confirmPassword && form.password === form.confirmPassword && (
                <div style={{ color: "#22c55e", fontSize: "12px", marginTop: "4px" }}>✓ Passwords match</div>
              )}
              {errorMessage && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: "14px",
                    padding: "12px",
                    background: "#fef2f2",
                    borderRadius: "8px",
                    border: "1px solid #ef4444",
                    textAlign: "center",
                  }}
                >
                  ✗ {errorMessage}
                </div>
              )}
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading}
                style={{
                  background: "#22c55e",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = "#16a34a";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.background = "#22c55e";
                }}
              >
                {loading ? "Sending OTP..." : "Register as Farmer"}
              </button>
            </form>
            <p className={styles.loginLink}>
              Already a registered farmer?{" "}
              <Link
                to="/login?type=farmer"
                className={styles.linkBtn}
                style={{ color: "#22c55e" }}
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* ── Map Picker Modal ── */}
    {showMapPicker && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}>
        <div style={{
          background: 'white', borderRadius: '16px', width: '100%', maxWidth: '680px',
          overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,.2)'
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#1f2937' }}>📍 Set Farm Location</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Search or click/drag the pin to your farm</div>
            </div>
            <button onClick={closeMapPicker} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: '#6b7280' }}>✕</button>
          </div>

          {/* Search bar */}
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
                  placeholder="Search for your farm location..."
                  value={mapSearchQuery}
                  onChange={e => handleMapSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && mapSearchResults.length > 0) selectMapResult(mapSearchResults[0]); }}
                  style={{ width: '100%', padding: '9px 32px 9px 34px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
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
            {(mapSearchResults.length > 0 || mapSearching) && (
              <div style={{ position: 'absolute', left: '16px', right: '16px', top: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                {mapSearching && <div style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>Searching...</div>}
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

          {/* Map */}
          <div ref={mapPickerCallback} style={{ width: '100%', height: '360px' }} />

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {pickedCoords
                ? <span>📌 <strong style={{ color: '#1f2937' }}>{pickedCoords.lat.toFixed(5)}, {pickedCoords.lng.toFixed(5)}</strong></span>
                : 'No location selected'
              }
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={closeMapPicker} style={{ padding: '9px 18px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={confirmMapLocation} disabled={!pickedCoords} style={{ padding: '9px 20px', background: pickedCoords ? '#22c55e' : '#d1d5db', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: pickedCoords ? 'pointer' : 'not-allowed' }}>
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
