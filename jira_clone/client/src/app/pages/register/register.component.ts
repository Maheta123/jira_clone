import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = {
    name: '',
    email: '',
    companyCode: '',
    password: ''
  };

  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private router: Router, private http: HttpClient) {}

  oncompanyCodeInput() {
    this.user.companyCode = this.user.companyCode.toUpperCase().trim();
  }

  register() {

    this.user.companyCode = this.user.companyCode.trim().toUpperCase();

  
    if (!this.user.name || !this.user.email || !this.user.companyCode || !this.user.password) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    if (this.user.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.user.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post('http://localhost:5000/api/auth/register', this.user).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.successMessage = 'Account created successfully! Redirecting to login...';
        this.isLoading = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        this.isLoading = false;
      }
    });
  }
}