import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Legal.module.css';

export default function SubscriptionPolicy() {
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
          <h1 className={styles.title}>Subscription Policy</h1>
          <p className={styles.lastUpdated}>Last Updated: February 23, 2026</p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Subscription Plans</h2>
            <p className={styles.text}>
              We offer two subscription plans:
            </p>
            <ul className={styles.list}>
              <li><strong>Basic Box:</strong> ₹599/week - 5-7 varieties, sourced from a single local farm</li>
              <li><strong>Family Box:</strong> ₹1,999/week - 10-12 varieties, premium selection from multiple farms</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. How Subscriptions Work</h2>
            <p className={styles.text}>
              When you subscribe:
            </p>
            <ul className={styles.list}>
              <li>You choose your preferred delivery day and time slot</li>
              <li>Fresh produce is delivered weekly to your doorstep</li>
              <li>You can select the number of weeks (1-4 weeks minimum)</li>
              <li>Subscriptions auto-renew unless paused or cancelled</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Delivery Schedule</h2>
            <p className={styles.text}>
              Delivery options:
            </p>
            <ul className={styles.list}>
              <li><strong>Morning:</strong> 7:00 AM - 11:00 AM</li>
              <li><strong>Afternoon:</strong> 12:00 PM - 4:00 PM</li>
              <li><strong>Evening:</strong> 5:00 PM - 8:00 PM</li>
            </ul>
            <p className={styles.text}>
              Please ensure someone is available to receive the delivery during your selected time slot.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Payment</h2>
            <p className={styles.text}>
              Subscription payments:
            </p>
            <ul className={styles.list}>
              <li>Payment is charged at the start of each subscription period</li>
              <li>We accept eSewa and other online payment methods</li>
              <li>All prices include free delivery</li>
              <li>Prices are subject to change with 7 days notice</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Pausing Your Subscription</h2>
            <p className={styles.text}>
              You can pause your subscription anytime:
            </p>
            <ul className={styles.list}>
              <li>Pause for up to 4 weeks at a time</li>
              <li>No charges during the pause period</li>
              <li>Resume anytime from your account</li>
              <li>Pause at least 48 hours before your next delivery</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Skipping Deliveries</h2>
            <p className={styles.text}>
              Need to skip a week?
            </p>
            <ul className={styles.list}>
              <li>Skip individual deliveries without cancelling</li>
              <li>Must skip at least 48 hours before scheduled delivery</li>
              <li>No charge for skipped weeks</li>
              <li>Your subscription continues as normal after the skip</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Cancellation Policy</h2>
            <p className={styles.text}>
              You can cancel your subscription anytime:
            </p>
            <ul className={styles.list}>
              <li>No cancellation fees</li>
              <li>Cancel at least 48 hours before your next delivery</li>
              <li>You will receive deliveries already paid for</li>
              <li>No refunds for partial subscription periods</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Product Variety</h2>
            <p className={styles.text}>
              About your box contents:
            </p>
            <ul className={styles.list}>
              <li>Produce varies based on seasonal availability</li>
              <li>We curate the best fresh items each week</li>
              <li>Cannot guarantee specific items in each box</li>
              <li>All produce is fresh and locally sourced</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Quality Guarantee</h2>
            <p className={styles.text}>
              We stand behind our products:
            </p>
            <ul className={styles.list}>
              <li>If you're not satisfied, contact us within 24 hours</li>
              <li>We'll replace damaged or poor-quality items</li>
              <li>Credit issued for items that cannot be replaced</li>
              <li>Photos may be required for quality claims</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Delivery Issues</h2>
            <p className={styles.text}>
              If there's a delivery problem:
            </p>
            <ul className={styles.list}>
              <li>Contact us immediately if delivery is missed</li>
              <li>We'll reschedule or provide a credit</li>
              <li>Not responsible for delays due to weather or emergencies</li>
              <li>Ensure delivery address is accurate and accessible</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>11. Changing Your Plan</h2>
            <p className={styles.text}>
              You can upgrade or downgrade:
            </p>
            <ul className={styles.list}>
              <li>Switch between Basic and Family Box anytime</li>
              <li>Changes take effect from the next billing cycle</li>
              <li>Update delivery address or time slot as needed</li>
              <li>Make changes at least 48 hours before delivery</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>12. Contact Us</h2>
            <p className={styles.text}>
              Questions about your subscription? We're here to help! Contact our support team through your account 
              or reach out via our customer service channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
