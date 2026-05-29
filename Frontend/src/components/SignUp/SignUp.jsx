import React, { useState } from "react";
import OtpVerify from "./OtpVerify";
import axios from "axios";
import styles from "./SignUp.module.css";
import logoImg from '../../assets/Logo.png';
import { useNavigate, Link } from "react-router-dom";

// Password validation regex: 8-30 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (!@#$%^&*), no whitespace
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,30}$/;

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
    errors.push("Password must contain at least one special character (!@#$%^&*)");
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

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Please enter a valid email address";
  }

  return errors;
};

export default function SignUp() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
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
    
    // Check confirm password match if it's already filled
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate fields
    const errors = validateFields(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Validate password
    const pwdErrors = validatePassword(form.password);
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors);
      return;
    }

    // Check password match
    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await axios.post("/api/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      if (response.data) {
        setShowOtp(true);
        setEmail(form.email);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Registration failed. Please check your connection and try again.";
      setErrorMessage(errorMsg);
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) return <OtpVerify email={email} />;

  return (
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
              <span className={styles.title}>Sign Up</span>
              <p className={styles.subtitle}>Create your AgroConnect account</p>
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
                <div className={styles.inputGroup} style={{ position: 'relative' }}>
                  <label className={styles.label}>Password</label>
                  <div style={{ display: "flex", alignItems: "center", position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={styles.input}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      required
                      style={{ paddingRight: '36px' }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)', background: 'none', border: 'none',
                        padding: 0, cursor: 'pointer', height: 24, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/><line x1="4" y1="20" x2="20" y2="4" stroke="#999" strokeWidth="2"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                {passwordErrors.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    {passwordErrors.map((error, index) => (
                      <div
                        key={index}
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        • {error}
                      </div>
                    ))}
                  </div>
                )}
                {passwordErrors.length === 0 && form.password && (
                  <div
                    style={{
                      color: "#22c55e",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    ✓ Password is valid
                  </div>
                )}
                <div className={styles.inputGroup} style={{ position: 'relative' }}>
                  <label className={styles.label}>Confirm Password</label>
                  <div style={{ display: "flex", alignItems: "center", position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={styles.input}
                      placeholder="Confirm Password"
                      value={form.confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      required
                      style={{ paddingRight: '36px' }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)', background: 'none', border: 'none',
                        padding: 0, cursor: 'pointer', height: 24, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(v => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/><line x1="4" y1="20" x2="20" y2="4" stroke="#999" strokeWidth="2"/></svg>
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <div
                      style={{
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      • {confirmPasswordError}
                    </div>
                  )}
                  {!confirmPasswordError &&
                    form.confirmPassword &&
                    form.password === form.confirmPassword && (
                      <div
                        style={{
                          color: "#22c55e",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        ✓ Passwords match
                      </div>
                    )}
                </div>
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
              >
                {loading ? "Sending OTP..." : "Sign Up"}
              </button>
            </form>
            <p className={styles.loginLink}>
              Already have an account?{" "}
              <Link to="/login" className={styles.linkBtn}>
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
