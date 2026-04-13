import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Transaction, TransactionRequest } from '../../models/transaction.model';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  customers: Customer[] = [];
  loading: boolean = true;
  user: any = null;
  showProfileDropdown: boolean = false;

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  closeProfileDropdown(): void {
    this.showProfileDropdown = false;
  }
  showDialog: boolean = false;
  selectedCustomerId: string = 'all';
  transactionData: TransactionRequest = {
    customerId: '',
    type: 'debit',
    amount: 0,
    description: ''
  };
  error: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.loadData();
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

  openDialog(): void {
    this.transactionData = { customerId: '', type: 'debit', amount: 0, description: '' };
    this.error = '';
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.transactionData = { customerId: '', type: 'debit', amount: 0, description: '' };
    this.error = '';
  }

  saveTransaction(): void {
    if (!this.transactionData.customerId || !this.transactionData.amount) {
      this.error = 'Customer and amount are required';
      return;
    }

    if (this.transactionData.amount <= 0) {
      this.error = 'Amount must be greater than 0';
      return;
    }

    this.apiService.createTransaction(this.transactionData).subscribe({
      next: () => {
        this.loadData();
        this.closeDialog();
      },
      error: () => {
        this.error = 'Failed to create transaction';
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
