export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  openingBalance: number;
  currentBalance: number;
  description?: string;
  createdAt: Date;
}
