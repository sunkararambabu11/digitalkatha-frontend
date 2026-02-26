import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly AUTH_TOKEN_KEY = 'shop_auth_token';
  private readonly USER_DATA_KEY = 'shop_user_data';

  // Base URL should be updated to actual API endpoint
  private apiUrl = 'https://api.example.com/auth'; 

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem(this.AUTH_TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(response.user));
        }
      })
    );
  }

  register(shopData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, shopData);
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  getUser(): any {
    const data = localStorage.getItem(this.USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }
}
