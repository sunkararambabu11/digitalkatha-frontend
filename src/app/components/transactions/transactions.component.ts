import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Transaction, TransactionRequest } from '../../models/transaction.model';
import { Customer } from '../../models/customer.model';
import { LayoutComponent } from '../layout/layout.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LayoutComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  customers: Customer[] = [];
  loading: boolean = true;

  showDialog: boolean = false;
  showDeleteDialog: boolean = false;
  selectedCustomerId: string = 'all';
  editingTransaction: Transaction | null = null;
  deletingTransaction: Transaction | null = null;
  dateFrom: string = '';
  dateTo: string = '';
  transactionData: TransactionRequest = {
    customerId: '',
    type: 'DEBIT',
    amount: 0,
    description: ''
  };
  error: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    // Auto-open add dialog if navigated with ?action=add
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        this.openDialog();
      }
    });
  }

  loadData(): void {
    this.apiService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.loadTransactions();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadTransactions(): void {
    const customerId = this.selectedCustomerId === 'all' ? undefined : this.selectedCustomerId;
    this.apiService.getTransactions(customerId).subscribe({
      next: (data) => {
        this.transactions = data;
        this.applyDateFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterTransactions(): void {
    this.loading = true;
    this.loadTransactions();
  }

  applyDateFilter(): void {
    let result = [...this.transactions];
    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      result = result.filter(t => {
        if (!t.createdAt) return false;
        return new Date(t.createdAt) >= from;
      });
    }
    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        if (!t.createdAt) return false;
        return new Date(t.createdAt) <= to;
      });
    }
    this.filteredTransactions = result;
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.applyDateFilter();
  }

  openDialog(): void {
    this.editingTransaction = null;
    this.transactionData = { customerId: '', type: 'DEBIT', amount: 0, description: '' };
    this.error = '';
    this.showDialog = true;
  }

  openEditDialog(transaction: Transaction): void {
    this.editingTransaction = transaction;
    this.transactionData = {
      customerId: transaction.customerId || '',
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || ''
    };
    this.error = '';
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editingTransaction = null;
    this.transactionData = { customerId: '', type: 'DEBIT', amount: 0, description: '' };
    this.error = '';
  }

  saveTransaction(): void {
    if (!this.editingTransaction && !this.transactionData.customerId) {
      this.error = 'Customer is required';
      return;
    }
    if (!this.transactionData.amount || this.transactionData.amount <= 0) {
      this.error = 'Amount must be greater than 0';
      return;
    }

    if (this.editingTransaction && this.editingTransaction.id) {
      // Update existing
      this.apiService.updateTransaction(this.editingTransaction.id, this.transactionData).subscribe({
        next: () => {
          this.loadData();
          this.closeDialog();
          this.toastService.success('Transaction updated');
        },
        error: () => {
          this.error = 'Failed to update transaction';
        }
      });
    } else {
      // Create new
      this.apiService.createTransaction(this.transactionData).subscribe({
        next: () => {
          this.loadData();
          this.closeDialog();
          this.toastService.success('Transaction added', `₹${this.transactionData.amount.toFixed(2)} ${this.transactionData.type.toLowerCase()} recorded`);
        },
        error: () => {
          this.error = 'Failed to create transaction';
        }
      });
    }
  }

  openDeleteDialog(transaction: Transaction): void {
    this.deletingTransaction = transaction;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.deletingTransaction = null;
  }

  confirmDelete(): void {
    if (!this.deletingTransaction || !this.deletingTransaction.id) return;

    this.apiService.deleteTransaction(this.deletingTransaction.id).subscribe({
      next: () => {
        this.loadData();
        this.closeDeleteDialog();
        this.toastService.success('Transaction deleted');
      },
      error: () => {
        this.toastService.error('Delete failed', 'Could not delete the transaction');
        this.closeDeleteDialog();
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
}
