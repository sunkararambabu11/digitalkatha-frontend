import { Injectable, signal, computed } from '@angular/core';
import { Customer } from '../../shared/models/customer.model';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private _customers = signal<Customer[]>([
        {
            id: '1',
            name: 'Rajesh Kumar',
            mobile: '9876543210',
            address: 'Shop 12, Main Market',
            openingBalance: 500,
            currentBalance: 1250,
            description: 'Regular customer',
            createdAt: new Date()
        },
        {
            id: '2',
            name: 'Suresh Raina',
            mobile: '9123456789',
            address: 'H-45, Green Park',
            openingBalance: 0,
            currentBalance: -200,
            description: 'Credit pending',
            createdAt: new Date()
        },
        {
            id: '3',
            name: 'Amit Shah',
            mobile: '8888877777',
            address: 'South Delhi',
            openingBalance: 1000,
            currentBalance: 15000,
            description: 'Bulk buyer',
            createdAt: new Date()
        }
    ]);

    customers = computed(() => this._customers());

    addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'currentBalance'>) {
        const newCustomer: Customer = {
            ...customer,
            id: Math.random().toString(36).substring(2, 9),
            currentBalance: customer.openingBalance,
            createdAt: new Date()
        };
        this._customers.update(prev => [...prev, newCustomer]);
    }

    updateBalance(customerId: string, amount: number) {
        this._customers.update(prev =>
            prev.map(c => c.id === customerId
                ? { ...c, currentBalance: c.currentBalance + amount }
                : c
            )
        );
    }

    deleteCustomer(id: string) {
        this._customers.update(prev => prev.filter(c => c.id !== id));
    }

    getCustomerById(id: string) {
        return computed(() => this._customers().find(c => c.id === id));
    }
}
