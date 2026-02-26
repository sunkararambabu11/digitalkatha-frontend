import { Injectable, computed } from '@angular/core';
import { CustomerService } from './customer.service';
import { LedgerService } from './ledger.service';

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    constructor(
        private customerService: CustomerService,
        private ledgerService: LedgerService
    ) { }

    dashboardStats = computed(() => {
        const customers = this.customerService.customers();
        const totalCustomers = customers.length;
        const totalPending = customers.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0);

        // Summary logic could be more complex with dates, but for mock:
        return {
            totalCustomers,
            totalPending,
            todayDebit: 1250, // Mock
            todayCredit: 800   // Mock
        };
    });
}
