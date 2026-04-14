import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DashboardSummary } from '../../models/transaction.model';
import { LayoutComponent } from '../layout/layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  summary: DashboardSummary | null = null;
  loading: boolean = true;
  downloading: boolean = false;
  monthlyEntries: { month: string; amount: number }[] = [];
  maxMonthlyAmount: number = 0;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.apiService.getDashboardFullSummary().subscribe({
      next: (data) => {
        this.summary = data;
        // Process monthly data for chart
        if (data.monthlyData) {
          this.monthlyEntries = Object.entries(data.monthlyData).map(([month, amount]) => ({
            month: month.charAt(0) + month.slice(1).toLowerCase(),
            amount
          }));
          this.maxMonthlyAmount = Math.max(...this.monthlyEntries.map(e => e.amount), 1);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goAddCustomer(): void {
    this.router.navigate(['/customers'], { queryParams: { action: 'add' } });
  }

  goAddTransaction(): void {
    this.router.navigate(['/transactions'], { queryParams: { action: 'add' } });
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
