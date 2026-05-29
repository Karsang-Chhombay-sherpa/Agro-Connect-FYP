import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import styles from './Hero.module.css'

const Hero = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleShopNow = () => {
    if (!user) {
      navigate("/login")
    } else if (user.userType === "farmer") {
      toast.info("Please login as a user to access the shop.")
      navigate("/login")
    } else {
      // User is logged in, allow access to shop
      toast.info("Shop feature coming soon!")
      // Navigate to shop page when ready
      // navigate("/shop")
    }
  }

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Fresh From Farm to<br />
            Your Table
          </h1>
          <p className={styles.subtitle}>
            Connect directly with local farmers. Get the freshest organic produce<br />
            delivered to your doorstep.
          </p>
          <div className={styles.buttons}>
            <button className={styles.primaryBtn} onClick={handleShopNow}>
              Shop Now
            </button>
            <button className={styles.secondaryBtn}>Learn More</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
