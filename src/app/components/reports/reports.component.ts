import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  customers: Customer[] = [];
  loading: boolean = true;
  downloading: boolean = false;
  user: any = null;
  showProfileDropdown: boolean = false;

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  closeProfileDropdown(): void {
    this.showProfileDropdown = false;
  }
  selectedCustomerId: string = '';
  dateRange: string = 'all';
  error: string = '';

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
        
        const customer = this.customers.find(c => c.id === this.selectedCustomerId);
        const fileName = `statement_${customer?.name.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.txt`;
        link.download = fileName;
        
        link.click();
        window.URL.revokeObjectURL(url);
        this.downloading = false;
      },
      error: () => {
        this.error = 'Failed to download report';
        this.downloading = false;
      }
    });
  }

  getSelectedCustomer(): Customer | undefined {
    return this.customers.find(c => c.id === this.selectedCustomerId);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
