export interface Transaction {
  id?: number;
  customerId?: number;
  userId?: number;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
  balanceAfter?: number;
  createdAt?: string;
  // Frontend-only field for display (resolved from customer list)
  customerName?: string;
}

export interface TransactionRequest {
  customerId: number | string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDebit: number;
  totalCredit: number;
  totalOutstanding: number;
}
