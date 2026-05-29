import React from 'react'
import styles from './Footer.module.css'

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                  <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className={styles.logoText}>FarmFresh</span>
            </div>
            <p className={styles.brandDescription}>
              Connecting communities with local farmers for fresh,<br />
              sustainable, and healthy produce.
            </p>
          </div>
          
          <div className={styles.links}>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkTitle}>Platform</h4>
              <ul className={styles.linkList}>
                <li><a href="#" className={styles.link}>Marketplace</a></li>
                <li><a href="#" className={styles.link}>Subscription</a></li>
                <li><a href="#" className={styles.link}>Recipes</a></li>
              </ul>
            </div>
            
            <div className={styles.linkGroup}>
              <h4 className={styles.linkTitle}>Company</h4>
              <ul className={styles.linkList}>
                <li><a href="#" className={styles.link}>About Us</a></li>
                <li><a href="#" className={styles.link}>Careers</a></li>
                <li><a href="#" className={styles.link}>Contact</a></li>
              </ul>
            </div>
            
            <div className={styles.linkGroup}>
              <h4 className={styles.linkTitle}>Support</h4>
              <ul className={styles.linkList}>
                <li><a href="#" className={styles.link}>Help Center</a></li>
                <li><a href="#" className={styles.link}>Terms of Service</a></li>
                <li><a href="#" className={styles.link}>Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <p className={styles.copyright}>© 2025 FarmFresh. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
