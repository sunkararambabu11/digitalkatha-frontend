import { AsyncPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { LedgerService } from '../../../core/services/ledger.service';
import { CustomerService } from '../../../core/services/customer.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-customer-ledger',
    standalone: true,
    imports: [
        AsyncPipe,
        DatePipe,
        DecimalPipe,
        NgClass,
        RouterLink,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatCardModule
    ],
    templateUrl: './customer-ledger.component.html',
    styleUrl: './customer-ledger.component.scss'
})
export class CustomerLedgerComponent {
    private route = inject(ActivatedRoute);
    private ledgerService = inject(LedgerService);
    private customerService = inject(CustomerService);
    private breakpointObserver = inject(BreakpointObserver);
    private fb = inject(FormBuilder);

    customerId = this.route.snapshot.params['id'];
    customer = this.customerService.getCustomerById(this.customerId);
    entries = this.ledgerService.getEntriesByCustomer(this.customerId);

    isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(map(res => res.matches));

    displayedColumns = ['date', 'description', 'debit', 'credit'];

    showForm = signal(false);
    formType = signal<'DEBIT' | 'CREDIT'>('DEBIT');

    entryForm = this.fb.group({
        amount: [0, [Validators.required, Validators.min(1)]],
        description: ['', Validators.required]
    });

    openTransactionForm(type: 'DEBIT' | 'CREDIT') {
        this.formType.set(type);
        this.showForm.set(true);
        this.entryForm.reset({ amount: 0, description: '' });
    }

    saveEntry() {
        if (this.entryForm.valid) {
            const { amount, description } = this.entryForm.value;
            this.ledgerService.addEntry(this.customerId, amount!, this.formType(), description!);
            this.showForm.set(false);
        }
    }
}
