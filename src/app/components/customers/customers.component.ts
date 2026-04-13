import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Customer, CustomerRequest } from '../../models/customer.model';
import { TransactionRequest } from '../../models/transaction.model';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
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
  showDeleteDialog: boolean = false;
  showTransactionDialog: boolean = false;
  editingCustomer: Customer | null = null;
  deletingCustomer: Customer | null = null;
  transactionCustomer: Customer | null = null;
  customerData: CustomerRequest = { name: '', mobile: '' };
  transactionData: TransactionRequest = {
    customerId: '',
    type: 'debit',
    amount: 0,
    description: ''
  };
  error: string = '';
  transactionError: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.apiService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDialog(customer: Customer | null = null): void {
    this.editingCustomer = customer;
    this.customerData = customer ? { name: customer.name, mobile: customer.mobile } : { name: '', mobile: '' };
    this.error = '';
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editingCustomer = null;
    this.customerData = { name: '', mobile: '' };
    this.error = '';
  }

  saveCustomer(): void {
    if (!this.customerData.name || !this.customerData.mobile) {
      this.error = 'All fields are required';
      return;
    }

    const request = this.editingCustomer
      ? this.apiService.updateCustomer(this.editingCustomer.id, this.customerData)
      : this.apiService.createCustomer(this.customerData);

    request.subscribe({
      next: () => {
        this.loadCustomers();
        this.closeDialog();
      },
      error: (err) => {
        this.error = 'Failed to save customer';
      }
    });
  }

  openDeleteDialog(customer: Customer): void {
    this.deletingCustomer = customer;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.deletingCustomer = null;
  }

  confirmDelete(): void {
    if (!this.deletingCustomer) return;

    this.apiService.deleteCustomer(this.deletingCustomer.id).subscribe({
      next: () => {
        this.loadCustomers();
        this.closeDeleteDialog();
      },
      error: () => {
        alert('Failed to delete customer');
        this.closeDeleteDialog();
      }
    });
  }

  openTransactionDialog(customer: Customer): void {
    this.transactionCustomer = customer;
    this.transactionData = {
      customerId: customer.id,
      type: 'debit',
      amount: 0,
      description: ''
    };
    this.transactionError = '';
    this.showTransactionDialog = true;
  }

  closeTransactionDialog(): void {
    this.showTransactionDialog = false;
    this.transactionCustomer = null;
    this.transactionData = { customerId: '', type: 'debit', amount: 0, description: '' };
    this.transactionError = '';
  }

  saveTransaction(): void {
    if (!this.transactionData.amount || this.transactionData.amount <= 0) {
      this.transactionError = 'Please enter a valid amount';
      return;
    }

    this.apiService.createTransaction(this.transactionData).subscribe({
      next: () => {
        this.loadCustomers();
        this.closeTransactionDialog();
      },
      error: () => {
        this.transactionError = 'Failed to create transaction';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
