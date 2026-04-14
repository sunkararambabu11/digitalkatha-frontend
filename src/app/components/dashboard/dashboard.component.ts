import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DashboardStats } from '../../models/transaction.model';
import { LayoutComponent } from '../layout/layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading: boolean = true;
  downloading: boolean = false;
  recentTransactions: any[] = [];
  topDebtors: any[] = [];

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.apiService.getDashboardSummary().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.apiService.getRecentTransactions().subscribe({
      next: (data) => this.recentTransactions = data,
      error: () => {}
    });

    this.apiService.getTopDebtors().subscribe({
      next: (data) => this.topDebtors = data,
      error: () => {}
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
}
