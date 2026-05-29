const express = require("express");
const Product = require("../models/Product");
const Farmer = require("../models/Farmer");
const router = express.Router();

// Get nearby products based on user location
router.get("/nearby-products", async (req, res) => {
  try {
    const { lat, lng, maxDistance = 25000 } = req.query; // maxDistance in meters (default 25km)

    // Validate coordinates
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        message: "Latitude and longitude are required." 
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid coordinates provided." 
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        success: false, 
        message: "Coordinates out of valid range." 
      });
    }

    console.log(`Finding farmers near: [${longitude}, ${latitude}] within ${maxDistance}m`);

    // Find nearby farmers using geospatial query
    const nearbyFarmers = await Farmer.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
          },
          distanceField: "distance",
          maxDistance: parseInt(maxDistance),
          spherical: true,
          query: { "geoLocation.coordinates": { $exists: true, $ne: [] } } // Only farmers with valid coordinates
        }
      },
      {
        $project: {
          _id: 1,
          farmName: 1,
          location: 1,
          distance: 1
        }
      }
    ]);

    console.log(`Found ${nearbyFarmers.length} nearby farmers`);

    if (nearbyFarmers.length === 0) {
      return res.json({ 
        success: true, 
        products: [], 
        message: "No farms found within 25 km radius." 
      });
    }

    // Get farmer IDs
    const farmerIds = nearbyFarmers.map(f => f._id);

    // Find all products from nearby farmers
    const products = await Product.find({ 
      farmerId: { $in: farmerIds },
      isAvailable: true 
    })
    .populate('farmerId', 'farmName location firstName lastName')
    .sort({ createdAt: -1 });

    // Add distance information to each product
    const productsWithDistance = products.map(product => {
      const farmer = nearbyFarmers.find(f => f._id.toString() === product.farmerId._id.toString());
      return {
        ...product.toObject(),
        distance: farmer ? Math.round(farmer.distance / 1000 * 10) / 10 : null // Convert to km with 1 decimal
      };
    });

    console.log(`Returning ${productsWithDistance.length} products from nearby farmers`);

    res.json({ 
      success: true, 
      products: productsWithDistance,
      farmersCount: nearbyFarmers.length
    });

  } catch (error) {
    console.error("Error fetching nearby products:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching nearby products.",
      error: error.message 
    });
  }
});

// Update farmer location coordinates (for farmers to set their location)
router.put("/farmer/:farmerId/coordinates", async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: "Latitude and longitude are required." 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid coordinates provided." 
      });
    }

    const farmer = await Farmer.findByIdAndUpdate(
      farmerId,
      {
        geoLocation: {
          type: "Point",
          coordinates: [lng, lat] // GeoJSON format: [longitude, latitude]
        },
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!farmer) {
      return res.status(404).json({ 
        success: false, 
        message: "Farmer not found." 
      });
    }

    res.json({ 
      success: true, 
      message: "Location updated successfully.",
      farmer: {
        id: farmer._id,
        farmName: farmer.farmName,
        geoLocation: farmer.geoLocation
      }
    });

  } catch (error) {
    console.error("Error updating farmer location:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating location.",
      error: error.message 
    });
  }
});

// Get nearby farmers with coordinates (for map display)
router.get("/nearby-farmers", async (req, res) => {
  try {
    const { lat, lng, maxDistance = 50000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng are required." });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, message: "Invalid coordinates." });
    }

    const farmers = await Farmer.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: parseInt(maxDistance),
          spherical: true,
          query: { "geoLocation.coordinates": { $exists: true, $ne: [] }, isActive: true }
        }
      },
      {
        $project: {
          _id: 1,
          farmName: 1,
          firstName: 1,
          lastName: 1,
          location: 1,
          profilePicture: 1,
          description: 1,
          phoneNumber: 1,
          yearsOfExperience: 1,
          organicCertification: 1,
          certificationFileName: 1,
          distance: 1,
          geoLocation: 1
        }
      },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      farmers: farmers.map(f => ({
        ...f,
        distanceKm: Math.round(f.distance / 100) / 10,
        lat: f.geoLocation.coordinates[1],
        lng: f.geoLocation.coordinates[0]
      }))
    });
  } catch (error) {
    console.error("Error fetching nearby farmers:", error);
    res.status(500).json({ success: false, message: "Server error.", error: error.message });
  }
});

module.exports = router;
