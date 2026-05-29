const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testBulkOrderPayment() {
  try {
    console.log('Testing Bulk Order Payment Flow...\n');

    // Step 1: Create a test bulk order
    console.log('Step 1: Creating test bulk order...');
    const bulkOrderData = {
      userId: '697e32ab461b8d6a5c941317', // Test user ID
      farmerId: '6978e8b8c8d8e8f8g8h8i8j8', // Test farmer ID
      items: [
        {
          productId: '507f1f77bcf86cd799439011',
          productName: 'Tomato',
          quantity: 30,
          unit: 'kg',
          pricePerUnit: 50,
          totalPrice: 1500
        }
      ],
      deliveryInfo: {
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '9841234567',
        city: 'Kathmandu',
        area: 'Thamel',
        ward: '1',
        streetAddress: 'Test Street',
        landmark: 'Test Landmark',
        deliveryInstructions: 'Test instructions'
      },
      schedule: {
        startDate: new Date().toISOString(),
        timeSlot: 'morning'
      },
      pricing: {
        subtotal: 1500,
        discountPercentage: 5,
        discountAmount: 75,
        deliveryCharge: 120,
        totalAmount: 1545
      },
      status: 'pending',
      paymentStatus: 'pending'
    };

    const orderResponse = await axios.post(`${API_URL}/bulk-orders/create`, bulkOrderData);
    console.log('✓ Bulk order created:', orderResponse.data.data._id);
    const orderId = orderResponse.data.data._id;

    // Step 2: Initiate payment
    console.log('\nStep 2: Initiating bulk order payment...');
    const paymentData = {
      orderId: orderId,
      amount: 1545,
      userId: '697e32ab461b8d6a5c941317'
    };

    console.log('Payment request:', JSON.stringify(paymentData, null, 2));

    const paymentResponse = await axios.post(`${API_URL}/payments/initiate-bulk-payment`, paymentData);
    
    if (paymentResponse.data.success) {
      console.log('✓ Payment initiated successfully');
      console.log('Payment data:', JSON.stringify(paymentResponse.data.data, null, 2));
    } else {
      console.log('✗ Payment initiation failed:', paymentResponse.data.message);
    }

  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testBulkOrderPayment();
