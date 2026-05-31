import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import styles from './About.module.css';

const teamMembers = [
  {
    name: 'Karsang Chhombay Sherpa',
    role: 'Full Stack Developer',
    description: 'Led the development of the platform architecture, payment integration, and backend APIs.',
    initials: 'KC',
  },
  {
    name: 'Sampanna Timalsina',
    role: 'Frontend Developer',
    description: 'Designed and built the user interface, ensuring a seamless experience for farmers and customers.',
    initials: 'ST',
  },
];

const stats = [
  { value: '500+', label: 'Local Farmers' },
  { value: '10,000+', label: 'Happy Customers' },
  { value: '50+', label: 'Districts Covered' },
  { value: '₹1M+', label: 'Farmer Earnings' },
];

const values = [
  {
    icon: '🌱',
    title: 'Supporting Local Farmers',
    description: 'We empower Nepali farmers by giving them a direct channel to sell their produce, eliminating middlemen and ensuring fair prices.',
  },
  {
    icon: '🥦',
    title: 'Fresh & Organic',
    description: 'Every product on AgroConnect is sourced directly from verified local farms, guaranteeing freshness and quality you can trust.',
  },
  {
    icon: '🤝',
    title: 'Community First',
    description: 'We believe in building a strong agricultural community where farmers and consumers grow together for a sustainable future.',
  },
  {
    icon: '🚚',
    title: 'Reliable Delivery',
    description: 'From farm to your doorstep — we ensure timely and safe delivery of fresh produce across Nepal.',
  },
];

export default function About() {
  return (
    <div className={styles.page}>
      <Header />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>🌿 About AgroConnect</span>
          <h1 className={styles.heroTitle}>
            Connecting Farmers to<br />
            <span className={styles.green}>Your Table</span>
          </h1>
          <p className={styles.heroSubtitle}>
            AgroConnect is Nepal's leading farm-to-table platform, bridging the gap between
            local farmers and consumers. We make fresh, organic produce accessible to everyone
            while ensuring farmers receive fair compensation for their hard work.
          </p>
          <div className={styles.heroBtns}>
            <Link to="/marketplace" className={styles.btnPrimary}>Shop Now</Link>
            <Link to="/farmer-signup" className={styles.btnOutline}>Join as Farmer</Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.heroImageInner}>
            <span className={styles.heroEmoji}>🌾</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className={styles.section}>
        <div className={styles.missionGrid}>
          <div className={styles.missionText}>
            <span className={styles.sectionBadge}>Our Mission</span>
            <h2 className={styles.sectionTitle}>Empowering Farmers,<br />Nourishing Communities</h2>
            <p className={styles.sectionDesc}>
              AgroConnect was founded with a simple but powerful mission: to create a fair and
              transparent marketplace where Nepali farmers can sell their produce directly to
              consumers without relying on exploitative middlemen.
            </p>
            <p className={styles.sectionDesc}>
              We provide farmers with digital tools to manage their products, track orders,
              and receive payments securely — while giving customers access to the freshest
              organic produce at fair prices.
            </p>
            <div className={styles.missionPoints}>
              <div className={styles.missionPoint}><span>✓</span> Direct farm-to-consumer sales</div>
              <div className={styles.missionPoint}><span>✓</span> Transparent pricing & fair earnings</div>
              <div className={styles.missionPoint}><span>✓</span> Secure digital payments via eSewa</div>
              <div className={styles.missionPoint}><span>✓</span> Subscription & bulk order support</div>
            </div>
          </div>
          <div className={styles.missionVisual}>
            <div className={styles.missionCard}>
              <div className={styles.missionIcon}>🌿</div>
              <h3>Farm to Table</h3>
              <p>Fresh produce delivered within 24 hours of harvest</p>
            </div>
            <div className={styles.missionCard}>
              <div className={styles.missionIcon}>💰</div>
              <h3>Fair Prices</h3>
              <p>Farmers earn up to 95% of the sale price</p>
            </div>
            <div className={styles.missionCard}>
              <div className={styles.missionIcon}>📱</div>
              <h3>Digital First</h3>
              <p>Easy-to-use platform for farmers and customers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className={styles.valuesSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Our Values</span>
          <h2 className={styles.sectionTitle}>What We Stand For</h2>
          <p className={styles.sectionSubtitle}>
            Every decision we make is guided by our commitment to farmers, customers, and the environment.
          </p>
        </div>
        <div className={styles.valuesGrid}>
          {values.map((v) => (
            <div key={v.title} className={styles.valueCard}>
              <div className={styles.valueIcon}>{v.icon}</div>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueDesc}>{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Our Team</span>
          <h2 className={styles.sectionTitle}>The People Behind AgroConnect</h2>
          <p className={styles.sectionSubtitle}>
            Built by passionate developers from Herald College Kathmandu as a Final Year Project.
          </p>
        </div>
        <div className={styles.teamGrid}>
          {teamMembers.map((m) => (
            <div key={m.name} className={styles.teamCard}>
              <div className={styles.teamAvatar}>{m.initials}</div>
              <h3 className={styles.teamName}>{m.name}</h3>
              <div className={styles.teamRole}>{m.role}</div>
              <p className={styles.teamDesc}>{m.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
          <p className={styles.ctaDesc}>
            Join thousands of customers enjoying fresh produce, or register as a farmer and
            start selling your harvest today.
          </p>
          <div className={styles.ctaBtns}>
            <Link to="/marketplace" className={styles.btnPrimary}>Browse Marketplace</Link>
            <Link to="/farmer-signup" className={styles.btnOutlineWhite}>Become a Farmer</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
