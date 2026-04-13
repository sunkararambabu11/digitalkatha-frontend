export interface Customer {
  id: number;
  name: string;
  currentBalance: number;
  mobile?: string;
}

export interface CustomerRequest {
  name: string;
  mobile: string;
  openingBalance?: number;
  description?: string;
}
