/**
 * Test script to verify eSewa payment configuration
 * Run with: node test-payment-config.js
 */

require('dotenv').config();

console.log('\n=== eSewa Payment Configuration Test ===\n');

// Check required environment variables
const requiredVars = [
  'ESEWA_MERCHANT_ID',
  'ESEWA_SECRET_KEY',
  'ESEWA_SUCCESS_URL',
  'ESEWA_FAILURE_URL',
  'ESEWA_PAYMENT_URL',
  'ESEWA_VERIFICATION_URL',
  'FRONTEND_URL',
  'PORT'
];

let hasErrors = false;

console.log('1. Environment Variables Check:');
console.log('─'.repeat(50));

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

console.log('\n2. URL Configuration Validation:');
console.log('─'.repeat(50));

const backendPort = process.env.PORT || '8000';
const expectedBackendUrl = `http://localhost:${backendPort}`;
const successUrl = process.env.ESEWA_SUCCESS_URL;
const failureUrl = process.env.ESEWA_FAILURE_URL;

// Check if success URL points to backend
if (successUrl && successUrl.includes('/api/payments/success')) {
  console.log(`✅ Success URL correctly points to backend API`);
  console.log(`   ${successUrl}`);
} else {
  console.log(`❌ Success URL should point to backend API`);
  console.log(`   Current: ${successUrl}`);
  console.log(`   Expected: ${expectedBackendUrl}/api/payments/success`);
  hasErrors = true;
}

// Check if failure URL points to backend
if (failureUrl && failureUrl.includes('/api/payments/failure')) {
  console.log(`✅ Failure URL correctly points to backend API`);
  console.log(`   ${failureUrl}`);
} else {
  console.log(`❌ Failure URL should point to backend API`);
  console.log(`   Current: ${failureUrl}`);
  console.log(`   Expected: ${expectedBackendUrl}/api/payments/failure`);
  hasErrors = true;
}

// Check if URLs use correct port
if (successUrl && successUrl.includes(`:${backendPort}`)) {
  console.log(`✅ Success URL uses correct port (${backendPort})`);
} else if (successUrl) {
  console.log(`⚠️  Success URL port might be incorrect`);
  console.log(`   Expected port: ${backendPort}`);
}

if (failureUrl && failureUrl.includes(`:${backendPort}`)) {
  console.log(`✅ Failure URL uses correct port (${backendPort})`);
} else if (failureUrl) {
  console.log(`⚠️  Failure URL port might be incorrect`);
  console.log(`   Expected port: ${backendPort}`);
}

console.log('\n3. Payment Flow:');
console.log('─'.repeat(50));
console.log('Expected flow:');
console.log('1. User clicks "Pay with eSewa"');
console.log('2. Frontend sends order to backend');
console.log('3. Backend creates payment and returns eSewa params');
console.log('4. Frontend auto-submits form to eSewa');
console.log('5. User completes payment on eSewa');
console.log(`6. eSewa redirects to: ${successUrl || 'MISSING'}`);
console.log('7. Backend verifies payment and processes order');
console.log(`8. Backend redirects to: ${process.env.FRONTEND_URL}/payment/success`);
console.log('9. Frontend shows success message and clears cart');

console.log('\n4. Common Issues:');
console.log('─'.repeat(50));

if (hasErrors) {
  console.log('❌ Configuration has errors - please fix the issues above');
} else {
  console.log('✅ Configuration looks good!');
}

console.log('\nCommon reasons for "payment canceled" error:');
console.log('• Success/Failure URLs point to frontend instead of backend');
console.log('• Port mismatch (backend running on different port than configured)');
console.log('• Backend not running when eSewa tries to redirect');
console.log('• CORS issues preventing backend from processing callback');
console.log('• Payment verification failing due to incorrect secret key');
console.log('• Form auto-submit failing (check browser console)');

console.log('\n5. Testing Steps:');
console.log('─'.repeat(50));
console.log('1. Ensure backend is running on port', backendPort);
console.log('2. Ensure frontend is running on', process.env.FRONTEND_URL);
console.log('3. Open browser console (F12) to see payment logs');
console.log('4. Try making a test payment');
console.log('5. Check backend logs for callback from eSewa');
console.log('6. If using test mode, use "Simulate Success" button');

console.log('\n' + '='.repeat(50) + '\n');
