import { Injectable, signal, computed } from '@angular/core';
import { LedgerEntry } from '../../shared/models/ledger.model';
import { CustomerService } from './customer.service';

@Injectable({
    providedIn: 'root'
})
export class LedgerService {
    private _entries = signal<LedgerEntry[]>([
        { id: '101', customerId: '1', amount: 500, type: 'DEBIT', description: 'Grocery', date: new Date() },
        { id: '102', customerId: '1', amount: 250, type: 'DEBIT', description: 'Milk & Bread', date: new Date() },
        { id: '103', customerId: '2', amount: 200, type: 'CREDIT', description: 'Payment received', date: new Date() }
    ]);

    constructor(private customerService: CustomerService) { }

    getEntriesByCustomer(customerId: string) {
        return computed(() => this._entries().filter(e => e.customerId === customerId).sort((a, b) => b.date.getTime() - a.date.getTime()));
    }

    addEntry(customerId: string, amount: number, type: 'DEBIT' | 'CREDIT', description: string) {
        const newEntry: LedgerEntry = {
            id: Math.random().toString(36).substring(2, 9),
            customerId,
            amount,
            type,
            description,
            date: new Date()
        };

        this._entries.update(prev => [...prev, newEntry]);

        // Update customer balance: DEBIT increases debt (pending), CREDIT decreases debt
        // But in Kirana apps, usually DEBIT is what they "took" (owe us) and CREDIT is what they "paid".
        // Let's assume balance = amount owed to us.
        const balanceChange = type === 'DEBIT' ? amount : -amount;
        this.customerService.updateBalance(customerId, balanceChange);
    }
}
