import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./SignUp.module.css";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import logoImg from '../../assets/Logo.png';

export default function Login({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: "",
    password: "",
    accountType: "user",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordAccountType, setForgotPasswordAccountType] =
    useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if farmer is specified in URL params
    const accountType = searchParams.get("type");
    if (accountType === "farmer") {
      setForm((prev) => ({ ...prev, accountType: "farmer" }));
    }
  }, [searchParams]);

  if (showForgotPassword) {
    return (
      <ForgotPassword
        initialAccountType={forgotPasswordAccountType}
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", {
        email: form.email,
        password: form.password,
        accountType: form.accountType,
      });
      if (res.data && res.data.success) {
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onLogin && onLogin(res.data.user);
        // Redirect based on account type
        if (res.data.user.userType === "farmer") {
          navigate("/farmer-dashboard");
        } else if (res.data.user.userType === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/"); // Redirect users to landing page
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
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
              onClick={() => navigate("/")}
              style={{
                marginBottom: 24,
                background: "none",
                border: "none",
                color: form.accountType === "farmer" ? "#22c55e" : "#22c55e",
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
              <span className={styles.title}>Login</span>
              <p className={styles.subtitle}>Login to your account</p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Login As</label>
                <div
                  style={{ display: "flex", gap: "12px", marginBottom: "8px" }}
                >
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, accountType: "user" })}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: form.accountType === "user" ? "#22c55e" : "#f3f4f6",
                      color: form.accountType === "user" ? "white" : "#374151",
                      border: "1px solid",
                      borderColor: form.accountType === "user" ? "#22c55e" : "#d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: form.accountType === "user" ? "600" : "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, accountType: "farmer" })}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: form.accountType === "farmer" ? "#22c55e" : "#f3f4f6",
                      color: form.accountType === "farmer" ? "white" : "#374151",
                      border: "1px solid",
                      borderColor: form.accountType === "farmer" ? "#22c55e" : "#d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: form.accountType === "farmer" ? "600" : "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Farmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, accountType: "admin" })}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: form.accountType === "admin" ? "#1e40af" : "#f3f4f6",
                      color: form.accountType === "admin" ? "white" : "#374151",
                      border: "1px solid",
                      borderColor: form.accountType === "admin" ? "#1e40af" : "#d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: form.accountType === "admin" ? "600" : "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Admin
                  </button>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
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
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
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
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      // Eye (show)
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
                      // Slashed Eye (hide)
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
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "-8px",
                  marginBottom: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordAccountType(form.accountType);
                    setShowForgotPassword(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      form.accountType === "farmer" ? "#22c55e" : "#22c55e",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              {error && (
                <div style={{ color: "red", textAlign: "center" }}>{error}</div>
              )}
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading}
                style={{
                  background: form.accountType === "admin" ? "#1e40af" : "#22c55e",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = form.accountType === "admin" ? "#1e3a8a" : "#16a34a";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.background = form.accountType === "admin" ? "#1e40af" : "#22c55e";
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            <p className={styles.loginLink}>
              {form.accountType !== "admin" && (
                <>
                  Don't have an account?{" "}
                  {form.accountType === "farmer" ? (
                    <Link to="/farmer-signup" className={styles.linkBtn} style={{ color: "#22c55e" }}>
                      Create one
                    </Link>
                  ) : (
                    <Link to="/signup" className={styles.linkBtn}>
                      Create one
                    </Link>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
