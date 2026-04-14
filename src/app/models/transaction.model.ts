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

export interface RecentTransaction {
  name: string;
  type: string;
  amount: number;
  date?: string;
  description?: string;
}

export interface TopDebtor {
  name: string;
  balance: number;
}

export interface DashboardSummary {
  totalCustomers: number;
  activeCustomers: number;
  totalDebit: number;
  totalCredit: number;
  totalOutstanding: number;
  todayTransactionCount: number;
  todayDebit: number;
  todayCredit: number;
  topDebtors: TopDebtor[];
  recentTransactions: RecentTransaction[];
  monthlyData: { [key: string]: number };
}
