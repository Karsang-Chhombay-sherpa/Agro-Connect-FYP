import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Legal.module.css';

export default function TermsOfService() {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // If opened in new tab, go to subscription checkout or home
      navigate('/subscription-checkout');
    }
  };

  return (
    <div className={styles.legalContainer}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.document}>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last Updated: February 23, 2026</p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
            <p className={styles.text}>
              By accessing and using our platform, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Use of Service</h2>
            <p className={styles.text}>
              Our platform connects customers with local farmers to purchase fresh produce. You agree to:
            </p>
            <ul className={styles.list}>
              <li>Provide accurate and complete information when creating an account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not engage in any fraudulent or harmful activities</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Orders and Payments</h2>
            <p className={styles.text}>
              When you place an order:
            </p>
            <ul className={styles.list}>
              <li>All prices are in Nepali Rupees (NPR)</li>
              <li>Payment can be made via eSewa or Cash on Delivery</li>
              <li>Orders are subject to product availability</li>
              <li>We reserve the right to refuse or cancel any order</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Delivery</h2>
            <p className={styles.text}>
              We strive to deliver your orders on time. However:
            </p>
            <ul className={styles.list}>
              <li>Delivery times are estimates and may vary</li>
              <li>You must provide accurate delivery information</li>
              <li>Someone must be available to receive the delivery</li>
              <li>Delivery fees may apply based on location</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Product Quality</h2>
            <p className={styles.text}>
              We work with farmers to ensure fresh, quality produce. If you receive damaged or unsatisfactory products:
            </p>
            <ul className={styles.list}>
              <li>Contact us within 24 hours of delivery</li>
              <li>Provide photos of the product issue</li>
              <li>We will work to resolve the issue promptly</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Refunds and Cancellations</h2>
            <p className={styles.text}>
              Order cancellations and refunds are handled as follows:
            </p>
            <ul className={styles.list}>
              <li>Orders can be cancelled before they are dispatched</li>
              <li>Refunds for online payments will be processed within 7-10 business days</li>
              <li>Perishable items may not be eligible for refund once delivered</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. User Conduct</h2>
            <p className={styles.text}>
              You agree not to:
            </p>
            <ul className={styles.list}>
              <li>Misuse or abuse the platform</li>
              <li>Post false or misleading reviews</li>
              <li>Harass farmers or other users</li>
              <li>Attempt to hack or disrupt the service</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Limitation of Liability</h2>
            <p className={styles.text}>
              We are not liable for:
            </p>
            <ul className={styles.list}>
              <li>Delays caused by weather or unforeseen circumstances</li>
              <li>Product variations due to natural farming conditions</li>
              <li>Indirect or consequential damages</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Changes to Terms</h2>
            <p className={styles.text}>
              We reserve the right to modify these terms at any time. Continued use of the service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Contact Us</h2>
            <p className={styles.text}>
              If you have questions about these Terms of Service, please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
