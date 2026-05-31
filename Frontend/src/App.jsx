import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Features from './components/Features/Features';
import NearbyFarmers from './components/NearbyFarmers/NearbyFarmers';
import VeggieBox from './components/VeggieBox/VeggieBox';
import Footer from './components/Footer/Footer';
import SignUp from './components/SignUp/SignUp';
import Login from './components/SignUp/Login';
import Profile from './components/Profile/Profile';
import UserProfile from './components/Profile/UserProfile';
import FarmerRegistration from './components/Hero/naFarmerRegistraion';
import FarmerSignUp from './components/SignUp/FarmerSignUp';
import FarmerDashboard from './components/FarmerDashboard/FarmerDashboard';
import Marketplace from './components/Marketplace/Marketplace';
import ProductDetail from './components/ProductDetail/ProductDetail';
import Subscription from './components/Subscription/Subscription';
import SubscriptionCheckout from './components/Checkout/SubscriptionCheckout';
import TermsOfService from './components/Legal/TermsOfService';
import SubscriptionPolicy from './components/Legal/SubscriptionPolicy';
import FarmerProfile from './components/FarmerProfile/FarmerProfile';
import PaymentSuccess from './components/PaymentResult/PaymentSuccess';
import PaymentFailure from './components/PaymentResult/PaymentFailure';
import BulkOrders from './components/BulkOrders/BulkOrders';
import BulkOrderCheckout from './components/Checkout/BulkOrderCheckout';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import Wishlist from './components/Wishlist/Wishlist';
import About from './components/About/About';


function Dashboard() {
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
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: 'linear-gradient(135deg, #d1fae5 0%, #fef3c7 100%)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ color: '#22c55e', marginBottom: '8px', textAlign: 'center' }}>Welcome to your Dashboard!</h2>
          <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '32px' }}>Hello, {user.firstName} {user.lastName}!</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Email</div>
              <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: '600' }}>{user.email}</div>
            </div>
            <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Status</div>
              <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: '600' }}>
                {user.verified ? '✓ Verified' : '✗ Not Verified'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '12px 24px', 
                background: '#22c55e', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '16px', 
                cursor: 'pointer' 
              }}>
                View Profile
              </button>
            </Link>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '12px 24px', 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '16px', 
                cursor: 'pointer' 
              }}>
              Logout
            </button>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '12px 24px', 
                background: 'transparent', 
                color: '#22c55e', 
                border: '2px solid #22c55e', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '16px', 
                cursor: 'pointer' 
              }}>
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = React.useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  // Keep in sync when user logs in/out
  React.useEffect(() => {
    const sync = () => {
      const u = localStorage.getItem('user');
      setUser(u ? JSON.parse(u) : null);
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);

  return (
    <ErrorBoundary>
      <div>
        <ToastContainer position="top-right" autoClose={2500} />
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <Hero />
              {!user && <Features />}
              {user && <NearbyFarmers user={user} />}
              <VeggieBox />
              <FarmerRegistration />
              <Footer />
            </>
          } />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/farmer-signup" element={<FarmerSignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
          <Route path="/farmer-profile" element={<FarmerProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/subscription-checkout" element={<SubscriptionCheckout />} />
          <Route path="/bulk-orders" element={<BulkOrders />} />
          <Route path="/bulk-checkout" element={<BulkOrderCheckout />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/subscription-policy" element={<SubscriptionPolicy />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failure" element={<PaymentFailure />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;

