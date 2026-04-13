import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  toasts$: Observable<Toast[]>;

  constructor(private toastService: ToastService) {
    this.toasts$ = this.toastService.toasts;
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12zM14 21.5l-5-5 1.4-1.4 3.6 3.6 7.6-7.6 1.4 1.4z';
      case 'error': return 'M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm5.4 18L20 21.4 16 17.4 12 21.4 10.6 20l4-4-4-4L12 10.6l4 4 4-4L21.4 12l-4 4z';
      case 'warning': return 'M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12zM15 8h2v11h-2zm1 14a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 16 22z';
      case 'info': return 'M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12zM17.5 24h-3V14h3zm0-12h-3V8h3z';
      default: return '';
    }
  }
}
