// routes/iot.js
const express = require('express');
const router = express.Router();
const { processPayment, consumeUnits } = require('../services/meterService');
const { db } = require('../firebase');

// Secure your ESP32 calls with an API key
const API_KEY = process.env.API_KEY || 'default-key';
// Get meter balance (for ESP32 or frontend)
router.get('/meter/:12345678/balance', async (req, res) => {
  try {
    const meterNo = req.params.meterNo;
    const snap = await db.ref(`meters/${meterNo}/balance`).once('value');
    res.json({ meterNo, balance: snap.val() || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ESP32 sends consumption updates
router.post('/consume', async (req, res) => {
  try {
    const key = req.header('x-api-key');
    if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });

    const { meterNo, units } = req.body;
    if (!meterNo || typeof units !== 'number') {
      return res.status(400).json({ error: 'meterNo and units are required' });
    }

    const result = await consumeUnits(meterNo, units);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

