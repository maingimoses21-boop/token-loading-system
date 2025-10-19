const { db } = require('./firebase');

/**
 * Find user ID by meter number
 * @param {string} meterNo - The meter number to search for
 * @returns {Promise<string|null>} - User ID or null if not found
 */
async function findUserIdByMeter(meterNo) {
  try {
    console.log(`Searching for user with meter_no: ${meterNo}`);
    
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('meter_no').equalTo(meterNo).once('value');
    
    if (!snapshot.exists()) {
      console.log(`No user found with meter_no: ${meterNo}`);
      return null;
    }
    
    const users = snapshot.val();
    const userId = Object.keys(users)[0]; // Get first matching user
    
    console.log(`Found user ${userId} for meter_no: ${meterNo}`);
    return userId;
  } catch (error) {
    throw error;
  }
}

/**
 * Calculate units from amount (1 unit = KSH 25)
 * @param {number} amount - The amount in KSH
 * @returns {number} - Number of units (float with 2 decimal places)
 */
function calculateUnits(amount) {
  return parseFloat((parseFloat(amount) / 25).toFixed(2));
}

/**
 * Create a transaction for a specific meter number
 * @param {string} meterNo - The meter number
 * @param {number} amount - The transaction amount
 * @param {string} status - The transaction status (SUCCESS, FAILED, PENDING)
 * @param {string} reference - Optional reference (e.g., OriginatorCoversationID)
 * @returns {Promise<Object>} - The created transaction object
 */
async function createTransactionForMeter(meterNo, amount, status = 'SUCCESS', reference = null) {
  try {
    console.log(`Creating transaction for meter ${meterNo}, amount: ${amount}, status: ${status}`);
    
    // Find user by meter number
    const userId = await findUserIdByMeter(meterNo);
    if (!userId) {
      throw new Error(`No user found with meter_no: ${meterNo}`);
    }
    
    // Calculate units
    const units = calculateUnits(amount);
    const remainder = parseFloat(amount) % 25;
    
    // Generate transaction ID and create transaction object
    const transactionRef = db.ref('transactions').push();
    const transactionId = transactionRef.key;
    
    const transaction = {
      transaction_id: transactionId,
      user_id: userId,
      meter_no: meterNo,
      amount: parseFloat(amount),
      units: units,
      remainder: remainder,
      status: status,
      timestamp: new Date().toISOString(),
      reference: reference // Store the OriginatorCoversationID for callback matching
    };
    
    // Write transaction to database
    await transactionRef.set(transaction);
    console.log(`Created transaction ${transactionId} for user ${userId}: ${units} units (${remainder.toFixed(2)} remainder)`);
    
    // Update user's latest_transaction_id if successful
    if (status === 'SUCCESS') {
      const userRef = db.ref(`users/${userId}`);
      await userRef.update({
        latest_transaction_id: transactionId,
        last_payment_timestamp: transaction.timestamp,
        last_payment_amount: amount,
        last_units_purchased: units
      });
      console.log(`Updated user ${userId} with latest_transaction_id: ${transactionId}`);
      try {
        // Recalculate user's available units (sum of successful transactions) and persist to users/<userId>/balance
        const availableUnits = await calculateAvailableUnits(userId);
        await userRef.update({ balance: availableUnits });
        console.log(`Updated user ${userId} balance: ${availableUnits}`);
      } catch (err) {
        console.warn(`Failed to update user ${userId} balance after creating transaction:`, err.message);
      }
    }
    
    return transaction;
  } catch (error) {
    console.error('Error creating transaction:', error.message);
    throw error;
  }
}

/**
 * Check if a transaction with the given MpesaReceiptNumber already exists
 * @param {string} mpesaReceiptNumber - The M-Pesa receipt number
 * @returns {Promise<boolean>} - True if transaction exists, false otherwise
 */
async function transactionExists(mpesaReceiptNumber) {
  try {
    if (!mpesaReceiptNumber) return false;
    
    const transactionsRef = db.ref('transactions');
    const snapshot = await transactionsRef.orderByChild('mpesa_receipt').equalTo(mpesaReceiptNumber).once('value');
    
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking transaction existence:', error.message);
    return false;
  }
}

/**
 * Find existing transaction by reference (OriginatorCoversationID)
 * @param {string} reference - The reference to search for
 * @returns {Promise<Object|null>} - Transaction object or null if not found
 */
async function findTransactionByReference(reference) {
  try {
    if (!reference) return null;
    
    const transactionsRef = db.ref('transactions');
    const snapshot = await transactionsRef.orderByChild('reference').equalTo(reference).once('value');
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const transactions = snapshot.val();
    const transactionId = Object.keys(transactions)[0];
    return {
      id: transactionId,
      ...transactions[transactionId]
    };
  } catch (error) {
    console.error('Error finding transaction by reference:', error.message);
    return null;
  }
}

/**
 * Calculate available units for a user (purchased - consumed)
 * @param {string} userId - The user ID
 * @returns {Promise<number>} - Available units
 */
async function calculateAvailableUnits(userId) {
  try {
    // Get purchased units from transactions
    const transactionsRef = db.ref('transactions');
    const transactionsSnapshot = await transactionsRef.orderByChild('user_id').equalTo(userId).once('value');

    let totalPurchasedUnits = 0;
    if (transactionsSnapshot.exists()) {
      const transactions = transactionsSnapshot.val();
      Object.values(transactions).forEach(transaction => {
        if (transaction.status === 'SUCCESS' || transaction.status === 'completed') {
          totalPurchasedUnits += parseFloat(transaction.units || 0);
        }
      });
    }

    // Get consumed units
    const consumptionRef = db.ref('unit_consumption');
    const consumptionSnapshot = await consumptionRef.orderByChild('user_id').equalTo(userId).once('value');

    let totalConsumedUnits = 0;
    if (consumptionSnapshot.exists()) {
      const consumptions = consumptionSnapshot.val();
      Object.values(consumptions).forEach(consumption => {
        totalConsumedUnits += parseFloat(consumption.units_consumed || 0);
      });
    }

    return parseFloat(Math.max(0, totalPurchasedUnits - totalConsumedUnits).toFixed(2));
  } catch (error) {
    console.error('Error calculating available units:', error.message);
    return 0;
  }
}

/**
 * Calculate total balance and units for a user from all successful transactions
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Object with balance, units, and transaction count
 */
async function calculateUserBalance(userId) {
  try {
    console.log(`Calculating balance for user: ${userId}`);
    
    const transactionsRef = db.ref('transactions');
    const snapshot = await transactionsRef.orderByChild('user_id').equalTo(userId).once('value');
    
    if (!snapshot.exists()) {
      console.log(`No transactions found for user ${userId}`);
      return {
        totalAmountPaid: 0,
        totalUnitsPurchased: 0,
        availableUnits: 0,
        transactionCount: 0
      };
    }
    
    const transactions = snapshot.val();
    let totalAmountPaid = 0;
    let totalUnitsPurchased = 0;
    let successfulTransactions = 0;
    
    Object.values(transactions).forEach(transaction => {
      // Only count successful transactions
      if (transaction.status === 'SUCCESS' || transaction.status === 'completed') {
        totalAmountPaid += parseFloat(transaction.amount || 0);
        totalUnitsPurchased += parseFloat(transaction.units || 0);
        successfulTransactions++;
      }
    });
    
    // Calculate available units (purchased - consumed)
    const availableUnits = await calculateAvailableUnits(userId);
    
    console.log(`User ${userId}: ${successfulTransactions} successful transactions, total paid: ${totalAmountPaid}, purchased units: ${totalUnitsPurchased}, available units: ${availableUnits}`);
    return {
      totalAmountPaid: parseFloat(totalAmountPaid.toFixed(2)),
      totalUnitsPurchased: parseFloat(totalUnitsPurchased.toFixed(2)),
      availableUnits: availableUnits,
      transactionCount: successfulTransactions
    };
  } catch (error) {
    console.error('Error calculating user balance:', error.message);
    return {
      totalAmountPaid: 0,
      totalUnitsPurchased: 0,
      availableUnits: 0,
      transactionCount: 0
    };
  }
}

/**
 * Save transaction from Daraja callback
 * @param {Object} callbackData - The callback data from Daraja
 * @returns {Promise<Object>} - Result object with success status and transaction details
 */
async function saveCallbackTransaction(callbackData) {
  try {
    console.log('Processing Daraja callback:', JSON.stringify(callbackData, null, 2));
    
    // Extract fields from callback data with fallbacks for different payload formats
    const resultCode = callbackData.ResultCode || callbackData.resultCode || 1;
    const resultDesc = callbackData.ResultDesc || callbackData.resultDesc || 'Unknown result';
    const mpesaReceiptNumber = callbackData.MpesaReceiptNumber || callbackData.mpesaReceiptNumber || callbackData.TransactionID;
    const amount = parseFloat(callbackData.Amount || callbackData.amount || callbackData.TransAmount || 0);
    const transactionDate = callbackData.TransactionDate || callbackData.transactionDate || new Date().toISOString();
    const billRefNumber = callbackData.BillRefNumber || callbackData.billRefNumber || callbackData.AccountReference;
    const phoneNumber = callbackData.PhoneNumber || callbackData.phoneNumber || callbackData.MSISDN;
    
    console.log(`Extracted data: ResultCode=${resultCode}, Amount=${amount}, BillRefNumber=${billRefNumber}, MpesaReceipt=${mpesaReceiptNumber}`);
    
    // Check for required fields
    if (!billRefNumber) {
      throw new Error('BillRefNumber (meter_no) is required but not found in callback');
    }
    
    // Check for duplicate transaction by MpesaReceiptNumber
    if (mpesaReceiptNumber && await transactionExists(mpesaReceiptNumber)) {
      console.log(`Transaction with MpesaReceiptNumber ${mpesaReceiptNumber} already exists. Skipping.`);
      return {
        success: true,
        duplicate: true,
        message: 'Transaction already processed',
        transaction_id: null
      };
    }
    
    // Try to find existing transaction by reference (for updates)
    const conversationId = callbackData.OriginatorCoversationID || callbackData.originatorCoversationID;
    let existingTransaction = null;
    
    if (conversationId) {
      existingTransaction = await findTransactionByReference(conversationId);
      console.log(`Found existing transaction for reference ${conversationId}:`, existingTransaction?.id);
    }
    
    // Find user by meter number
    const userId = await findUserIdByMeter(billRefNumber);
    if (!userId) {
      throw new Error(`No user found with meter_no: ${billRefNumber}`);
    }
    
    // Determine transaction status
    const status = resultCode === 0 ? 'SUCCESS' : 'FAILED';
    
    // Format transaction date to ISO string
    let formattedTimestamp;
    try {
      // Daraja date format: YYYYMMDDHHMMSS
      if (transactionDate && transactionDate.length === 14) {
        const year = transactionDate.substring(0, 4);
        const month = transactionDate.substring(4, 6);
        const day = transactionDate.substring(6, 8);
        const hour = transactionDate.substring(8, 10);
        const minute = transactionDate.substring(10, 12);
        const second = transactionDate.substring(12, 14);
        formattedTimestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
      } else {
        formattedTimestamp = new Date(transactionDate).toISOString();
      }
    } catch (error) {
      console.warn('Error parsing transaction date, using current time:', error.message);
      formattedTimestamp = new Date().toISOString();
    }
    
    let transactionId;
    let transaction;
    
    if (existingTransaction) {
      // Update existing transaction
      transactionId = existingTransaction.id;
      transaction = {
        ...existingTransaction,
        status: status,
        mpesa_receipt: mpesaReceiptNumber || existingTransaction.mpesa_receipt,
        phone_number: phoneNumber || existingTransaction.phone_number,
        result_code: resultCode,
        result_desc: resultDesc,
        timestamp: formattedTimestamp,
        raw_callback: callbackData // Store full payload for auditing
      };
      
      const transactionRef = db.ref(`transactions/${transactionId}`);
      await transactionRef.update({
        status: status,
        mpesa_receipt: mpesaReceiptNumber || null,
        phone_number: phoneNumber || null,
        result_code: resultCode,
        result_desc: resultDesc,
        timestamp: formattedTimestamp,
        raw_callback: callbackData
      });
      console.log(`Updated existing transaction ${transactionId} for user ${userId} with status ${status}`);
    } else {
      // Create new transaction
      const transactionRef = db.ref('transactions').push();
      transactionId = transactionRef.key;
      
      transaction = {
        transaction_id: transactionId,
        user_id: userId,
        meter_no: billRefNumber,
        amount: amount,
        status: status,
        mpesa_receipt: mpesaReceiptNumber || null,
        phone_number: phoneNumber || null,
        result_code: resultCode,
        result_desc: resultDesc,
        timestamp: formattedTimestamp,
        raw_callback: callbackData // Store full payload for auditing
      };
      
      await transactionRef.set(transaction);
      console.log(`Created new transaction ${transactionId} for user ${userId} with status ${status}`);
    }
    
    // Update user's latest_transaction_id only for successful transactions
    if (status === 'SUCCESS') {
      const userRef = db.ref(`users/${userId}`);
      await userRef.update({
        latest_transaction_id: transactionId,
        last_payment_timestamp: formattedTimestamp,
        last_payment_amount: amount
      });
      console.log(`Updated user ${userId} with latest_transaction_id: ${transactionId}`);
      try {
        // Recalculate user's balance (sum of successful transactions) and persist
        // Prefer using stored units if present, otherwise derive from amount
        const availableUnits = await calculateAvailableUnits(userId);
        await userRef.update({ balance: availableUnits });
        console.log(`Updated user ${userId} balance: ${availableUnits}`);
      } catch (err) {
        console.warn(`Failed to update user ${userId} balance after callback processing:`, err.message);
      }
    }
    
    return {
      success: true,
      duplicate: false,
      message: `Transaction ${status.toLowerCase()} processed successfully`,
      transaction_id: transactionId,
      status: status
    };
    
  } catch (error) {
    console.error('Error saving callback transaction:', error.message);
    return {
      success: false,
      duplicate: false,
      message: error.message,
      transaction_id: null
    };
  }
}

module.exports = {
  findUserIdByMeter,
  createTransactionForMeter,
  saveCallbackTransaction,
  transactionExists,
  findTransactionByReference,
  calculateUserBalance,
  calculateUnits,
  calculateAvailableUnits
};