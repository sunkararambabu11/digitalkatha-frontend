import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, catchError, map, forkJoin, switchMap, Subject } from 'rxjs';
import { Customer, CustomerRequest } from '../models/customer.model';
import {
  Transaction,
  TransactionRequest,
  DashboardSummary,
} from '../models/transaction.model';

export interface DataChangeEvent {
  type: 'customer' | 'transaction' | 'all';
  action?: 'create' | 'update' | 'delete';
  customerId?: number | string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8081/api';
  private dataChange$ = new Subject<DataChangeEvent>();

  get onDataChange(): Observable<DataChangeEvent> {
    return this.dataChange$.asObservable();
  }

  notifyDataChange(event: DataChangeEvent): void {
    this.dataChange$.next(event);
  }

  constructor(private http: HttpClient) { }


  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // ============================================================
  // Customer APIs
  // Backend: GET/POST /api/customers, GET/PUT/DELETE /api/customers/{id}
  // ============================================================
  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/customers`, {
      headers: this.getHeaders(),
    }).pipe(catchError(() => of([])));
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/customers/${id}`, {
      headers: this.getHeaders(),
    });
  }

  createCustomer(data: CustomerRequest): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiUrl}/customers`, data, {
      headers: this.getHeaders(),
    });
  }

  updateCustomer(id: number, data: CustomerRequest): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/customers/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/customers/${id}`, {
      headers: this.getHeaders(),
      responseType: 'text' as 'json',
    });
  }

  // ============================================================
  // Transaction APIs
  // Backend: POST /api/transactions (create)
  // Backend: GET  /api/transactions/customer/{customerId} (per-customer ledger)
  // Backend: PUT  /api/transactions/{id} (update)
  // Backend: DELETE /api/transactions/{id} (delete)
  // Backend has NO "get all transactions" endpoint.
  // ============================================================
  getTransactions(customerId?: number | string, customerName?: string, preloadedCustomers?: Customer[]): Observable<Transaction[]> {
    if (customerId) {
      // Single customer ledger — attach customerName if provided
      return this.http.get<Transaction[]>(
        `${this.apiUrl}/transactions/customer/${customerId}`,
        { headers: this.getHeaders() }
      ).pipe(
        map(txns => customerName
          ? txns.map(t => ({ ...t, customerName }))
          : txns
        ),
        catchError(() => of([]))
      );
    }

    // "All transactions" — fetch each customer's ledger and merge.
    const customers$ = preloadedCustomers ? of(preloadedCustomers) : this.getCustomers();
    return customers$.pipe(
      switchMap(customers => {
        if (customers.length === 0) return of([] as Transaction[]);
        const requests = customers.map(c =>
          this.http.get<Transaction[]>(
            `${this.apiUrl}/transactions/customer/${c.id}`,
            { headers: this.getHeaders() }
          ).pipe(
            // Attach customerName since backend Transaction entity lacks it
            map(txns => txns.map(t => ({ ...t, customerName: c.name }))),
            catchError(() => of([] as Transaction[]))
          )
        );
        return forkJoin(requests).pipe(
          map(arrays => {
            const merged = arrays.flat();
            merged.sort((a, b) => {
              const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return db - da;
            });
            return merged;
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  createTransaction(data: TransactionRequest): Observable<any> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data, {
      headers: this.getHeaders(),
    });
  }

  updateTransaction(id: number, data: TransactionRequest): Observable<any> {
    return this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteTransaction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transactions/${id}`, {
      headers: this.getHeaders(),
      responseType: 'text' as 'json',
    });
  }

  // ============================================================
  // Dashboard APIs
  // Backend: GET /api/dashboard/summary (full combined summary)
  // Backend: GET /api/dashboard (basic stats)
  // ============================================================
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`, {
      headers: this.getHeaders(),
    });
  }

  getDashboardFullSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/summary`, {
      headers: this.getHeaders(),
    }).pipe(
      catchError((err) => {
        console.error('Error fetching dashboard summary:', err);
        return of({
          totalCustomers: 0, activeCustomers: 0,
          totalDebit: 0, totalCredit: 0, totalOutstanding: 0,
          todayTransactionCount: 0, todayDebit: 0, todayCredit: 0,
          topDebtors: [], recentTransactions: [], monthlyData: {}
        });
      })
    );
  }

  // ============================================================
  // Report / PDF APIs
  // Backend: GET  /api/pdf/customers  -> all customers PDF
  // Backend: POST /api/pdf/transactions -> {customerId, fromDate, toDate} -> PDF blob
  // ============================================================
  downloadCustomersPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pdf/customers`, {
      headers: this.getHeaders(),
      responseType: 'blob',
    });
  }

  downloadReport(
    customerId: number | string,
    startDate?: string,
    endDate?: string,
  ): Observable<Blob> {
    const body: any = {
      customerId: Number(customerId),
      fromDate: startDate || '2000-01-01',
      toDate: endDate || new Date().toISOString().split('T')[0],
    };
    return this.http.post(`${this.apiUrl}/pdf/transactions`, body, {
      headers: this.getHeaders(),
      responseType: 'blob',
    });
  }
}
