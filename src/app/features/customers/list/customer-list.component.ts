import { Component, inject, signal, computed } from '@angular/core';
import { AsyncPipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { CustomerService } from '../../../core/services/customer.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';

@Component({
    selector: 'app-customer-list',
    standalone: true,
    imports: [
        AsyncPipe,
        DecimalPipe,
        NgClass,
        RouterLink,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatCardModule
    ],
    templateUrl: './customer-list.component.html',
    styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent {
    private customerService = inject(CustomerService);
    private breakpointObserver = inject(BreakpointObserver);

    displayedColumns: string[] = ['name', 'mobile', 'balance', 'actions'];
    searchQuery = signal('');

    filteredCustomers = computed(() => {
        const query = this.searchQuery().toLowerCase();
        return this.customerService.customers().filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.mobile.includes(query)
        );
    });

    isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
        .pipe(map(result => result.matches));

    onSearch(event: Event) {
        const input = event.target as HTMLInputElement;
        this.searchQuery.set(input.value);
    }

    deleteCustomer(id: string) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.customerService.deleteCustomer(id);
        }
    }
}
