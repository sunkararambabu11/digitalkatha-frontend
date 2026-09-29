import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DashboardSummary } from '../../models/transaction.model';
import { LayoutComponent } from '../layout/layout.component';
import { AddCustomerComponent } from '../add-customer/add-customer.component';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent, AddCustomerComponent, AddTransactionComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  summary: DashboardSummary | null = null;
  loading: boolean = true;
  downloading: boolean = false;
  showAddCustomerDrawer: boolean = false;
  showAddTransactionDrawer: boolean = false;
  monthlyEntries: { month: string; amount: number }[] = [];
  maxMonthlyAmount: number = 0;
  private dataChangeSub?: Subscription;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();

    // Refresh immediately when customer or transaction is added/updated (e.g. via AI chat)
    this.dataChangeSub = this.apiService.onDataChange.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.dataChangeSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.apiService.getDashboardFullSummary().subscribe({
      next: (data) => {
        this.summary = data;
        // Process monthly data for chart
        if (data && data.monthlyData) {
          this.monthlyEntries = Object.entries(data.monthlyData).map(([month, amount]) => ({
            month: month.charAt(0) + month.slice(1).toLowerCase(),
            amount
          }));
          this.maxMonthlyAmount = Math.max(...this.monthlyEntries.map(e => e.amount), 1);
        } else {
          this.monthlyEntries = [];
          this.maxMonthlyAmount = 1;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goAddCustomer(): void {
    this.showAddCustomerDrawer = true;
  }

  closeAddCustomer(): void {
    this.showAddCustomerDrawer = false;
  }

  onCustomerAdded(customer: Customer): void {
    this.closeAddCustomer();
    this.loadData();
  }

  goAddTransaction(): void {
    this.showAddTransactionDrawer = true;
  }

  closeAddTransaction(): void {
    this.showAddTransactionDrawer = false;
  }

  onTransactionAdded(res: any): void {
    this.closeAddTransaction();
    this.toastService.show('success', 'Transaction added successfully');
    this.loadData();
  }

  downloadDashboard(): void {
    this.downloading = true;
    this.apiService.downloadCustomersPdf().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `dashboard_summary_${date}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloading = false;
        this.toastService.show('success', 'Dashboard PDF downloaded');
      },
      error: () => {
        this.downloading = false;
        this.toastService.show('error', 'Failed to download PDF');
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
