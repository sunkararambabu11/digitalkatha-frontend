import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Customer } from '../../models/customer.model';
import { Transaction, TransactionRequest } from '../../models/transaction.model';
import { LayoutComponent } from '../layout/layout.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LayoutComponent],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.css']
})
export class CustomerDetailComponent implements OnInit {
  customer: Customer | null = null;
  transactions: Transaction[] = [];
  loading: boolean = true;
  customerId: number = 0;

  // Inline add transaction
  showAddTransaction: boolean = false;
  transactionData: TransactionRequest = {
    customerId: '',
    type: 'DEBIT',
    amount: 0,
    description: ''
  };
  transactionError: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.customerId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // Load customer info
    this.apiService.getCustomers().subscribe({
      next: (customers) => {
        this.customer = customers.find(c => c.id === this.customerId) || null;
        if (!this.customer) {
          this.router.navigate(['/customers']);
          return;
        }
        // Load transactions
        this.apiService.getTransactions(this.customerId).subscribe({
          next: (txns) => {
            this.transactions = txns;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/customers']);
      }
    });
  }

  toggleAddTransaction(): void {
    this.showAddTransaction = !this.showAddTransaction;
    if (this.showAddTransaction) {
      this.transactionData = {
        customerId: this.customerId,
        type: 'DEBIT',
        amount: 0,
        description: ''
      };
      this.transactionError = '';
    }
  }

  saveTransaction(): void {
    if (!this.transactionData.amount || this.transactionData.amount <= 0) {
      this.transactionError = 'Please enter a valid amount';
      return;
    }

    this.apiService.createTransaction(this.transactionData).subscribe({
      next: () => {
        this.showAddTransaction = false;
        this.loadData();
        this.toastService.success('Transaction added', `₹${this.transactionData.amount.toFixed(2)} ${this.transactionData.type.toLowerCase()} recorded`);
      },
      error: () => {
        this.transactionError = 'Failed to create transaction';
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }
}
