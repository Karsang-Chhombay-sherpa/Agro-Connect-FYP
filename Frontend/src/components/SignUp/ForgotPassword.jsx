import React, { useState } from "react";
import axios from "axios";
import styles from "./SignUp.module.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import ResetPassword from "./ResetPassword";
import logoImg from '../../assets/Logo.png';

export default function ForgotPassword({ initialAccountType, onBack }) {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  // Use initialAccountType if provided, otherwise check URL params, otherwise default to user
  const [accountType, setAccountType] = useState(
    initialAccountType ||
      (searchParams.get("type") === "farmer" ? "farmer" : "user")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigate = useNavigate();

  // If initialAccountType is provided, don't allow changing account type
  const allowAccountTypeChange = !initialAccountType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Validate email is provided
    if (!email || email.trim() === "") {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/auth/forgot-password", {
        email: email.trim(),
        accountType,
      });

      if (response.data.success) {
        setSuccess(response.data.message || "OTP sent successfully!");
        setShowResetPassword(true);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      
      // Handle different error scenarios with specific messages
      if (!err.response) {
        setError(
          "Unable to connect to server. Please check your internet connection and try again."
        );
      } else {
        const statusCode = err.response.status;
        const errorMessage = err.response?.data?.message || "Failed to send OTP. Please try again.";
        
        // Provide user-friendly error messages based on status code
        if (statusCode === 404) {
          setError(`No ${accountType} account found with this email address. Please check your email or try a different account type.`);
        } else if (statusCode === 400) {
          setError(errorMessage);
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

  if (showResetPassword) {
    return (
      <ResetPassword
        email={email}
        accountType={accountType}
        onBack={() => setShowResetPassword(false)}
      />
    );
  }

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
              &larr; Back to Login
            </button>
            <div className={styles.header}>
              <span className={styles.title}>Forgot Password</span>
              <p className={styles.subtitle}>
                Enter your email to receive a password reset OTP
              </p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              {allowAccountTypeChange && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Login As</label>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setAccountType("user")}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        background:
                          accountType === "user" ? "#22c55e" : "#f3f4f6",
                        color: accountType === "user" ? "white" : "#374151",
                        border: "1px solid",
                        borderColor:
                          accountType === "user" ? "#22c55e" : "#d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: accountType === "user" ? "600" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("farmer")}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        background:
                          accountType === "farmer" ? "#22c55e" : "#f3f4f6",
                        color: accountType === "farmer" ? "white" : "#374151",
                        border: "1px solid",
                        borderColor:
                          accountType === "farmer" ? "#22c55e" : "#d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: accountType === "farmer" ? "600" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Farmer
                    </button>
                  </div>
                </div>
              )}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
                  ✓ {success}
                </div>
              )}
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading}
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
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
