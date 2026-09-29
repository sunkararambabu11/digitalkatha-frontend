import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Customer, CustomerRequest } from '../../models/customer.model';
import { TransactionRequest } from '../../models/transaction.model';
import { LayoutComponent } from '../layout/layout.component';
import { ToastService } from '../../services/toast.service';
import { AddCustomerComponent } from '../add-customer/add-customer.component';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LayoutComponent, AddCustomerComponent, AddTransactionComponent],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  paginatedCustomers: Customer[] = [];
  loading: boolean = true;
  private dataChangeSub?: Subscription;

  // Search & sort
  searchTerm: string = '';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Vertical Scroll Pagination
  pageSize: number = 15;
  displayedCount: number = 15;
  isLoadingMore: boolean = false;

  showDialog: boolean = false;
  showDeleteDialog: boolean = false;
  showTransactionDialog: boolean = false;
  editingCustomer: Customer | null = null;
  deletingCustomer: Customer | null = null;
  transactionCustomer: Customer | null = null;
  customerData: CustomerRequest = { name: '', mobile: '' };
  transactionData: TransactionRequest = {
    customerId: '',
    type: 'DEBIT',
    amount: 0,
    description: ''
  };
  error: string = '';
  transactionError: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();

    // Refresh immediately when customer or transaction is added (e.g., via AI chat)
    this.dataChangeSub = this.apiService.onDataChange.subscribe(() => {
      this.loadCustomers();
    });

    // Auto-open add dialog if navigated with ?action=add
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        this.openDialog();
      }
    });
  }

  ngOnDestroy(): void {
    this.dataChangeSub?.unsubscribe();
  }

  loadCustomers(): void {
    this.loading = true;
    this.apiService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // Search & filter
  filterCustomers(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.customers];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.mobile && c.mobile.includes(term))
      );
    }

    // Sort
    if (this.sortField) {
      result.sort((a, b) => {
        const aVal = (a as any)[this.sortField];
        const bVal = (b as any)[this.sortField];
        let cmp = 0;
        if (typeof aVal === 'string') {
          cmp = aVal.localeCompare(bVal);
        } else {
          cmp = aVal - bVal;
        }
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredCustomers = result;
    this.displayedCount = this.pageSize;
    this.updatePagination();
  }

  updatePagination(): void {
    this.paginatedCustomers = this.filteredCustomers.slice(0, this.displayedCount);
  }

  get hasMore(): boolean {
    return this.displayedCount < this.filteredCustomers.length;
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;
    this.isLoadingMore = true;
    setTimeout(() => {
      this.displayedCount = Math.min(this.displayedCount + this.pageSize, this.filteredCustomers.length);
      this.updatePagination();
      this.isLoadingMore = false;
    }, 180);
  }

  onTableScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el) return;
    // When within 90px of bottom, auto-load next batch
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 90) {
      this.loadMore();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollPos = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 150;
    if (scrollPos >= threshold) {
      this.loadMore();
    }
  }

  onPageSizeChange(): void {
    this.displayedCount = this.pageSize;
    this.updatePagination();
  }

  trackById(_index: number, item: Customer): any {
    return item.id;
  }

  sort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  navigateToDetail(customer: Customer): void {
    this.router.navigate(['/customers', customer.id]);
  }

  openDialog(customer: Customer | null = null): void {
    this.editingCustomer = customer;
    this.customerData = customer
      ? { name: customer.name, mobile: customer.mobile || '', description: customer.description || '' }
      : { name: '', mobile: '', description: '' };
    this.error = '';
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editingCustomer = null;
    this.customerData = { name: '', mobile: '', description: '' };
    this.error = '';
  }

  onCustomerSaved(savedCustomer?: Customer): void {
    this.loadCustomers();
    this.closeDialog();
  }

  saveCustomer(): void {
    if (!this.customerData.name || !this.customerData.mobile) {
      this.error = 'All fields are required';
      return;
    }

    const isEdit = !!this.editingCustomer;
    const request = isEdit
      ? this.apiService.updateCustomer(this.editingCustomer!.id, this.customerData)
      : this.apiService.createCustomer(this.customerData);

    request.subscribe({
      next: () => {
        this.loadCustomers();
        this.closeDialog();
        this.toastService.success(
          isEdit ? 'Customer updated' : 'Customer added',
          isEdit ? `${this.customerData.name} has been updated` : `${this.customerData.name} has been added`
        );
      },
      error: () => {
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
    const name = this.deletingCustomer.name;
    const customerId = this.deletingCustomer.id;

    // Immediately close delete dialog
    this.closeDeleteDialog();

    this.apiService.deleteCustomer(customerId).subscribe({
      next: () => {
        this.toastService.success('Customer deleted', `${name} has been removed`);
        // Immediately call get customers API
        this.loadCustomers();
      },
      error: (err) => {
        console.error('Delete Customer Error', err);
        this.toastService.error('Delete failed', `Could not delete ${name}`);
        // Immediately call get customers API to sync UI state
        this.loadCustomers();
      }
    });
  }

  openTransactionDialog(customer: Customer): void {
    this.transactionCustomer = customer;
    this.transactionData = {
      customerId: customer.id,
      type: 'DEBIT',
      amount: 0,
      description: ''
    };
    this.transactionError = '';
    this.showTransactionDialog = true;
  }

  closeTransactionDialog(): void {
    this.showTransactionDialog = false;
    this.transactionCustomer = null;
    this.transactionData = { customerId: '', type: 'DEBIT', amount: 0, description: '' };
    this.transactionError = '';
  }

  onTransactionSaved(): void {
    this.loadCustomers();
    this.closeTransactionDialog();
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
        this.toastService.success('Transaction added', `₹${this.transactionData.amount.toFixed(2)} ${this.transactionData.type.toLowerCase()} recorded`);
      },
      error: () => {
        this.transactionError = 'Failed to create transaction';
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
