import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SignupRequest } from '../../models/user.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent {
  signupData: SignupRequest = {
    shopName: '',
    ownerName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
  error: string = '';
  loading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    this.error = '';

    // Validation
    if (
      !this.signupData.shopName ||
      !this.signupData.ownerName ||
      !this.signupData.mobile ||
      !this.signupData.email ||
      !this.signupData.password ||
      !this.signupData.confirmPassword
    ) {
      this.error = 'All fields are required';
      return;
    }

    if (this.signupData.password !== this.signupData.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.signupData.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;
    this.authService.signup(this.signupData).subscribe({
      next: () => {
        // Redirect to login with email pre-filled via query params
        this.toastService.success(
          'Account created',
          'Please log in with your credentials'
        );
        this.router.navigate(['/login'], {
          queryParams: { email: this.signupData.email }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Signup failed. Please try again.';
      },
    });
  }
}
