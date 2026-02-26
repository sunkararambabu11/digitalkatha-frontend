import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../../core/services/customer.service';
import { LedgerService } from '../../../core/services/ledger.service';

@Component({
  selector: 'app-customer-view',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, MatCardModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './customer-view.component.html',
  styleUrl: './customer-view.component.scss'
})
export class CustomerViewComponent {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private ledgerService = inject(LedgerService);

  customerId = this.route.snapshot.params['id'];
  customer = this.customerService.getCustomerById(this.customerId);
  recentEntries = computed(() => this.ledgerService.getEntriesByCustomer(this.customerId)().slice(0, 5));
}
