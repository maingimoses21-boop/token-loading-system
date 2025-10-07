#!/usr/bin/env node

/**
 * Quick test script for Daraja payment simulation
 * Run with: node test-payment.js
 */

require('dotenv').config();
const axios = require('axios');

async function testPayment() {
  console.log('🧪 Testing Daraja Payment Simulation...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('- DARAJA_CONSUMER_KEY:', process.env.DARAJA_CONSUMER_KEY ? '✅ Set' : '❌ Missing');
  console.log('- DARAJA_CONSUMER_SECRET:', process.env.DARAJA_CONSUMER_SECRET ? '✅ Set' : '❌ Missing');
  console.log('- DARAJA_SHORTCODE:', process.env.DARAJA_SHORTCODE || '❌ Missing');
  console.log('- DARAJA_TEST_MSISDN:', process.env.DARAJA_TEST_MSISDN || '❌ Missing');
  console.log('');

  // Test backend health
  try {
    console.log('🏥 Testing backend health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Backend is running:', healthResponse.data);
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    console.log('Make sure your backend is running with: npm start');
    return;
  }

  // Test payment simulation
  try {
    console.log('\n💳 Testing payment simulation...');
    const paymentData = {
      meter_no: '12345678',
      amount: 100
    };
    
    console.log('Sending request:', paymentData);
    const response = await axios.post('http://localhost:3000/daraja/simulate', paymentData, {
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Payment simulation successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Payment simulation failed:');
    console.log('- Error message:', error.message);
    
    if (error.response) {
      console.log('- Response status:', error.response.status);
      console.log('- Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('- No response received (timeout or network error)');
    }
  }
}

// Run the test
testPayment().catch(console.error);
