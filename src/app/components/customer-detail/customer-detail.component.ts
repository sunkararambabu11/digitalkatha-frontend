import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Customer } from '../../models/customer.model';
import { Transaction, TransactionRequest } from '../../models/transaction.model';
import { LayoutComponent } from '../layout/layout.component';
import { ToastService } from '../../services/toast.service';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LayoutComponent, AddTransactionComponent],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.css']
})
export class CustomerDetailComponent implements OnInit, OnDestroy {
  customer: Customer | null = null;
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  loading: boolean = true;
  customerId: number = 0;
  private dataChangeSub?: Subscription;

  // Search & sort
  searchTerm: string = '';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filters
  typeFilter: string = 'all';

  // Vertical Scroll Pagination
  pageSize: number = 15;
  displayedCount: number = 15;
  isLoadingMore: boolean = false;

  // Inline add transaction
  showAddTransaction: boolean = false;
  transactionData: TransactionRequest = {
    customerId: '',
    type: 'DEBIT',
    amount: 0,
    description: ''
  };
  transactionError: string = '';
  downloadingPdf: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.customerId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();

    // Refresh immediately when transactions or customer details change (e.g. via AI chat)
    this.dataChangeSub = this.apiService.onDataChange.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.dataChangeSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;

    // Load customer info by ID (instead of loading all customers)
    this.apiService.getCustomerById(this.customerId).subscribe({
      next: (customer) => {
        this.customer = customer;
        // Load transactions, passing customer name for display
        this.apiService.getTransactions(this.customerId, customer.name).subscribe({
          next: (txns) => {
            this.transactions = txns;
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
        this.router.navigate(['/customers']);
      }
    });
  }

  // Search, sort, filter, pagination
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

  applyFilters(): void {
    let result = [...this.transactions];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (this.typeFilter !== 'all') {
      result = result.filter(t => t.type === this.typeFilter);
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

  onTransactionSaved(): void {
    this.showAddTransaction = false;
    this.loadData();
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

  downloadLedgerPdf(): void {
    if (!this.customer) return;
    this.downloadingPdf = true;
    this.apiService.downloadReport(this.customerId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `${this.customer!.name.replace(/\s+/g, '_')}_ledger_${date}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloadingPdf = false;
        this.toastService.show('success', 'Ledger PDF downloaded');
      },
      error: () => {
        this.downloadingPdf = false;
        this.toastService.show('error', 'Failed to download PDF');
      }
    });
  }

  formatShortDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
