#!/usr/bin/env node

/**
 * Test script to simulate a Daraja callback
 * Run with: node test-callback.js
 */

const axios = require('axios');

async function testCallback() {
  console.log('🧪 Testing Daraja Callback...\n');
  
  // Sample callback payload (simulating successful payment)
  const callbackPayload = {
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully.",
    OriginatorCoversationID: "2faf-403f-8dd5-e16e87cf43cf20027", // This should match a pending transaction
    MpesaReceiptNumber: "ABC123456789",
    Amount: 800,
    TransactionDate: "20241228160000", // YYYYMMDDHHMMSS format
    BillRefNumber: "12345678", // meter_no
    PhoneNumber: "254708374149"
  };

  try {
    console.log('📤 Sending callback payload:');
    console.log(JSON.stringify(callbackPayload, null, 2));
    
    const response = await axios.post('http://localhost:3000/daraja/callback', callbackPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Callback processed successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Callback failed:');
    console.log('- Error message:', error.message);
    
    if (error.response) {
      console.log('- Response status:', error.response.status);
      console.log('- Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testCallback().catch(console.error);
