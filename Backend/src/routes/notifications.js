const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

/**
 * Check wishlist products and return notifications for back-in-stock items
 * POST /api/notifications/check-wishlist
 * Body: { productIds: [...] }
 */
router.post('/check-wishlist', async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ success: true, available: [] });
    }

    // Find all wishlisted products that are now available
    const products = await Product.find({
      _id: { $in: productIds },
      isAvailable: true,
      quantity: { $gt: 0 }
    }).select('_id productName quantity unit pricePerUnit image isAvailable');

    res.json({ success: true, available: products });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Return ALL wishlist products with their current stock status
 * POST /api/notifications/check-wishlist-all
 * Body: { productIds: [...] }
 */
router.post('/check-wishlist-all', async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ success: true, products: [] });
    }

    const products = await Product.find({
      _id: { $in: productIds }
    }).select('_id productName quantity unit pricePerUnit image isAvailable');

    res.json({ success: true, products });
  } catch (error) {
    console.error('Error checking wishlist all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
