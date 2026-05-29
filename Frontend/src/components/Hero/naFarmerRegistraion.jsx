import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const sectionStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff7ed',
  borderRadius: '24px',
  boxShadow: '0 10px 24px rgba(0,0,0,0.03)',
  padding: '36px 24px',
  margin: '48px auto',
  maxWidth: 900,
  gap: '40px',
};

const imgStyle = {
  width: 340,
  height: 340,
  objectFit: 'cover',
  borderRadius: '24px',
  boxShadow: '0 8px 18px 0 rgba(255,153,51,0.08)',
  background: '#f5f5dc',
};

const featuresStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const featureRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '18px',
};

const iconWrap = {
  background: '#fee5cb',
  borderRadius: '14px',
  padding: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: 8,
  color: '#331D06',
};
const subtitleStyle = {
  fontSize: '16px',
  color: '#664800',
  marginBottom: 28,
};
const buttonStyle = {
  background: '#d97706',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 36px',
  fontWeight: 600,
  fontSize: '18px',
  marginTop: 28,
  cursor: 'pointer',
};

const FarmerRegistration = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = () => {
      const updatedUserData = localStorage.getItem("user");
      if (updatedUserData) {
        setUser(JSON.parse(updatedUserData));
      } else {
        setUser(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // Hide section if user is logged in
  if (user) {
    return null;
  }

  return (
    <section style={sectionStyle}>
      <img
        src="https://images.pexels.com/photos/2255802/pexels-photo-2255802.jpeg?auto=compress&fit=crop&w=600&q=80"
        alt="Happy Farmer with Produce"
        style={imgStyle}
      />
      <div style={{maxWidth: 380}}>
        <div style={titleStyle}>Grow Your Farm Business</div>
        <div style={subtitleStyle}>Join thousands of farmers who are selling directly to consumers and growing their income.</div>
        <div style={featuresStyle}>
          <div style={featureRowStyle}>
            <span style={iconWrap}>{/* Fair Pricing Icon */}
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="8" fill="#fde68a"/><path d="M12 4v16m0 0a4 4 0 100-8 4 4 0 100 8zM7.5 8.5l1.642 4.11a2 2 0 003.716 0L15.5 8.5" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <div style={{fontWeight: 600, fontSize: 16}}>Fair Pricing</div>
              <div style={{color: '#8E7037', fontSize: 14}}>Sell directly to consumers and vendors. No middlemen eating into your profits.</div>
            </div>
          </div>
          <div style={featureRowStyle}>
            <span style={iconWrap}>{/* Direct Customer Connect Icon */}
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="8" fill="#fdba74"/><path d="M13 16h-2a4 4 0 110-8 4 4 0 014 4m2 3.25A4.25 4.25 0 0012.75 8h-.5A4.25 4.25 0 008 12.75v0A4.25 4.25 0 0012.25 17h.5A4.25 4.25 0 0017 12.75v0z" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <div style={{fontWeight: 600, fontSize: 16}}>Direct Customer Connect</div>
              <div style={{color: '#8E7037', fontSize: 14}}>Build relationships with your customers. Get feedback and grow your brand.</div>
            </div>
          </div>
          <div style={featureRowStyle}>
            <span style={iconWrap}>{/* Bulk Orders Icon */}
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="8" fill="#fdba74"/><path d="M7 13.5V10a5 5 0 115 5h-3.5a3.5 3.5 0 100 7H17" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <div style={{fontWeight: 600, fontSize: 16}}>Bulk Orders</div>
              <div style={{color: '#8E7037', fontSize: 14}}>Connect with vendors for large orders. Secure long-term contracts easily.</div>
            </div>
          </div>
          <div style={featureRowStyle}>
            <span style={iconWrap}>{/* Secure Payments Icon */}
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="8" fill="#fef9c3"/><path d="M12 17a3 3 0 100-6 3 3 0 000 6zm0-12v4M7.05 7.05l2.83 2.83M4 12h4m5.17 2.83l2.83 2.83M19.07 12H21m-4.83-4.17l2.83-2.83" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <div style={{fontWeight: 600, fontSize: 16}}>Secure Payments</div>
              <div style={{color: '#8E7037', fontSize: 14}}>Guaranteed payments through our platform. Track all transactions in one place.</div>
            </div>
          </div>
        </div>
        <button style={buttonStyle} onClick={() => navigate('/farmer-signup')}>
          Register as Farmer
        </button>
      </div>
    </section>
  );
};

export default FarmerRegistration;
