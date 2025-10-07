const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let credential;

if (process.env.FIREBASE_SA_PATH) {
  // Use direct JSON file path (preferred method)
  try {
    const serviceAccount = require(process.env.FIREBASE_SA_PATH);
    credential = admin.credential.cert(serviceAccount);
    console.log('Firebase initialized with JSON service account file');
  } catch (error) {
    console.error('Error loading service account file:', error.message);
    throw new Error('Invalid service account file path');
  }
} else if (process.env.FIREBASE_SA_BASE64) {
  // Use base64 encoded service account key (fallback)
  try {
    const serviceAccountKey = JSON.parse(
      Buffer.from(process.env.FIREBASE_SA_BASE64, 'base64').toString('utf8')
    );
    credential = admin.credential.cert(serviceAccountKey);
    console.log('Firebase initialized with base64 service account');
  } catch (error) {
    console.error('Error parsing FIREBASE_SA_BASE64:', error.message);
    throw new Error('Invalid FIREBASE_SA_BASE64 format');
  }
} else {
  // Use Application Default Credentials (ADC)
  credential = admin.credential.applicationDefault();
  console.log('Firebase initialized with Application Default Credentials');
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: credential,
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://iot-smart-meter-205fe-default-rtdb.firebaseio.com'
});

// Export database instance
const db = admin.database();

module.exports = { db, admin };





