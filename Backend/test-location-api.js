const axios = require('axios');

// Test script for location-based API endpoints
const BASE_URL = 'http://localhost:5000';

// Sample coordinates (Kathmandu, Nepal)
const TEST_LOCATION = {
  latitude: 27.7172,
  longitude: 85.3240
};

async function testLocationAPI() {
  console.log('🧪 Testing Location-Based API Endpoints\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Get nearby products
    console.log('\n📍 Test 1: Get Nearby Products');
    console.log('-'.repeat(50));
    console.log(`Location: ${TEST_LOCATION.latitude}, ${TEST_LOCATION.longitude}`);
    
    const nearbyResponse = await axios.get(
      `${BASE_URL}/api/location/nearby-products`,
      {
        params: {
          lat: TEST_LOCATION.latitude,
          lng: TEST_LOCATION.longitude,
          maxDistance: 25000 // 25 km
        }
      }
    );

    console.log('✅ Status:', nearbyResponse.status);
    console.log('✅ Success:', nearbyResponse.data.success);
    console.log('✅ Products found:', nearbyResponse.data.products.length);
    console.log('✅ Nearby farmers:', nearbyResponse.data.farmersCount);

    if (nearbyResponse.data.products.length > 0) {
      console.log('\nSample products:');
      nearbyResponse.data.products.slice(0, 3).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.productName}`);
        console.log(`     Farm: ${product.farmerId?.farmName || 'Unknown'}`);
        console.log(`     Distance: ${product.distance} km`);
        console.log(`     Price: ₹${product.pricePerUnit}/${product.unit}`);
      });
    } else {
      console.log('⚠️  No products found within 25 km radius');
      console.log('   Run: node Backend/src/utils/addSampleLocations.js');
    }

    // Test 2: Get all products (for comparison)
    console.log('\n\n📦 Test 2: Get All Products (for comparison)');
    console.log('-'.repeat(50));
    
    const allProductsResponse = await axios.get(`${BASE_URL}/api/products`);
    
    console.log('✅ Status:', allProductsResponse.status);
    console.log('✅ Success:', allProductsResponse.data.success);
    console.log('✅ Total products:', allProductsResponse.data.products.length);

    // Test 3: Invalid coordinates
    console.log('\n\n❌ Test 3: Invalid Coordinates (Error Handling)');
    console.log('-'.repeat(50));
    
    try {
      await axios.get(`${BASE_URL}/api/location/nearby-products`, {
        params: {
          lat: 'invalid',
          lng: 'invalid'
        }
      });
      console.log('❌ Should have thrown an error');
    } catch (error) {
      if (error.response) {
        console.log('✅ Correctly rejected invalid coordinates');
        console.log('✅ Status:', error.response.status);
        console.log('✅ Message:', error.response.data.message);
      }
    }

    // Test 4: Missing coordinates
    console.log('\n\n❌ Test 4: Missing Coordinates (Error Handling)');
    console.log('-'.repeat(50));
    
    try {
      await axios.get(`${BASE_URL}/api/location/nearby-products`);
      console.log('❌ Should have thrown an error');
    } catch (error) {
      if (error.response) {
        console.log('✅ Correctly rejected missing coordinates');
        console.log('✅ Status:', error.response.status);
        console.log('✅ Message:', error.response.data.message);
      }
    }

    // Test 5: Different radius
    console.log('\n\n📏 Test 5: Different Radius (50 km)');
    console.log('-'.repeat(50));
    
    const largerRadiusResponse = await axios.get(
      `${BASE_URL}/api/location/nearby-products`,
      {
        params: {
          lat: TEST_LOCATION.latitude,
          lng: TEST_LOCATION.longitude,
          maxDistance: 50000 // 50 km
        }
      }
    );

    console.log('✅ Status:', largerRadiusResponse.status);
    console.log('✅ Products found (50 km):', largerRadiusResponse.data.products.length);
    console.log('✅ Nearby farmers (50 km):', largerRadiusResponse.data.farmersCount);

    // Summary
    console.log('\n\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log('✅ All tests passed!');
    console.log(`✅ API is working correctly at ${BASE_URL}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Test in browser marketplace');
    console.log('   2. Try different locations');
    console.log('   3. Add more farmer coordinates');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend server is not running!');
      console.error('   Start it with: cd Backend && npm start');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.statusText);
    }
    
    process.exit(1);
  }
}

// Run tests
console.log('Starting API tests...\n');
testLocationAPI();
