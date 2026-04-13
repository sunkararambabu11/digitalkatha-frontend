export interface Transaction {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  type: 'debit' | 'credit';
  amount: number;
  description?: string;
  date: string;
}

export interface TransactionRequest {
  customerId: string;
  type: 'debit' | 'credit';
  amount: number;
  description?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDebit: number;
  totalCredit: number;
  outstandingBalance: number;
}
