import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginData: LoginRequest = { username: '', password: '' };
  error: string = '';
  loading: boolean = false;
  successMessage: string = '';
  showPassword: boolean = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    // Auto-fill email from signup redirect
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.loginData.username = params['email'];
        this.successMessage = 'Account created successfully. Please log in.';
      }
    });
  }

 onSubmit(): void {

  this.error = '';
  this.successMessage = '';

  if (!this.loginData.username || !this.loginData.password) {
    this.error = 'All fields are required';
    return;
  }

  this.loading = true;

  this.authService.login(this.loginData).subscribe({

    next: () => {

      this.authService.getProfile().subscribe({

        next: (user) => {

          console.log('Profile:', user);

          this.loading = false;

          this.router.navigate(['/dashboard']);

        },

        error: (err) => {

          this.loading = false;

          this.error = 'Unable to load profile';

          console.error(err);

        }

      });

    },

    error: (err) => {

      this.loading = false;

      this.error =
        err.error?.message || 'Login failed. Please check your credentials.';

    }

  });

}
}
