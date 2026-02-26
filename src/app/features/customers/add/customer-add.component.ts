import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../../core/services/customer.service';

@Component({
  selector: 'app-customer-add',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink
  ],
  templateUrl: './customer-add.component.html',
  styleUrl: './customer-add.component.scss'
})
export class CustomerAddComponent {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private router = inject(Router);

  customerForm = this.fb.group({
    name: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    address: ['', Validators.required],
    openingBalance: [0, Validators.required],
    description: ['']
  });

  onSubmit() {
    if (this.customerForm.valid) {
      const formValue = this.customerForm.value;
      this.customerService.addCustomer({
        name: formValue.name!,
        mobile: formValue.mobile!,
        address: formValue.address!,
        openingBalance: formValue.openingBalance!,
        description: formValue.description || ''
      });
      this.router.navigate(['/customers']);
    }
  }
}
