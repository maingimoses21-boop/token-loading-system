require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createTransactionForMeter, findUserIdByMeter, saveCallbackTransaction, calculateUserBalance } = require('./transactions');
const { simulateC2BPayment } = require('./daraja');
const { db } = require('./firebase');

// Ensure firebase initialization happens by importing firebase.js
require('./firebase');

const app = express();

// CORS middleware for frontend integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User lookup endpoint for frontend authentication
app.get('/users/lookup', async (req, res) => {
  try {
    const { email, meter_no } = req.query;

    if (!email || !meter_no) {
      return res.status(400).json({ 
        error: 'Both email and meter_no query parameters are required' 
      });
    }

    console.log(`Looking up user with email: ${email}, meter_no: ${meter_no}`);

    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'No users found in database' });
    }

    const users = snapshot.val();
    const userKey = Object.keys(users).find(key => 
      users[key].email === email && users[key].meter_no === meter_no
    );

    if (!userKey) {
      return res.status(404).json({ error: 'User not found with provided credentials' });
    }

    const userData = {
      user_id: userKey,
      name: users[userKey].name || 'Unknown',
      email: users[userKey].email,
      meter_no: users[userKey].meter_no,
      balance: users[userKey].balance || 0,
      latest_transaction_id: users[userKey].latest_transaction_id || null
    };

    console.log(`Found user: ${userData.user_id}`);
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error looking up user:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new user endpoint
app.post('/users', async (req, res) => {
  try {
    const { name, email, meter_no } = req.body;
    
    // Validate required fields
    if (!name || !email || !meter_no) {
      return res.status(400).json({ 
        error: 'All fields are required: name, email, meter_no' 
      });
    }
    
    // Check if user with this email or meter_no already exists
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');
    const users = snapshot.val() || {};
    
    // Check for existing email or meter number
    for (const userKey in users) {
      const user = users[userKey];
      if (user.email === email) {
        return res.status(409).json({ 
          error: 'User with this email already exists' 
        });
      }
      if (user.meter_no === meter_no) {
        return res.status(409).json({ 
          error: 'User with this meter number already exists' 
        });
      }
    }
    
    // Create new user
    const newUserRef = usersRef.push();
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      meter_no: meter_no.trim(),
      balance: 0,
      created_at: new Date().toISOString(),
      latest_transaction_id: null
    };
    
    await newUserRef.set(userData);
    
    console.log(`Created new user: ${newUserRef.key} - ${name} (${email}) - Meter: ${meter_no}`);
    
    res.status(201).json({
      user_id: newUserRef.key,
      ...userData
    });
    
  } catch (error) {
    console.error('Error creating user:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transactions for a specific user
app.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching transactions for user: ${userId}`);
    
    const transactionsRef = db.ref('transactions');
    const snapshot = await transactionsRef.orderByChild('user_id').equalTo(userId).once('value');
    
    if (!snapshot.exists()) {
      console.log(`No transactions found for user ${userId}`);
      return res.status(200).json([]);
    }
    
    const transactionsData = snapshot.val();
    const transactions = Object.keys(transactionsData)
      .map(key => ({
        id: key,
        ...transactionsData[key]
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`Found ${transactions.length} transactions for user ${userId}`);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user balance (sum of all successful transactions)
app.get('/users/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching balance for user: ${userId}`);
    
    const balanceData = await calculateUserBalance(userId);
    
    res.status(200).json({
      user_id: userId,
      totalAmountPaid: balanceData.totalAmountPaid,
      totalUnitsPurchased: balanceData.totalUnitsPurchased,
      availableUnits: balanceData.availableUnits,
      transactionCount: balanceData.transactionCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user balance:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// M-Pesa Daraja callback endpoint
app.post('/daraja/callback', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received Daraja callback:`, JSON.stringify(req.body, null, 2));
  
  try {
    const payload = req.body || {};
    
    // Process the callback using the new saveCallbackTransaction function
    const result = await saveCallbackTransaction(payload);
    
    if (result.success) {
      if (result.duplicate) {
        console.log(`[${timestamp}] Duplicate transaction detected: ${result.message}`);
        // Always respond 200 to Daraja to stop retries
        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Confirmation received successfully (duplicate)",
          TransactionID: result.transaction_id
        });
      } else {
        console.log(`[${timestamp}] Transaction processed successfully: ${result.transaction_id}`);
        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Confirmation received successfully",
          TransactionID: result.transaction_id
        });
      }
    } else {
      // Log error but still respond 200 to Daraja to prevent retries
      console.error(`[${timestamp}] Failed to process callback: ${result.message}`);
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: result.message || "Failed to process transaction"
      });
    }
    
  } catch (error) {
    // Log error but always respond 200 to Daraja to prevent infinite retries
    console.error(`[${timestamp}] Error handling Daraja callback:`, error.message);
    return res.status(200).json({
      ResultCode: 1,
      ResultDesc: "Internal server error"
    });
  }
});

const PORT = process.env.PORT || 3000;
// Route to trigger a C2B payment simulation
app.post('/daraja/simulate', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received simulate request:`, JSON.stringify(req.body, null, 2));
  
  try {
    const { meter_no, amount } = req.body;
    if (!meter_no || !amount) {
      console.error(`[${timestamp}] Missing required fields: meter_no=${meter_no}, amount=${amount}`);
      return res.status(400).json({ error: 'meter_no and amount are required' });
    }

    console.log(`[${timestamp}] Simulating C2B payment for meter ${meter_no} with amount ${amount}`);
    const darajaResponse = await simulateC2BPayment(meter_no, amount);
    console.log(`[${timestamp}] Daraja simulation successful:`, JSON.stringify(darajaResponse, null, 2));
    
    // Create initial transaction record after successful simulation
    if (darajaResponse.ResponseCode === '0') {
      try {
        console.log(`[${timestamp}] Creating initial transaction record...`);
        const transaction = await createTransactionForMeter(
          meter_no, 
          amount, 
          'SUCCESS', // Set as SUCCESS since Daraja simulation was successful
          darajaResponse.OriginatorCoversationID || null
        );
        console.log(`[${timestamp}] Created transaction ${transaction.transaction_id} with SUCCESS status`);
        
        // Return enhanced response with transaction info
        res.status(200).json({
          ...darajaResponse,
          transaction_id: transaction.transaction_id,
          status: 'SUCCESS'
        });
      } catch (dbError) {
        console.error(`[${timestamp}] Failed to create transaction record:`, dbError.message);
        // Still return success from Daraja, but log the DB error
        res.status(200).json(darajaResponse);
      }
    } else {
      res.status(200).json(darajaResponse);
    }
  } catch (error) {
    console.error(`[${timestamp}] Error in /daraja/simulate:`, error.message);
    console.error(`[${timestamp}] Full error details:`, error);
    res.status(500).json({ error: `Failed to simulate payment: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`M-Pesa middleware server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Daraja callback: http://localhost:${PORT}/daraja/callback`);
});