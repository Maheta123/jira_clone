// login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    companyCode: '',
    password: ''
  };

  errorMessage = '';
  isLoading = false;

  private apiUrl = 'http://localhost:5000/api/auth';

  constructor(private router: Router, private http: HttpClient) {}

  onSubmit(form: NgForm) {
    if (!form.valid) {
      this.errorMessage = 'Please fill all required fields correctly';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const payload = {
      email: this.credentials.email.trim().toLowerCase(),
      companyCode: this.credentials.companyCode.trim().toUpperCase(),
      password: this.credentials.password
    };

    this.http.post<any>(`${this.apiUrl}/login`, payload).subscribe({
      next: (response) => {
        // Store token + user
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));

        // Optional: store role/company for quick access
        localStorage.setItem('userRole', response.user.role);

        const role = response.user.role || 'Developer';
        const roleRoutes: Record<string, string> = {
          'MasterAdmin': '/master/dashboard',
          'Admin': '/admin/dashboard',
          'ProjectManager': '/project-manager/dashboard',
          'Developer': '/dev/dashboard',
          'QATester': '/qa/dashboard'
        };

        const redirectTo = roleRoutes[role] || '/home';
        this.isLoading = false;
        this.router.navigate([redirectTo]);
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        this.isLoading = false;
      }
    });
  }
}