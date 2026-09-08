import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Customer, CustomerRequest } from '../../models/customer.model';

@Component({
  selector: 'app-add-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-customer.component.html',
  styleUrls: ['./add-customer.component.css']
})
export class AddCustomerComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() customer: Customer | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Customer>();

  customerData: CustomerRequest = {
    name: '',
    mobile: '',
    openingBalance: 0,
    description: ''
  };

  loading: boolean = false;
  error: string = '';

  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customer'] || changes['isOpen']) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.error = '';
    if (this.customer) {
      this.customerData = {
        name: this.customer.name || '',
        mobile: this.customer.mobile || '',
        openingBalance: this.customer.openingBalance || 0,
        description: this.customer.description || ''
      };
    } else {
      this.customerData = {
        name: '',
        mobile: '',
        openingBalance: 0,
        description: ''
      };
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.loading) return;
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.customerData.name.trim() || !this.customerData.mobile.trim()) {
      this.error = 'Name and mobile number are required';
      return;
    }

    if (this.customerData.mobile.trim().length < 10) {
      this.error = 'Please enter a valid 10-digit mobile number';
      return;
    }

    this.loading = true;
    this.error = '';

    const isEdit = !!this.customer;
    const request$ = isEdit
      ? this.apiService.updateCustomer(this.customer!.id, this.customerData)
      : this.apiService.createCustomer(this.customerData);

    request$.subscribe({
      next: (result) => {
        this.loading = false;
        this.toastService.success(
          isEdit ? 'Customer updated' : 'Customer added',
          isEdit
            ? `${this.customerData.name} has been updated successfully`
            : `${this.customerData.name} has been added to your khata`
        );
        this.saved.emit(result);
        this.onClose();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to save customer. Please try again.';
      }
    });
  }
}
