import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import styles from './VeggieBox.module.css'

const VeggieBox = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleSubscribe = () => {
    if (!user) {
      navigate("/login")
    } else if (user.userType === "farmer") {
      toast.info("Please login as a user to subscribe.")
      navigate("/login")
    } else {
      navigate("/subscription")
    }
  }

  const handleExplore = () => {
    if (!user) {
      navigate("/login")
    } else if (user.userType === "farmer") {
      toast.info("Please login as a user to explore produce.")
      navigate("/login")
    } else {
      navigate("/marketplace")
    }
  }

  return (
    <section className={styles.veggieBox}>
      <div className={styles.container}>
        <div className={styles.imageSection}>
          <img 
            src="https://images.pexels.com/photos/4916239/pexels-photo-4916239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
            alt="Assorted fruits and firewood neatly arranged in wooden crates on a white background."
            className={styles.image}
          />
        </div>
        
        <div className={styles.content}>
          <h2 className={styles.title}>Weekly Fresh Veggie Boxes</h2>
          <p className={styles.description}>
            Subscribe to receive handpicked fresh organic vegetables every week.
            Sourced directly from local farms to ensure maximum freshness and quality.
          </p>
          <div className={styles.buttons}>
            <button className={styles.primaryBtn} onClick={handleSubscribe}>
              Subscribe Now
            </button>
            <button className={styles.secondaryBtn} onClick={handleExplore}>
              Explore Produce
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VeggieBox
