import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer, CustomerRequest } from '../models/customer.model';
import {
  Transaction,
  TransactionRequest,
  DashboardStats,
} from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  // Customer APIs
  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/customers`, {
      headers: this.getHeaders(),
    });
  }

  getCustomer(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/customers/${id}`, {
      headers: this.getHeaders(),
    });
  }

  createCustomer(data: CustomerRequest): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiUrl}/customers`, data, {
      headers: this.getHeaders(),
    });
  }

  updateCustomer(id: string, data: CustomerRequest): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/customers/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/customers/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // Transaction APIs
  getTransactions(customerId?: string): Observable<Transaction[]> {
    const url = customerId
      ? `${this.apiUrl}/transactions?customerId=${customerId}`
      : `${this.apiUrl}/transactions`;
    return this.http.get<Transaction[]>(url, { headers: this.getHeaders() });
  }
  getRecentTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(
      `${this.apiUrl}/dashboard/recent-transactions`,
      { headers: this.getHeaders() },
    );
  }
  getMonthlyReport(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(
      `${this.apiUrl}/dashboard/monthly-report`,
      { headers: this.getHeaders() },
    );
  }
  createTransaction(data: TransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data, {
      headers: this.getHeaders(),
    });
  }
  getTodaySummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/today-summary`, {
      headers: this.getHeaders(),
    });
  }
  // Dashboard APIs
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`, {
      headers: this.getHeaders(),
    });
  }

  getDashboardSummary(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/summary`, {
      headers: this.getHeaders(),
    });
  }

  getTopDebtors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/top-debtors`, {
      headers: this.getHeaders(),
    });
  }

  // Report APIs
  downloadReport(
    customerId: string,
    startDate?: string,
    endDate?: string,
  ): Observable<Blob> {
    let url = `${this.apiUrl}/reports/customer/${customerId}`;
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob',
    });
  }
}
