import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Customer } from '../../models/customer.model';
import { Transaction, TransactionRequest } from '../../models/transaction.model';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.css']
})
export class AddTransactionComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() customer: Customer | null = null;
  @Input() customers: Customer[] = [];
  @Input() transaction: Transaction | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  transactionData: TransactionRequest = {
    customerId: '',
    type: 'DEBIT',
    amount: null as any,
    description: ''
  };

  internalCustomers: Customer[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customers'] && this.customers?.length) {
      this.internalCustomers = this.customers;
    }

    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      if (!this.customer && (!this.internalCustomers || this.internalCustomers.length === 0)) {
        this.fetchCustomers();
      }
    }

    if (changes['customer'] || changes['transaction']) {
      this.resetForm();
    }
  }

  fetchCustomers(): void {
    this.apiService.getCustomers().subscribe({
      next: (list) => {
        this.internalCustomers = list;
      },
      error: () => {}
    });
  }

  resetForm(): void {
    this.error = '';
    if (this.transaction) {
      this.transactionData = {
        customerId: this.transaction.customerId || (this.customer ? this.customer.id : ''),
        type: this.transaction.type || 'DEBIT',
        amount: this.transaction.amount || (null as any),
        description: this.transaction.description || ''
      };
    } else {
      this.transactionData = {
        customerId: this.customer ? this.customer.id : '',
        type: 'DEBIT',
        amount: null as any,
        description: ''
      };
    }
  }

  setType(type: 'DEBIT' | 'CREDIT'): void {
    this.transactionData.type = type;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.loading) return;
    this.close.emit();
  }

  onSubmit(): void {
    const customerId = this.customer ? this.customer.id : this.transactionData.customerId;

    if (!customerId) {
      this.error = 'Please select a customer';
      return;
    }

    if (!this.transactionData.amount || Number(this.transactionData.amount) <= 0) {
      this.error = 'Please enter a valid amount greater than 0';
      return;
    }

    this.loading = true;
    this.error = '';

    const payload: TransactionRequest = {
      customerId: Number(customerId),
      type: this.transactionData.type,
      amount: Number(this.transactionData.amount),
      description: this.transactionData.description?.trim() || ''
    };

    const isEdit = !!this.transaction && !!this.transaction.id;
    const request$ = isEdit
      ? this.apiService.updateTransaction(this.transaction!.id!, payload)
      : this.apiService.createTransaction(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        const typeLabel = payload.type === 'DEBIT' ? 'Debit (Given)' : 'Credit (Received)';
        this.toastService.success(
          isEdit ? 'Transaction updated' : 'Transaction added',
          `₹${payload.amount.toFixed(2)} ${typeLabel} recorded`
        );
        this.saved.emit(res);
        this.onClose();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to save transaction. Please try again.';
      }
    });
  }

  getSelectedCustomerName(): string {
    if (this.customer) return this.customer.name;
    const found = this.internalCustomers.find(c => String(c.id) === String(this.transactionData.customerId));
    return found ? found.name : '';
  }
}
