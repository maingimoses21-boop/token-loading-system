#!/usr/bin/env node

/**
 * Check the structure of the latest transaction
 */

require('dotenv').config();
const { db } = require('./firebase');

async function checkLatestTransaction() {
  try {
    const transactionId = '-OaFmsz0aXNI4jDZwqJw'; // From the test above
    
    const transactionRef = db.ref(`transactions/${transactionId}`);
    const snapshot = await transactionRef.once('value');
    
    if (snapshot.exists()) {
      const transaction = snapshot.val();
      console.log('Latest transaction structure:');
      console.log(JSON.stringify(transaction, null, 2));
    } else {
      console.log('Transaction not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkLatestTransaction();
