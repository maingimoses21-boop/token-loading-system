#!/usr/bin/env node

/**
 * Unit Consumption Service
 * Simulates electricity usage by reducing units at a rate of 0.1 every 15 seconds
 */

require('dotenv').config();
const { db } = require('./firebase');

class UnitConsumptionService {
  constructor() {
    this.consumptionRate = 0.1; // Units consumed every cycle
    this.consumptionInterval = 15000; // 15 seconds in milliseconds
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the consumption service
   */
  start() {
    // Automatic consumption simulation disabled.
    // If you need to re-enable, restore the interval logic here.
    console.log('⚡ Unit consumption service start called, but automatic consumption is disabled.');
    this.isRunning = false;
  }

  /**
   * Stop the consumption service
   */
  stop() {
    console.log('🛑 Unit consumption service stop called (service is disabled)');
  }

  /**
   * Consume units for all users who have available units
   */
  async consumeUnitsForAllUsers() {
    // Automatic consumption disabled. No-op.
    console.log('Unit consumption cycle invoked but disabled.');
  }

  /**
   * Consume units for a specific user
   */
  async consumeUnitsForUser(userId, userData) {
    try {
      // Calculate current available units from transactions
      const availableUnits = await this.calculateAvailableUnits(userId);

      if (availableUnits <= 0) {
        // No units to consume
        return;
      }

      const unitsToConsume = Math.min(this.consumptionRate, availableUnits);
      const newAvailableUnits = Math.max(0, availableUnits - unitsToConsume);

      // Create consumption record
      await this.recordUnitConsumption(userId, unitsToConsume, availableUnits, newAvailableUnits);

      console.log(`👤 User ${userId}: Consumed ${unitsToConsume.toFixed(2)} units (${newAvailableUnits.toFixed(2)} remaining)`);

    } catch (error) {
      throw new Error(`Failed to consume units for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Calculate available units for a user from transactions minus consumption
   */
  async calculateAvailableUnits(userId) {
    try {
      // Get all transactions (purchases)
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

      // Get all consumption records
      const consumptionRef = db.ref('unit_consumption');
      const consumptionSnapshot = await consumptionRef.orderByChild('user_id').equalTo(userId).once('value');

      let totalConsumedUnits = 0;
      if (consumptionSnapshot.exists()) {
        const consumptions = consumptionSnapshot.val();
        Object.values(consumptions).forEach(consumption => {
          totalConsumedUnits += parseFloat(consumption.units_consumed || 0);
        });
      }

      return Math.max(0, totalPurchasedUnits - totalConsumedUnits);
    } catch (error) {
      console.error('Error calculating available units:', error.message);
      return 0;
    }
  }

  /**
   * Record unit consumption in database
   */
  async recordUnitConsumption(userId, unitsConsumed, unitsBefore, unitsAfter) {
    try {
      const consumptionRef = db.ref('unit_consumption').push();
      const consumptionId = consumptionRef.key;

      const consumptionRecord = {
        consumption_id: consumptionId,
        user_id: userId,
        units_consumed: parseFloat(unitsConsumed.toFixed(2)),
        units_before: parseFloat(unitsBefore.toFixed(2)),
        units_after: parseFloat(unitsAfter.toFixed(2)),
        consumption_rate: this.consumptionRate,
        timestamp: new Date().toISOString(),
        type: 'automatic_consumption'
      };

      await consumptionRef.set(consumptionRecord);

      // Update user's current units
      const userRef = db.ref(`users/${userId}`);
      await userRef.update({
        current_units: parseFloat(unitsAfter.toFixed(2)),
        last_consumption_timestamp: consumptionRecord.timestamp,
        last_consumption_amount: parseFloat(unitsConsumed.toFixed(2))
      });

    } catch (error) {
      throw new Error(`Failed to record consumption: ${error.message}`);
    }
  }

  /**
   * Get consumption statistics for a user
   */
  async getUserConsumptionStats(userId) {
    try {
      const consumptionRef = db.ref('unit_consumption');
      const snapshot = await consumptionRef.orderByChild('user_id').equalTo(userId).once('value');

      if (!snapshot.exists()) {
        return {
          totalConsumed: 0,
          consumptionCount: 0,
          averageConsumption: 0,
          lastConsumption: null
        };
      }

      const consumptions = Object.values(snapshot.val());
      const totalConsumed = consumptions.reduce((sum, c) => sum + parseFloat(c.units_consumed || 0), 0);
      const lastConsumption = consumptions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      return {
        totalConsumed: parseFloat(totalConsumed.toFixed(2)),
        consumptionCount: consumptions.length,
        averageConsumption: parseFloat((totalConsumed / consumptions.length).toFixed(2)),
        lastConsumption: lastConsumption
      };
    } catch (error) {
      console.error('Error getting consumption stats:', error.message);
      return null;
    }
  }
}

// Export the service
module.exports = UnitConsumptionService;

// If running directly, start the service
if (require.main === module) {
  const service = new UnitConsumptionService();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    service.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    service.stop();
    process.exit(0);
  });

  // Start the service
  service.start();
  
  console.log('Press Ctrl+C to stop the service');
}
