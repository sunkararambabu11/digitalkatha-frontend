export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
    id: string;
    customerId: string;
    amount: number;
    type: LedgerEntryType;
    description: string;
    date: Date;
}
