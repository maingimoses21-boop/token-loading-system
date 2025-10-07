import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface PaymentRequest {
  meter_no: string;
  amount: number;
}

export interface PaymentResponse {
  transaction_id: string;
  amount: number;
  status: string;
  meter_no: string;
  timestamp: string;
}

export interface Transaction {
  transaction_id: string;
  amount: number;
  units: number;
  remainder?: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  meter_no: string;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  meter_no: string;
  balance: number;
  latest_transaction_id?: string;
}

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const response = await api.get(`/transactions/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Failed to fetch transactions');
  }
};

export interface UserBalance {
  user_id: string;
  totalAmountPaid: number;
  totalUnitsPurchased: number;
  availableUnits: number;
  transactionCount: number;
  timestamp: string;
}

export const getUserBalance = async (userId: string): Promise<UserBalance> => {
  try {
    const response = await api.get(`/users/${userId}/balance`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user balance:', error);
    throw new Error('Failed to fetch user balance');
  }
};

/**
 * Login user by email and meter number
 * @param email User's email address
 * @param meterNo User's meter number
 * @returns User data if found
 */
export const loginUser = async (email: string, meterNo: string): Promise<User> => {
  try {
    const response = await api.get(`/users/lookup?email=${encodeURIComponent(email)}&meter_no=${encodeURIComponent(meterNo)}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('Invalid email or meter number');
    }
    throw new Error('Failed to connect to server');
  }
};

/**
 * Simulate a payment
 * @param paymentData Payment request data
 * @returns Payment response
 */
export const simulatePayment = async (paymentData: PaymentRequest): Promise<any> => {
  try {
    const response = await api.post('/daraja/simulate', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error simulating payment:', error);
    throw new Error('Failed to simulate payment');
  }
};

/**
 * Get user by email and meter number (alias for loginUser)
 * @deprecated Use loginUser instead
 */
export const getUserByMeterNo = async (email: string, meterNo: string): Promise<User | null> => {
  try {
    return await loginUser(email, meterNo);
  } catch {
    return null;
  }
};

export default api;