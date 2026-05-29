import React, { useState } from "react";
import axios from "axios";
import styles from "./SignUp.module.css";
import { useNavigate } from "react-router-dom";
import logoImg from '../../assets/Logo.png';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,30}$/;

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

export default function ResetPassword({ email, accountType, onBack }) {
  const [form, setForm] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handlePasswordChange = (password) => {
    setForm({ ...form, newPassword: password });
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
    if (confirmPassword !== form.newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setPasswordErrors([]);
    setConfirmPasswordError("");

    // Validate OTP
    if (!form.otp || form.otp.trim() === "") {
      setError("Please enter the OTP sent to your email.");
      return;
    }

    if (form.otp.length !== 6 || !/^\d{6}$/.test(form.otp)) {
      setError("OTP must be a 6-digit number.");
      return;
    }

    // Validate password
    if (!form.newPassword || form.newPassword.trim() === "") {
      setError("Please enter a new password.");
      const pwdErrors = validatePassword("");
      setPasswordErrors(pwdErrors);
      return;
    }

    const pwdErrors = validatePassword(form.newPassword);
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors);
      setError("Please fix the password errors before submitting.");
      return;
    }

    // Check password match
    if (!form.confirmPassword || form.confirmPassword.trim() === "") {
      setConfirmPasswordError("Please confirm your password.");
      setError("Please confirm your password.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/auth/reset-password", {
        email,
        otp: form.otp.trim(),
        newPassword: form.newPassword,
        accountType,
      });

      if (response.data.success) {
        setSuccess(true);
        // Show success message briefly, then redirect to login page
        setTimeout(() => {
          if (accountType === "farmer") {
            window.location.href = "/login?type=farmer";
          } else {
            window.location.href = "/login";
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      
      // Handle different error scenarios with specific messages
      if (!err.response) {
        setError(
          "Unable to connect to server. Please check your internet connection and try again."
        );
      } else {
        const statusCode = err.response.status;
        const errorMessage = err.response?.data?.message || "Failed to reset password. Please try again.";
        
        // Provide user-friendly error messages based on status code
        if (statusCode === 400) {
          // Check if it's an OTP error
          if (errorMessage.toLowerCase().includes("otp")) {
            setError("Invalid or expired OTP. Please check your email or request a new OTP.");
          } else if (errorMessage.toLowerCase().includes("password")) {
            setError(errorMessage);
          } else {
            setError(errorMessage);
          }
        } else if (statusCode === 404) {
          setError("Account not found. Please try the forgot password process again.");
        } else if (statusCode === 500) {
          setError("Server error occurred. Please try again later.");
        } else {
          setError(errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (onBack) {
                  onBack();
                } else {
                  navigate(
                    "/login" + (accountType === "farmer" ? "?type=farmer" : "")
                  );
                }
              }}
              style={{
                marginBottom: 24,
                background: "none",
                border: "none",
                color: accountType === "farmer" ? "#22c55e" : "#22c55e",
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
              <span className={styles.title}>Reset Password</span>
              <p className={styles.subtitle}>
                Enter the OTP sent to <b>{email}</b> and your new password
              </p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>OTP</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter 6-digit OTP"
                  value={form.otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setForm({ ...form, otp: value });
                  }}
                  maxLength={6}
                  required
                  style={{
                    textAlign: "center",
                    letterSpacing: "8px",
                    fontSize: "20px",
                    fontWeight: "600",
                  }}
                />
                {form.otp.length > 0 && form.otp.length < 6 && (
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                    Enter {6 - form.otp.length} more digit{6 - form.otp.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div
                className={styles.inputGroup}
                style={{ position: "relative" }}
              >
                <label className={styles.label}>New Password</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className={styles.input}
                    placeholder="New Password"
                    value={form.newPassword}
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
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showNewPassword ? (
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
                {passwordErrors.length === 0 && form.newPassword && (
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
              </div>
              <div
                className={styles.inputGroup}
                style={{ position: "relative" }}
              >
                <label className={styles.label}>Confirm New Password</label>
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
                    placeholder="Confirm New Password"
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
                  form.newPassword === form.confirmPassword && (
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
              {error && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: "14px",
                    textAlign: "center",
                    padding: "12px",
                    background: "#fef2f2",
                    borderRadius: "8px",
                    border: "1px solid #ef4444",
                  }}
                >
                  ✗ {error}
                </div>
              )}
              {success && (
                <div
                  style={{
                    color: "#22c55e",
                    fontSize: "14px",
                    textAlign: "center",
                    padding: "12px",
                    background: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #22c55e",
                  }}
                >
                  ✓ Password reset successfully! Redirecting to login...
                </div>
              )}
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={
                  loading || passwordErrors.length > 0 || confirmPasswordError
                }
                style={{
                  background: accountType === "farmer" ? "#22c55e" : "#22c55e",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background =
                      accountType === "farmer" ? "#16a34a" : "#16a34a";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background =
                      accountType === "farmer" ? "#22c55e" : "#22c55e";
                  }
                }}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
