import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Transaction, TransactionRequest } from '../../models/transaction.model';
import { Customer } from '../../models/customer.model';
import { LayoutComponent } from '../layout/layout.component';
import { ToastService } from '../../services/toast.service';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LayoutComponent, AddTransactionComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  customers: Customer[] = [];
  loading: boolean = true;
  private dataChangeSub?: Subscription;

  // Search & sort
  searchTerm: string = '';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filters
  selectedCustomerId: string = 'all';
  typeFilter: string = 'all';
  dateFrom: string = '';
  dateTo: string = '';

  // Vertical Scroll Pagination
  pageSize: number = 15;
  displayedCount: number = 15;
  isLoadingMore: boolean = false;

  showDialog: boolean = false;
  showDeleteDialog: boolean = false;
  editingTransaction: Transaction | null = null;
  deletingTransaction: Transaction | null = null;
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

    // Refresh immediately when transaction or customer is created/updated (e.g. via AI chat)
    this.dataChangeSub = this.apiService.onDataChange.subscribe(() => {
      this.loadData();
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

  loadData(): void {
    this.loading = true;
    this.apiService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.apiService.getTransactions(undefined, undefined, customers).subscribe({
          next: (transactions) => {
            this.transactions = transactions;
            this.applyFilters();
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
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
        this.applyFilters();
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

  onSearchChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.applyFilters();
  }

  applyDateFilter(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.transactions];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (this.typeFilter !== 'all') {
      result = result.filter(t => t.type === this.typeFilter);
    }

    // Date from
    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      result = result.filter(t => {
        if (!t.createdAt) return false;
        return new Date(t.createdAt) >= from;
      });
    }

    // Date to
    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        if (!t.createdAt) return false;
        return new Date(t.createdAt) <= to;
      });
    }

    // Sort
    if (this.sortField) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        if (this.sortField === 'createdAt') {
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        } else {
          aVal = (a as any)[this.sortField];
          bVal = (b as any)[this.sortField];
        }
        let cmp = 0;
        if (typeof aVal === 'string') {
          cmp = aVal.localeCompare(bVal);
        } else {
          cmp = (aVal || 0) - (bVal || 0);
        }
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredTransactions = result;
    this.displayedCount = this.pageSize;
    this.updatePagination();
  }

  updatePagination(): void {
    this.paginatedTransactions = this.filteredTransactions.slice(0, this.displayedCount);
  }

  get hasMore(): boolean {
    return this.displayedCount < this.filteredTransactions.length;
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;
    this.isLoadingMore = true;
    setTimeout(() => {
      this.displayedCount = Math.min(this.displayedCount + this.pageSize, this.filteredTransactions.length);
      this.updatePagination();
      this.isLoadingMore = false;
    }, 180);
  }

  onTableScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el) return;
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

  trackById(_index: number, item: Transaction): any {
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

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
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

  onTransactionSaved(): void {
    this.loadData();
    this.closeDialog();
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
    if (!this.deletingTransaction?.id) {
      return;
    }

    const txnId = this.deletingTransaction.id;
    // Close popup immediately
    this.showDeleteDialog = false;
    this.deletingTransaction = null;

    this.apiService.deleteTransaction(txnId).subscribe({
      next: () => {
        this.toastService.success(
          'Transaction deleted',
          'Transaction deleted successfully'
        );

        // Immediately call get all transaction API
        this.apiService.getTransactions().subscribe({
          next: (transactions) => {
            this.transactions = transactions;
            this.applyFilters();
          },
          error: (err) => {
            console.error('Transaction API Error', err);
          }
        });

        // Also refresh customers in parallel (balance updated)
        this.apiService.getCustomers().subscribe({
          next: (customers) => {
            this.customers = customers;
          },
          error: (err) => {
            console.error('Customer API Error', err);
          }
        });
      },
      error: (err) => {
        console.error('Delete Error', err);
        this.toastService.error(
          'Delete failed',
          'Could not delete transaction'
        );

        // Immediately call get all transaction API to maintain sync
        this.apiService.getTransactions().subscribe({
          next: (transactions) => {
            this.transactions = transactions;
            this.applyFilters();
          }
        });
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
