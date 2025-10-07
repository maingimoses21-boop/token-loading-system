import React, { useState } from 'react';
import { simulatePayment, PaymentResponse } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  meterNo: string;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  meterNo, 
  onSuccess 
}) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const { toast } = useToast();
  const calculateUnits = (amount: number) => {
    return parseFloat((amount / 25).toFixed(2));
  };

  const amountValue = parseFloat(amount) || 0;
  const calculatedUnits = calculateUnits(amountValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Frontend: Starting payment simulation...');
      // Call backend API to simulate payment
      const result = await simulatePayment({
        meter_no: meterNo,
        amount: numAmount
      });
      
      console.log('Frontend: Payment simulation result:', result);
      
      // Transform Daraja response to expected format
      const transformedResult: PaymentResponse = {
        transaction_id: result.transaction_id || result.OriginatorCoversationID || 'PENDING',
        amount: numAmount, // Use the amount we sent
        status: result.status === 'SUCCESS' ? 'completed' : result.ResponseCode === '0' ? 'completed' : 'failed',
        meter_no: meterNo, // Use the meter number we sent
        timestamp: new Date().toISOString()
      };
      
      setPaymentResult(transformedResult);
      onSuccess();
      
      toast({
        title: "Payment Initiated",
        description: `Payment simulation successful. Transaction will be processed shortly.`,
      });
    } catch (error) {
      console.error('Frontend: Payment error details:', error);
      
      // Don't call onSuccess() on error to prevent dashboard refresh
      let errorMessage = 'Failed to process payment';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle axios error
        const axiosError = error as any;
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Don't close the modal on error, let user try again
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentResult ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Payment Confirmation
              </>
            ) : (
              'Make Payment'
            )}
          </DialogTitle>
          <DialogDescription>
            {paymentResult 
              ? 'Your payment has been processed successfully'
              : 'Enter the amount you wish to pay'
            }
          </DialogDescription>
        </DialogHeader>

        {paymentResult ? (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Transaction ID:</span>
                <span className="font-mono text-sm">{paymentResult.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span className="font-semibold">KSH {paymentResult.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Meter Number:</span>
                <span className="font-mono text-sm">{paymentResult.meter_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={`capitalize px-2 py-1 rounded text-sm ${
                  paymentResult.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : paymentResult.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {paymentResult.status}
                </span>
              </div>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meterNo">Meter Number</Label>
              <Input
                id="meterNo"
                value={meterNo}
                disabled
                className="bg-gray-100 text-black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KSH)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                min="1"
                step="0.01"
                required
              />
              
              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                <p className="text-xs text-gray-600 w-full mb-1">Quick amounts:</p>
                {[25, 50, 100, 250, 500, 1000].map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={isLoading}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    {quickAmount} KSH
                    <span className="ml-1 text-green-600">
                      ({(quickAmount / 25).toFixed(2)}⚡)
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Units to Purchase</Label>
              <div className="relative">
                <Input
                  id="units"
                  type="text"
                  value={amountValue > 0 ? `${calculatedUnits.toFixed(2)} units` : ''}
                  disabled
                  placeholder="Enter amount to see units"
                  className="bg-white border border-gray-300 text-lg font-semibold text-center text-black"
                />
                {amountValue > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-green-600 font-bold">⚡</span>
                  </div>
                )}
              </div>
              
              {/* Enhanced unit calculation display */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-medium text-black">1 unit = KSH 25.00</span>
                </div>
                
                {amountValue > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-black">KSH {amountValue.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Units:</span>
                      <span className="font-bold text-black">{calculatedUnits.toFixed(2)} units</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-black">Total Units:</span>
                        <span className="text-black text-lg">{calculatedUnits.toFixed(2)} ⚡</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Precise calculation: {amountValue} ÷ 25 = {calculatedUnits.toFixed(2)}
                      </div>
                    </div>
                  </>
                )}
                
                {amountValue === 0 && (
                  <p className="text-center text-gray-600 text-sm italic">
                    Enter an amount to see unit calculation
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;