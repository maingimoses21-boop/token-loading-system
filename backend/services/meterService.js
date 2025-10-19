// services/meterService.js
const { db } = require('../firebase');

// conversion rate: 1 KES = X units
const UNITS_PER_KES = parseFloat(process.env.UNITS_PER_KES || '0.05');

function generateToken() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function round4(x) {
  return Math.round(x * 10000) / 10000;
}

/**
 * processPayment:
 * - Add units to a user's meter
 * - Mirror balance in /users and /meters
 * - Log transaction with token
 */
async function processPayment(userId, meterNo, amount, reference) {
  const units = round4(amount * UNITS_PER_KES);
  const meterRef = db.ref(`meters/${meterNo}/balance`);
  const userRef = db.ref(`users/${userId}/balance`);
  const transactionRef = db.ref('transactions').push();

  const txnResult = await meterRef.transaction(current => {
    current = Number(current) || 0;
    return round4(current + units);
  });

  if (!txnResult.committed) throw new Error('Failed to commit meter transaction');

  const newBalance = txnResult.snapshot.val();
  await userRef.set(newBalance);

  const token = generateToken();
  const txData = {
    user_id: userId,
    meter_no: meterNo,
    amount,
    units,
    status: 'SUCCESS',
    token,
    reference: reference || null,
    timestamp: Date.now()
  };
  await transactionRef.set(txData);

  return { newBalance, units, token };
}

/**
 * consumeUnits:
 * - Safely subtracts balance (ESP32 call)
 * - Logs consumption in /unit_consumption
 */
async function consumeUnits(meterNo, units) {
  const meterRef = db.ref(`meters/${meterNo}/balance`);
  const meterMetaRef = db.ref(`meters/${meterNo}`);
  const logRef = db.ref('unit_consumption').push();

  const metaSnap = await meterMetaRef.once('value');
  const meta = metaSnap.val() || {};
  const userId = meta.user_id || null;

  const prevSnap = await meterRef.once('value');
  const prevBalance = Number(prevSnap.val() || 0);

  const txnResult = await meterRef.transaction(current => {
    current = Number(current) || 0;
    return Math.max(0, round4(current - units));
  });

  if (!txnResult.committed) throw new Error('Failed to update meter balance');
  const newBalance = txnResult.snapshot.val();

  if (userId) await db.ref(`users/${userId}/balance`).set(newBalance);

  const logData = {
    user_id: userId,
    meter_no: meterNo,
    units_before: prevBalance,
    units_consumed: units,
    units_after: newBalance,
    timestamp: Date.now()
  };
  await logRef.set(logData);

  return { newBalance, prevBalance, unitsConsumed: units };
}

module.exports = { processPayment, consumeUnits };
