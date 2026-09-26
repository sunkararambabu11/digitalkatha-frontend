export interface Customer {
  id: number;
  name: string;
  currentBalance: number;
  mobile?: string;
  userId?: number;
  openingBalance?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerRequest {
  name: string;
  mobile: string;
  description?: string;
}
