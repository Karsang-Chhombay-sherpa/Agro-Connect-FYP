import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../SignUp/SignUp.module.css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.signupPage}>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <div className={styles.formContent}>
            <div className={styles.header}>
              <span className={styles.title}>Profile</span>
              <p className={styles.subtitle}>Your Account Information</p>
            </div>
            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>First Name</label>
                <div
                  style={{
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "#f9fafb",
                    color: "#22c55e",
                    fontSize: "16px",
                  }}
                >
                  {user.firstName || "N/A"}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Last Name</label>
                <div
                  style={{
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "#f9fafb",
                    color: "#22c55e",
                    fontSize: "16px",
                  }}
                >
                  {user.lastName || "N/A"}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <div
                  style={{
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "#f9fafb",
                    color: "#22c55e",
                    fontSize: "16px",
                  }}
                >
                  {user.email}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Account Status</label>
                <div
                  style={{
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "#f9fafb",
                    color: "#22c55e",
                    fontSize: "16px",
                  }}
                >
                  {user.verified ? "✓ Verified" : "✗ Not Verified"}
                </div>
              </div>
              <button
                className={styles.submitBtn}
                onClick={handleLogout}
                style={{ background: "#d41818", marginTop: "20px" }}
              >
                Logout
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  background: "transparent",
                  color: "#22c55e",
                  border: "2px solid #22c55e",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
