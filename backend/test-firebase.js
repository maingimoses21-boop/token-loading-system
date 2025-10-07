require('dotenv').config();
const { db } = require('./firebase');

async function testFirebase() {
  try {
    // Write test data
    const ref = db.ref('test_connection');
    await ref.set({
      message: 'Moses Maingi 🚀😂👋',
      timestamp: new Date().toISOString()
    });

    console.log('✅ Data written successfully! Now reading back...');

    // Read it back
    const snapshot = await ref.once('value');
    console.log('🔎 Data from Firebase:', snapshot.val());

  } catch (err) {
    console.error('❌ Firebase test failed:', err);
  }
}

testFirebase();
