#!/usr/bin/env node

/**
 * Create a test user in Firebase for testing
 * Run with: node create-test-user.js
 */

require('dotenv').config();
const { db } = require('./firebase');

async function createTestUser() {
  console.log('🔧 Creating test user...\n');
  
  try {
    // Create test user
    const userRef = db.ref('users').push();
    const userId = userRef.key;
    
    const testUser = {
      user_id: userId,
      name: 'Test User',
      email: 'demo@example.com',
      meter_no: '12345678',
      balance: 0, // This will be calculated from transactions
      created_at: new Date().toISOString()
    };
    
    await userRef.set(testUser);
    console.log('✅ Test user created successfully!');
    console.log('User ID:', userId);
    console.log('Email:', testUser.email);
    console.log('Meter No:', testUser.meter_no);
    
    // Test the balance calculation
    const { calculateUserBalance } = require('./transactions');
    const balance = await calculateUserBalance(userId);
    console.log('Calculated Balance:', balance);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();
