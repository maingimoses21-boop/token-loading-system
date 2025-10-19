import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserBalance } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionList from '../components/TransactionList';
import PaymentModal from '../components/PaymentModal';
import { CreditCard, User, Hash, LogOut } from 'lucide-react';

const DashboardPage = () => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [totalAmountPaid, setTotalAmountPaid] = useState<number>(0);
  const [totalUnitsPurchased, setTotalUnitsPurchased] = useState<number>(0);
  const [availableUnits, setAvailableUnits] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { user, logout } = useAuth();

  // Fetch calculated balance from transactions
  const fetchBalance = async () => {
    if (!user?.meter_no) return;
    
    try {
      setIsLoadingBalance(true);
      const balanceData = await getUserBalance(user.meter_no);
      setTotalAmountPaid(balanceData.totalAmountPaid || 0);
      setTotalUnitsPurchased(balanceData.totalUnitsPurchased || 0);
      setAvailableUnits(typeof balanceData.availableUnits === 'number' ? balanceData.availableUnits : parseFloat(String(balanceData.availableUnits)) || 0);
      setTransactionCount(balanceData.transactionCount || 0);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching balance:', error);
      setTotalAmountPaid(0);
      setTotalUnitsPurchased(0);
      setAvailableUnits(0);
      setTransactionCount(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    // Fetch persisted balance once when user changes
    fetchBalance();
  }, [user?.user_id]);

  const handlePaymentSuccess = () => {
    // Refresh balance after successful payment
    fetchBalance();
  };

  if (!user) {
    return null; // This shouldn't happen due to routing, but good fallback
  }

  const calculateUnits = (amount: number) => {
    return Math.floor(amount / 25);
  };

  // Use calculated balance and units from transactions
  const userBalance = totalAmountPaid;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">
                IOT Smart Meter
              </h1>
              <p className="text-gray-600 mt-1">Smart Meter Payment Dashboard</p>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="flex items-center gap-2 border-gray-300 text-black hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome & Balance Card */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <User className="h-5 w-5 text-gray-600" />
                Welcome back!
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage your payments and view transaction history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-black">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Meter Number</p>
                  <p className="font-mono font-medium text-black">{user.meter_no}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-black">
                  <Hash className="h-5 w-7 text-gray-600" />
                  Account Summary
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  {lastUpdated && (
                    <span className="text-xs">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* <div>
                <p className="text-sm text-gray-600">Total Amount Paid</p>
                {isLoadingBalance ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                    <p className="text-lg text-gray-600">Loading...</p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-black">
                    KSH {userBalance.toFixed(2)}
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  Total amount paid so far ({transactionCount} payments)
                </p>
              </div> */}
              
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600">Available Units</p>
                {isLoadingBalance ? (
                  <p className="text-lg text-gray-600">Calculating...</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-semibold text-black">
                        {availableUnits.toFixed(2)} ⚡
                      </p>
                      <span className="text-sm text-gray-600">units remaining</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {/* <p>Purchased: {totalUnitsPurchased.toFixed(2)} units</p> */}
                      {/* <p>Consumed: {(totalUnitsPurchased - availableUnits).toFixed(2)} units</p> */}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-gray-600">
                    Rate: 1 unit = KSH 25.00
                  </p>
                  {/* Automatic consumption simulation disabled — balance only updates on transactions */}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-black">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">
              Make a payment or manage your account
            </CardDescription>
          </CardHeader>
            <CardContent>
            <Button 
              onClick={() => setIsPaymentModalOpen(true)}
              size="lg"
              className="w-full md:w-auto bg-black hover:bg-black/90 text-white border-0"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Make Payment
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <TransactionList />
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        meterNo={user.meter_no}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default DashboardPage;