import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private counter = 0;

  get toasts() {
    return this.toasts$.asObservable();
  }

  show(type: Toast['type'], title: string, message?: string, duration: number = 4000): void {
    const id = ++this.counter;
    const toast: Toast = { id, type, title, message, duration };
    this.toasts$.next([...this.toasts$.value, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message, 6000);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message, 5000);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  dismiss(id: number): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }
}
