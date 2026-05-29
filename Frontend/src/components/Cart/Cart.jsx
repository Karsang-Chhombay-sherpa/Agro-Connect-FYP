import React, { useState } from 'react';
import styles from './Cart.module.css';
import Checkout from '../Checkout/Checkout';
import ToastContainer from '../Toast/ToastContainer';
import { useToast } from '../../hooks/useToast';

export default function Cart({ 
  isOpen, 
  onClose, 
  cart, 
  setCart, 
  updateCartQuantity, 
  removeFromCart 
}) {
  const { toasts, removeToast, showWarning } = useToast();
  const [showCheckout, setShowCheckout] = useState(false);

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Find the item in cart to get available stock info
    const cartItem = cart.find(item => item._id === productId);
    if (!cartItem) return;

    // Check if the new quantity exceeds available stock
    if (newQuantity > cartItem.availableStock) {
      showWarning(`Only ${cartItem.availableStock} ${cartItem.unit} available in stock.`);
      return;
    }

    updateCartQuantity(productId, newQuantity);
  };

  const handleProceedToCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
  };

  const handleOrderComplete = () => {
    // Clear cart after successful order
    setCart([]);
    localStorage.removeItem('cart');
    setShowCheckout(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className={styles.cartOverlay} onClick={onClose}>
        <div className={styles.cartSidebar} onClick={(e) => e.stopPropagation()}>
          {/* Cart Header */}
          <div className={styles.cartHeader}>
            <div className={styles.cartTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              Your Cart ({cart.length} Items)
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div className={styles.cartItems}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <p>Your cart is empty</p>
                <span>Add some fresh produce to get started!</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item._id} className={styles.cartItem}>
                  <div className={styles.itemImage}>
                    {item.image ? (
                      <img src={item.image} alt={item.productName} />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            stroke="#9ca3af"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.itemDetails}>
                    <div className={styles.itemInfo}>
                      <h4 className={styles.itemName}>{item.productName}</h4>
                      <p className={styles.itemPrice}>₹{item.pricePerUnit}/{item.unit}</p>
                    </div>
                    
                    <div className={styles.quantityControls}>
                      <button
                        className={styles.quantityBtn}
                        onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button
                        className={styles.quantityBtn}
                        onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className={styles.itemTotal}>
                      ₹{(item.pricePerUnit * item.quantity).toFixed(2)}
                    </div>
                    
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeFromCart(item._id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className={styles.cartFooter}>
              <div className={styles.subtotal}>
                <span>Subtotal</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <button
                className={styles.checkoutBtn}
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </button>
              
              <button
                className={styles.clearCartBtn}
                onClick={() => {
                  setCart([]);
                  localStorage.removeItem('cart');
                }}
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <Checkout
          isOpen={showCheckout}
          onClose={handleCheckoutClose}
          cart={cart}
          subtotal={calculateSubtotal()}
          onOrderComplete={handleOrderComplete}
        />
      )}
    </>
  );
}