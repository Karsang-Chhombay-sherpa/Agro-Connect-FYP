import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './FarmerWallet.module.css';

export default function FarmerWallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWalletData();
    
    // Set up polling to refresh wallet data every 30 seconds
    const interval = setInterval(() => {
      fetchWalletData();
    }, 30000);

    // Listen for payment completion events
    const handlePaymentComplete = () => {
      console.log('Payment completion detected, refreshing wallet...');
      setTimeout(() => {
        fetchWalletData();
      }, 2000); // Wait 2 seconds for backend processing
    };

    // Listen for custom events from payment success page
    window.addEventListener('paymentCompleted', handlePaymentComplete);
    
    // Listen for storage changes (in case other tabs update)
    window.addEventListener('storage', (e) => {
      if (e.key === 'walletUpdate') {
        console.log('Wallet update event detected');
        fetchWalletData();
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('paymentCompleted', handlePaymentComplete);
      window.removeEventListener('storage', handlePaymentComplete);
    };
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('Please login to view wallet');
        return;
      }

      const user = JSON.parse(userData);
      if (user.userType !== 'farmer') {
        setError('Access denied. Farmer account required.');
        return;
      }

      const response = await axios.get(`/api/payments/wallet/${user._id}`);
      
      if (response.data.success) {
        setWallet(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch wallet data');
      }

    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError('Failed to fetch wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return '💰';
      case 'debit':
        return '💸';
      case 'commission':
        return '📊';
      case 'withdrawal':
        return '🏦';
      default:
        return '💳';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading wallet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Wallet Overview */}
      <div className={styles.walletHeader}>
        <h1 className={styles.title}>My Wallet</h1>
        <div className={styles.balanceCard}>
          <div className={styles.balanceAmount}>
            ₹{wallet.balance.toFixed(2)}
          </div>
          <div className={styles.balanceLabel}>Available Balance</div>
        </div>
      </div>

      {/* Wallet Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>₹{wallet.totalEarnings.toFixed(2)}</div>
            <div className={styles.statLabel}>Total Earnings</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{wallet.transactionCount}</div>
            <div className={styles.statLabel}>Transactions</div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className={styles.transactionsSection}>
        <h2 className={styles.sectionTitle}>Recent Transactions</h2>
        
        {wallet.recentTransactions.length === 0 ? (
          <div className={styles.emptyTransactions}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p>No transactions yet</p>
            <span>Transactions will appear here when you receive payments</span>
          </div>
        ) : (
          <div className={styles.transactionsList}>
            {wallet.recentTransactions.map((transaction, index) => (
              <div key={index} className={styles.transactionItem}>
                <div className={styles.transactionIcon}>
                  {getTransactionIcon(transaction.type)}
                </div>
                
                <div className={styles.transactionDetails}>
                  <div className={styles.transactionDescription}>
                    {transaction.description}
                  </div>
                  <div className={styles.transactionDate}>
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
                
                <div className={`${styles.transactionAmount} ${
                  transaction.type === 'credit' ? styles.credit : styles.debit
                }`}>
                  {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                </div>
                
                <div className={`${styles.transactionStatus} ${styles[transaction.status]}`}>
                  {transaction.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}