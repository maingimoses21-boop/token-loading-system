const axios = require('axios');

const darajaApi = axios.create({
  baseURL: 'https://sandbox.safaricom.co.ke',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get OAuth 2.0 Access Token from Daraja
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  try {
    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      throw new Error('Daraja consumer key or secret is not defined in .env');
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await darajaApi.get('/oauth/v1/generate?grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Daraja access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get Daraja access token');
  }
}

/**
 * Simulate a C2B payment
 * @param {string} meterNo - The meter number (BillRefNumber)
 * @param {number} amount - The amount to pay
 * @returns {Promise<Object>} Daraja API response
 */
async function simulateC2BPayment(meterNo, amount) {
  try {
    console.log('Step 1: Getting access token...');
    const accessToken = await getAccessToken();
    console.log('Step 2: Access token obtained successfully');
    
    const shortCode = process.env.DARAJA_SHORTCODE;
    const msisdn = process.env.DARAJA_TEST_MSISDN;

    console.log(`Step 3: Using ShortCode: ${shortCode}, MSISDN: ${msisdn}`);

    if (!shortCode || !msisdn) {
      throw new Error('Daraja ShortCode or Test MSISDN not set in .env');
    }

    const payload = {
      ShortCode: shortCode,
      CommandID: 'CustomerPayBillOnline',
      Amount: amount,
      Msisdn: msisdn,
      BillRefNumber: meterNo,
    };

    console.log('Step 4: Sending C2B simulation request with payload:', JSON.stringify(payload, null, 2));

    const response = await darajaApi.post('/mpesa/c2b/v1/simulate', payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Step 5: C2B simulation response received:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error in simulateC2BPayment:');
    console.error('- Error message:', error.message);
    if (error.response) {
      console.error('- Response status:', error.response.status);
      console.error('- Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.request) {
      console.error('- Request was made but no response received');
    }
    throw new Error(`Failed to simulate C2B payment: ${error.message}`);
  }
}

module.exports = {
  getAccessToken,
  simulateC2BPayment,
};
