export interface Customer {
  id: string;
  userId: string;
  name: string;
  mobile: string;
  balance: number;
  createdAt: string;
}

export interface CustomerRequest {
  name: string;
  mobile: string;
}
