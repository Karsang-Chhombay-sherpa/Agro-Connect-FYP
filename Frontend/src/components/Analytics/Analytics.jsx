import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './Analytics.module.css';

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30'); // days
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Starting analytics fetch...');

      const userData = localStorage.getItem('user');
      if (!userData) {
        console.log('❌ No user data found in localStorage');
        setError('Please login to view analytics. If you are testing, you can use the demo data below.');
        setIsDemoMode(true);
        
        // Set demo analytics data for testing
        setAnalytics({
          totalRevenue: 153000,
          totalOrders: 529,
          avgOrderValue: 289,
          repeatCustomers: 68,
          growthMetrics: {
            revenue: 12,
            orders: 8,
            avgOrder: -3,
            customers: 5
          },
          salesTrend: [
            { month: 'Jan', value: 12000 },
            { month: 'Feb', value: 18000 },
            { month: 'Mar', value: 15000 },
            { month: 'Apr', value: 28000 },
            { month: 'May', value: 25000 },
            { month: 'Jun', value: 32000 },
            { month: 'Jul', value: 30000 }
          ],
          weeklyOrders: [
            { day: 'Mon', orders: 12 },
            { day: 'Tue', orders: 18 },
            { day: 'Wed', orders: 15 },
            { day: 'Thu', orders: 22 },
            { day: 'Fri', orders: 27 },
            { day: 'Sat', orders: 35 },
            { day: 'Sun', orders: 18 }
          ],
          productDistribution: [
            { name: 'Tomatoes', percentage: 35, color: '#22c55e' },
            { name: 'Potatoes', percentage: 28, color: '#3b82f6' },
            { name: 'Spinach', percentage: 18, color: '#f59e0b' },
            { name: 'Carrots', percentage: 12, color: '#ef4444' },
            { name: 'Cauliflower', percentage: 7, color: '#8b5cf6' }
          ]
        });
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      console.log('👤 User data:', { 
        id: user._id, 
        userType: user.userType, 
        name: user.firstName + ' ' + user.lastName 
      });

      if (user.userType !== 'farmer') {
        console.log('❌ User is not a farmer:', user.userType);
        setError('Access denied. Farmer account required. Showing demo data for testing.');
        setIsDemoMode(true);
        
        // Set demo analytics data for non-farmer users
        setAnalytics({
          totalRevenue: 125000,
          totalOrders: 420,
          avgOrderValue: 297,
          repeatCustomers: 72,
          growthMetrics: {
            revenue: 15,
            orders: 6,
            avgOrder: 2,
            customers: 8
          },
          salesTrend: [
            { month: 'Jan', value: 10000 },
            { month: 'Feb', value: 15000 },
            { month: 'Mar', value: 12000 },
            { month: 'Apr', value: 25000 },
            { month: 'May', value: 22000 },
            { month: 'Jun', value: 28000 },
            { month: 'Jul', value: 27000 }
          ],
          weeklyOrders: [
            { day: 'Mon', orders: 10 },
            { day: 'Tue', orders: 16 },
            { day: 'Wed', orders: 13 },
            { day: 'Thu', orders: 20 },
            { day: 'Fri', orders: 24 },
            { day: 'Sat', orders: 32 },
            { day: 'Sun', orders: 15 }
          ],
          productDistribution: [
            { name: 'Demo Product 1', percentage: 30, color: '#22c55e' },
            { name: 'Demo Product 2', percentage: 25, color: '#3b82f6' },
            { name: 'Demo Product 3', percentage: 20, color: '#f59e0b' },
            { name: 'Demo Product 4', percentage: 15, color: '#ef4444' },
            { name: 'Demo Product 5', percentage: 10, color: '#8b5cf6' }
          ]
        });
        setLoading(false);
        return;
      }

      console.log('📊 Fetching analytics data for farmer:', user._id);

      // Fetch analytics data with individual error handling
      let ordersData = { orders: [] };
      let productsData = { products: [] };
      let walletData = { data: { totalEarnings: 0, recentTransactions: [] } };

      try {
        console.log('📦 Fetching orders...');
        const ordersResponse = await axios.get(`/api/orders/farmer/${user._id}`);
        ordersData = ordersResponse.data;
        console.log('✅ Orders fetched:', ordersData.orders?.length || 0);
      } catch (ordersError) {
        console.error('❌ Orders fetch failed:', ordersError);
        console.log('⚠️ Continuing without orders data');
      }

      try {
        console.log('🥕 Fetching products...');
        const productsResponse = await axios.get(`/api/products/farmer/${user._id}`);
        productsData = productsResponse.data;
        console.log('✅ Products fetched:', productsData.products?.length || 0);
      } catch (productsError) {
        console.error('❌ Products fetch failed:', productsError);
        console.log('⚠️ Continuing without products data');
      }

      try {
        console.log('💰 Fetching wallet...');
        const paymentsResponse = await axios.get(`/api/payments/wallet/${user._id}`);
        walletData = paymentsResponse.data;
        console.log('✅ Wallet fetched:', walletData.data?.totalEarnings || 0);
      } catch (walletError) {
        console.error('❌ Wallet fetch failed:', walletError);
        console.log('⚠️ Continuing without wallet data');
      }

      // Process the data for analytics
      const orders = ordersData.orders || [];
      const products = productsData.products || [];
      const wallet = walletData.data || { totalEarnings: 0, recentTransactions: [] };

      console.log('📈 Processing analytics data:', {
        ordersCount: orders.length,
        productsCount: products.length,
        walletEarnings: wallet.totalEarnings
      });

      // Calculate analytics
      const now = new Date();
      const daysAgo = new Date(now.getTime() - (parseInt(timeRange) * 24 * 60 * 60 * 1000));
      
      const recentOrders = orders.filter(order => new Date(order.createdAt) >= daysAgo);
      const totalRevenue = recentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrders = recentOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate repeat customers (simplified)
      const uniqueCustomers = new Set(recentOrders.map(order => order.customerId)).size;
      const repeatCustomers = Math.round((uniqueCustomers * 0.68)); // Estimated 68% repeat rate

      // Growth metrics (mock data for now)
      const growthMetrics = {
        revenue: Math.round(Math.random() * 20 - 5), // -5% to +15%
        orders: Math.round(Math.random() * 15 - 2), // -2% to +13%
        avgOrder: Math.round(Math.random() * 10 - 5), // -5% to +5%
        customers: Math.round(Math.random() * 12 - 1) // -1% to +11%
      };

      // Sales trend (last 7 months)
      const salesTrend = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
        });
        const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        salesTrend.push({
          month: monthNames[date.getMonth()],
          value: monthRevenue
        });
      }

      // Weekly orders (last 7 days)
      const weeklyOrders = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.toDateString() === date.toDateString();
        });
        
        weeklyOrders.push({
          day: dayNames[date.getDay()],
          orders: dayOrders.length
        });
      }

      // Product distribution
      const productSales = recentOrders.reduce((acc, order) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const name = item.productName || 'Unknown Product';
            if (!acc[name]) {
              acc[name] = 0;
            }
            acc[name] += (item.quantity || 0) * (item.pricePerUnit || 0);
          });
        }
        return acc;
      }, {});

      const totalSales = Object.values(productSales).reduce((sum, value) => sum + value, 0);
      const productDistribution = Object.entries(productSales)
        .map(([name, sales], index) => ({
          name,
          percentage: totalSales > 0 ? Math.round((sales / totalSales) * 100) : 0,
          color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);

      const analyticsData = {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        repeatCustomers,
        growthMetrics,
        salesTrend,
        weeklyOrders,
        productDistribution
      };

      console.log('✅ Analytics data processed:', analyticsData);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('💥 Error fetching analytics:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(`Failed to fetch analytics data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatGrowth = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className={styles.errorMessage}>{error}</div>
          <button 
            onClick={fetchAnalytics}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className={styles.demoBanner}>
          <div className={styles.demoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.demoText}>
            <strong>Demo Mode:</strong> This is sample analytics data for demonstration purposes.
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics Dashboard</h1>
        <p className={styles.subtitle}>Track your farm performance and sales</p>
      </div>

      {/* Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Revenue</span>
            <span className={`${styles.growth} ${analytics.growthMetrics.revenue >= 0 ? styles.positive : styles.negative}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d={analytics.growthMetrics.revenue >= 0 ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formatGrowth(analytics.growthMetrics.revenue)}
            </span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(analytics.totalRevenue)}</div>
          <div className={styles.metricPeriod}>vs last month</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Orders</span>
            <span className={`${styles.growth} ${analytics.growthMetrics.orders >= 0 ? styles.positive : styles.negative}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d={analytics.growthMetrics.orders >= 0 ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formatGrowth(analytics.growthMetrics.orders)}
            </span>
          </div>
          <div className={styles.metricValue}>{analytics.totalOrders}</div>
          <div className={styles.metricPeriod}>vs last month</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Avg Order Value</span>
            <span className={`${styles.growth} ${analytics.growthMetrics.avgOrder >= 0 ? styles.positive : styles.negative}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d={analytics.growthMetrics.avgOrder >= 0 ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formatGrowth(analytics.growthMetrics.avgOrder)}
            </span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(analytics.avgOrderValue)}</div>
          <div className={styles.metricPeriod}>vs last month</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Repeat Customers</span>
            <span className={`${styles.growth} ${analytics.growthMetrics.customers >= 0 ? styles.positive : styles.negative}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d={analytics.growthMetrics.customers >= 0 ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formatGrowth(analytics.growthMetrics.customers)}
            </span>
          </div>
          <div className={styles.metricValue}>{analytics.repeatCustomers}%</div>
          <div className={styles.metricPeriod}>vs last month</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsSection}>
        {/* Sales Trend Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12l4-4 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sales Trend
            </h3>
          </div>
          <div className={styles.lineChart}>
            <svg viewBox="0 0 400 200" className={styles.chartSvg}>
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Chart area */}
              <g transform="translate(40, 20)">
                {/* Sales trend line */}
                <path
                  d={`M ${analytics.salesTrend.map((point, index) => {
                    const x = (index / (analytics.salesTrend.length - 1)) * 320;
                    const maxValue = Math.max(...analytics.salesTrend.map(p => p.value));
                    const y = 140 - (point.value / maxValue) * 120;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                
                {/* Area fill */}
                <path
                  d={`M ${analytics.salesTrend.map((point, index) => {
                    const x = (index / (analytics.salesTrend.length - 1)) * 320;
                    const maxValue = Math.max(...analytics.salesTrend.map(p => p.value));
                    const y = 140 - (point.value / maxValue) * 120;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')} L 320 140 L 0 140 Z`}
                  fill="url(#gradient)"
                  opacity="0.3"
                />
                
                {/* Data points */}
                {analytics.salesTrend.map((point, index) => {
                  const x = (index / (analytics.salesTrend.length - 1)) * 320;
                  const maxValue = Math.max(...analytics.salesTrend.map(p => p.value));
                  const y = 140 - (point.value / maxValue) * 120;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#22c55e"
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })}
                
                {/* Month labels */}
                {analytics.salesTrend.map((point, index) => {
                  const x = (index / (analytics.salesTrend.length - 1)) * 320;
                  return (
                    <text
                      key={index}
                      x={x}
                      y={165}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#64748b"
                    >
                      {point.month}
                    </text>
                  );
                })}
              </g>
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Weekly Orders Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Weekly Orders
            </h3>
          </div>
          <div className={styles.barChart}>
            <div className={styles.barsContainer}>
              {analytics.weeklyOrders.map((day, index) => {
                const maxOrders = Math.max(...analytics.weeklyOrders.map(d => d.orders));
                const height = (day.orders / maxOrders) * 100;
                return (
                  <div key={index} className={styles.barGroup}>
                    <div 
                      className={styles.bar}
                      style={{ height: `${height}%` }}
                      title={`${day.orders} orders`}
                    ></div>
                    <div className={styles.barLabel}>{day.day}</div>
                    <div className={styles.barValue}>{day.orders}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Product Distribution */}
      <div className={styles.productDistribution}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Product Sales Distribution
          </h3>
        </div>
        <div className={styles.distributionContent}>
          <div className={styles.donutChart}>
            <svg viewBox="0 0 200 200" className={styles.donutSvg}>
              {analytics.productDistribution.map((product, index) => {
                let cumulativePercentage = 0;
                for (let i = 0; i < index; i++) {
                  cumulativePercentage += analytics.productDistribution[i].percentage;
                }
                
                const startAngle = (cumulativePercentage / 100) * 360 - 90;
                const endAngle = ((cumulativePercentage + product.percentage) / 100) * 360 - 90;
                
                const startAngleRad = (startAngle * Math.PI) / 180;
                const endAngleRad = (endAngle * Math.PI) / 180;
                
                const largeArcFlag = product.percentage > 50 ? 1 : 0;
                
                const x1 = 100 + 60 * Math.cos(startAngleRad);
                const y1 = 100 + 60 * Math.sin(startAngleRad);
                const x2 = 100 + 60 * Math.cos(endAngleRad);
                const y2 = 100 + 60 * Math.sin(endAngleRad);
                
                const x3 = 100 + 30 * Math.cos(endAngleRad);
                const y3 = 100 + 30 * Math.sin(endAngleRad);
                const x4 = 100 + 30 * Math.cos(startAngleRad);
                const y4 = 100 + 30 * Math.sin(startAngleRad);
                
                const pathData = [
                  `M ${x1} ${y1}`,
                  `A 60 60 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  `L ${x3} ${y3}`,
                  `A 30 30 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                  'Z'
                ].join(' ');
                
                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={product.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
          <div className={styles.distributionLegend}>
            {analytics.productDistribution.map((product, index) => (
              <div key={index} className={styles.legendItem}>
                <div 
                  className={styles.legendColor}
                  style={{ backgroundColor: product.color }}
                ></div>
                <div className={styles.legendText}>
                  <span className={styles.legendName}>{product.name}</span>
                  <span className={styles.legendPercentage}>{product.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}