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
  filteredTransactions: Transaction[] = [];
  paginatedTransactions: Transaction[] = [];
  loading: boolean = true;
  customerId: number = 0;

  // Search & sort
  searchTerm: string = '';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filters
  typeFilter: string = 'all';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

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
  math = Math;

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
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.currentPage = 1;
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
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagination();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedTransactions = this.filteredTransactions.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
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
