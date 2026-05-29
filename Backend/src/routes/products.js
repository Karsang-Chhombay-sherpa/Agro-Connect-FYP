const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Farmer = require("../models/Farmer");
const router = express.Router();

// Middleware to log all requests to products routes
router.use((req, res, next) => {
  console.log(`[PRODUCTS ROUTE] ${req.method} ${req.path}`);
  next();
});

// Get all products (for marketplace) with farmer information
// CRITICAL: This exact match route MUST come first before any parameterized routes
// This route handles GET /api/products (root of products router)
router.get("/", async (req, res) => {
  try {
    console.log("=== MARKETPLACE API CALLED (ROOT ROUTE) ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request path:", req.path);
    console.log("Request originalUrl:", req.originalUrl);
    console.log("Query params:", req.query);
    
    const { category, search } = req.query;
    
    // Build query - get all products (show all, not just available ones for debugging)
    let query = {};
    
    // Filter by category if provided
    if (category && category !== "All Categories") {
      query.category = category;
    }
    
    // Search by product name if provided
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }
    
    console.log("Fetching products with query:", JSON.stringify(query, null, 2));
    
    // First, get all products without populate to see if they exist
    const allProducts = await Product.find(query).sort({ createdAt: -1 });
    console.log(`Total products found (before populate): ${allProducts.length}`);
    
    if (allProducts.length === 0) {
      console.log("WARNING: No products found in database at all!");
      return res.json({ success: true, products: [], message: "No products found in database." });
    }
    
    // Now populate farmer information
    const products = await Product.find(query)
      .populate('farmerId', 'farmName location firstName lastName')
      .sort({ createdAt: -1 });
    
    console.log(`Products after populate: ${products.length}`);
    
    // Filter out products where farmerId population failed (farmer was deleted or invalid)
    const validProducts = products.filter(p => {
      if (!p.farmerId) {
        console.warn(`Product ${p._id} (${p.productName}) has no valid farmerId`);
        return false;
      }
      return true;
    });
    
    console.log(`Valid products (with farmer info): ${validProducts.length}`);
    
    // Log sample product for debugging
    if (validProducts.length > 0) {
      console.log("Sample product:", {
        id: validProducts[0]._id,
        name: validProducts[0].productName,
        farmer: validProducts[0].farmerId?.farmName || "No farmer",
        isAvailable: validProducts[0].isAvailable
      });
    } else if (products.length > 0) {
      console.log("WARNING: All products have invalid farmerId references!");
      console.log("Sample product without farmer:", {
        id: products[0]._id,
        name: products[0].productName,
        farmerId: products[0].farmerId
      });
    }
    
    console.log("=== SENDING RESPONSE ===");
    res.json({ success: true, products: validProducts });
  } catch (error) {
    console.error("=== ERROR IN MARKETPLACE ROUTE ===");
    console.error("Error fetching products:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ success: false, message: "Server error while fetching products.", error: error.message });
  }
});

// Get all products for a specific farmer
router.get("/farmer/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;
    const products = await Product.find({ farmerId }).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error while fetching products." });
  }
});

// Get a single product by ID
// IMPORTANT: This must come LAST and validate ObjectId to avoid catching other routes
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    
    console.log(`[PRODUCT BY ID ROUTE] productId: "${productId}"`);
    
    // Check if this is actually a request for the root route (shouldn't happen, but just in case)
    if (productId === "" || productId === "/" || productId === undefined) {
      console.log("[PRODUCT BY ID] Empty productId - this should not happen!");
      return res.status(404).json({ success: false, message: "Invalid route." });
    }
    
    // Validate that productId is a valid MongoDB ObjectId (24 hex characters)
    // This prevents the route from matching paths like "farmer" or other non-ObjectId strings
    if (!mongoose.Types.ObjectId.isValid(productId) || productId.length !== 24) {
      console.log(`[PRODUCT BY ID] Invalid productId format: "${productId}" (length: ${productId.length}) - returning 404`);
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    
    const product = await Product.findById(productId).populate('farmerId', 'farmName location firstName lastName');
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, message: "Server error while fetching product." });
  }
});

// Create a new product
router.post("/", async (req, res) => {
  try {
    const { farmerId, productName, quantity, unit, pricePerUnit, description, category, image } = req.body;
    
    // Validate required fields
    if (!farmerId || !productName || quantity === undefined || !unit || pricePerUnit === undefined) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Log image size for debugging (optional, can be removed)
    if (image) {
      console.log(`Image data length: ${image.length} characters`);
    }

    // Validate farmerId format (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ message: "Invalid farmer ID format." });
    }

    // Verify farmer exists
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found." });
    }

    // Validate numeric fields
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(pricePerUnit);
    
    if (isNaN(quantityNum) || quantityNum < 0) {
      return res.status(400).json({ message: "Quantity must be a valid positive number." });
    }
    
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: "Price per unit must be a valid positive number." });
    }

    // Check for duplicate product name for this farmer (case-insensitive)
    const duplicates = await Product.find({
      farmerId,
      productName: { $regex: `^${productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }).sort({ createdAt: 1 }); // oldest first

    if (duplicates.length > 0) {
      // Keep the oldest, update it, delete the rest
      const existing = duplicates[0];
      existing.quantity = quantityNum;
      existing.pricePerUnit = priceNum;
      if (unit) existing.unit = unit;
      if (description !== undefined) existing.description = description.trim();
      if (category) existing.category = category.trim();
      if (image) existing.image = image;
      existing.updatedAt = Date.now();
      await existing.save();

      // Delete any extra duplicates beyond the first
      if (duplicates.length > 1) {
        const extraIds = duplicates.slice(1).map(d => d._id);
        await Product.deleteMany({ _id: { $in: extraIds } });
        console.log(`Cleaned up ${extraIds.length} duplicate(s) of "${productName}" for farmer ${farmerId}`);
      }

      console.log(`Duplicate product found — updated existing: ${existing._id}`);
      return res.json({ success: true, product: existing, updated: true, message: "Product already exists. Price and quantity updated." });
    }

    // Create and save product to database (separate 'products' collection)
    const product = await Product.create({
      farmerId,
      productName: productName.trim(),
      quantity: quantityNum,
      unit,
      pricePerUnit: priceNum,
      description: description ? description.trim() : '',
      category: category ? category.trim() : 'General',
      image: image || '',
      isAvailable: true
    });

    console.log(`Product saved to database: ${product._id} for farmer: ${farmerId}`);
    res.json({ success: true, product, message: "Product added successfully and saved to database." });
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error while creating product." });
  }
});

// Update a product
router.put("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { productName, quantity, unit, pricePerUnit, description, category, image, isAvailable } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Update fields
    if (productName !== undefined) product.productName = productName;
    if (quantity !== undefined) {
      product.quantity = quantity;
      // Auto-sync isAvailable with quantity (unless explicitly overridden)
      if (isAvailable === undefined) {
        product.isAvailable = quantity > 0;
      }
    }
    if (unit !== undefined) product.unit = unit;
    if (pricePerUnit !== undefined) product.pricePerUnit = pricePerUnit;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (isAvailable !== undefined) product.isAvailable = isAvailable;
    
    product.updatedAt = Date.now();
    await product.save();

    res.json({ success: true, product, message: "Product updated successfully." });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error while updating product." });
  }
});

// Cleanup duplicate products for a farmer (keeps oldest, merges quantity/price from newest)
router.post("/cleanup-duplicates/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ message: "Invalid farmer ID." });
    }

    const products = await Product.find({ farmerId }).sort({ createdAt: 1 });

    // Group by lowercase product name
    const groups = {};
    for (const p of products) {
      const key = p.productName.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    let removed = 0;
    for (const key of Object.keys(groups)) {
      const group = groups[key];
      if (group.length <= 1) continue;

      // Keep oldest, take latest price/quantity from newest
      const keeper = group[0];
      const newest = group[group.length - 1];
      keeper.quantity = newest.quantity;
      keeper.pricePerUnit = newest.pricePerUnit;
      keeper.updatedAt = Date.now();
      await keeper.save();

      const extraIds = group.slice(1).map(p => p._id);
      await Product.deleteMany({ _id: { $in: extraIds } });
      removed += extraIds.length;
    }

    res.json({ success: true, message: `Cleanup complete. Removed ${removed} duplicate(s).`, removed });
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    res.status(500).json({ message: "Server error during cleanup." });
  }
});

// Delete a product
router.delete("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByIdAndDelete(productId);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error while deleting product." });
  }
});

module.exports = router;

