import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Customer } from '../../models/customer.model';
import { LayoutComponent } from '../layout/layout.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LayoutComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
  loading: boolean = true;
  downloading: boolean = false;
  downloadingAll: boolean = false;
  selectedCustomerId: string = '';
  dateRange: string = 'all';
  error: string = '';
  private dataChangeSub?: Subscription;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();

    // Refresh immediately when customer or transaction changes (e.g. via AI chat)
    this.dataChangeSub = this.apiService.onDataChange.subscribe(() => {
      this.loadCustomers();
    });
  }

  ngOnDestroy(): void {
    this.dataChangeSub?.unsubscribe();
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

  downloadAllCustomersPdf(): void {
    this.downloadingAll = true;
    this.apiService.downloadCustomersPdf().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all_customers_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.downloadingAll = false;
        this.toastService.success('Download complete', 'All customers PDF downloaded');
      },
      error: () => {
        this.downloadingAll = false;
        this.toastService.error('Download failed', 'Could not download all customers PDF');
      }
    });
  }

  downloadReport(): void {
    if (!this.selectedCustomerId) {
      this.error = 'Please select a customer';
      return;
    }

    this.error = '';
    this.downloading = true;

    let startDate: string | undefined;
    let endDate: string | undefined;

    const now = new Date();
    if (this.dateRange === '3m') {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      startDate = threeMonthsAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (this.dateRange === '6m') {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      startDate = sixMonthsAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    this.apiService.downloadReport(this.selectedCustomerId, startDate, endDate).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const customer = this.customers.find(c => c.id === Number(this.selectedCustomerId));
        const fileName = `statement_${customer?.name.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.download = fileName;

        link.click();
        window.URL.revokeObjectURL(url);
        this.downloading = false;
        this.toastService.success('Statement downloaded', `${customer?.name}'s statement is ready`);
      },
      error: () => {
        this.error = 'Failed to download report';
        this.downloading = false;
      }
    });
  }

  getSelectedCustomer(): Customer | undefined {
    return this.customers.find(c => c.id === Number(this.selectedCustomerId));
  }
}
