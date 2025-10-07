#!/usr/bin/env node

/**
 * Test units calculation and check transaction structure
 * Run with: node test-units.js
 */

require('dotenv').config();
const { db } = require('./firebase');
const { calculateUserBalance } = require('./transactions');

async function testUnits() {
  console.log('🧪 Testing Units Calculation...\n');
  
  try {
    const userId = '-OaFeegq_CTrS_tdq78t';
    
    // First, let's check what transactions exist
    console.log('📋 Checking existing transactions...');
    const transactionsRef = db.ref('transactions');
    const snapshot = await transactionsRef.orderByChild('user_id').equalTo(userId).once('value');
    
    if (snapshot.exists()) {
      const transactions = snapshot.val();
      console.log(`Found ${Object.keys(transactions).length} transactions:`);
      
      Object.entries(transactions).forEach(([id, transaction]) => {
        console.log(`- ${id}: Amount=${transaction.amount}, Units=${transaction.units || 'MISSING'}, Status=${transaction.status}`);
      });
    } else {
      console.log('No transactions found');
    }
    
    // Test balance calculation
    console.log('\n💰 Testing balance calculation...');
    const balanceData = await calculateUserBalance(userId);
    console.log('Balance result:', balanceData);
    
    // Make a new payment to test units
    console.log('\n💳 Making test payment with units...');
    const axios = require('axios');
    
    const paymentResponse = await axios.post('http://localhost:3000/daraja/simulate', {
      meter_no: '12345678',
      amount: 125 // Should give 5 units
    });
    
    console.log('Payment response:', paymentResponse.data);
    
    // Check balance again
    console.log('\n💰 Checking balance after payment...');
    const newBalanceData = await calculateUserBalance(userId);
    console.log('New balance result:', newBalanceData);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testUnits();
