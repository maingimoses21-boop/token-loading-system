import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Check if Firebase configuration is available
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                          import.meta.env.VITE_FIREBASE_PROJECT_ID && 
                          import.meta.env.VITE_FIREBASE_DB_URL;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL || 'https://demo-project-default-rtdb.firebaseio.com/',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456789'
};

let app;
let database;

try {
  app = initializeApp(firebaseConfig);
  database = hasFirebaseConfig ? getDatabase(app) : null;
} catch (error) {
  console.warn('Firebase initialization failed, using demo mode:', error);
  app = null;
  database = null;
}

export { database, hasFirebaseConfig };
export default app;