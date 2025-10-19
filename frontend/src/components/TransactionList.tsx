import React, { useEffect, useState } from 'react';
import { Transaction, getTransactions } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactions = async () => {
    if (!user?.user_id) return;
    
    setIsLoading(true);
    try {
      const userTransactions = await getTransactions(user.user_id);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.user_id]);

  // Refresh transactions every 30 seconds to get updates
  useEffect(() => {
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [user?.user_id]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      pending: { variant: 'secondary' as const, className: 'bg-gray-100 text-black' },
      failed: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-black">Transaction History</CardTitle>
        <CardDescription className="text-gray-600">
          Your recent payment transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No transactions found
          </div>
        ) : (
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell className="font-mono text-sm text-black">
                      {transaction.transaction_id}
                    </TableCell>
                    <TableCell className="font-semibold text-black">
                      KSH {(transaction.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-black">
                      {(transaction.units || 0).toFixed(2)} ⚡
                      {transaction.remainder && transaction.remainder > 0 && (
                        <span className="text-xs text-orange-500 ml-1">
                          (+{transaction.remainder.toFixed(2)} rem)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(transaction.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionList;