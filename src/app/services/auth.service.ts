import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  User,
  LoginRequest,
  SignupRequest,
  LoginResponse,
  SignupResponse,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8081/api/auth';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('user');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      savedUser ? JSON.parse(savedUser) : null,
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  signup(data: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => {
  
        const user: User = {
          id: response.id,
          shopName: response.shopName,
          ownerName: response.ownerName,
          mobile: response.mobile,
          email: response.email,
          createdAt: '',
        };
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
    );
  }


  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        // Login API returns: { userId, shopName, token, message }
        localStorage.setItem('token', response.token);
        const user: User = {
          id: response.userId,
          shopName: response.shopName,
          ownerName: '',
          mobile: '',
          email: '',
          createdAt: '',
        };
       
        this.currentUserSubject.next(user);
      }),
    );
  }

 

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  private getHeaders(): HttpHeaders {
  const token = localStorage.getItem('token');

  return new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });
}

getProfile(): Observable<User> {
  return this.http.get<User>(`${this.apiUrl}/profile`, {
    headers: this.getHeaders(),
  }).pipe(
    tap((user) => {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
    })
  );
}

}
