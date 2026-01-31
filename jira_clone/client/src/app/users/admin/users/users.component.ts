import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  joined: string;
  companyCode: string;
  status: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  showForm = false;
  isEditing = false;
  formUser: User = {
    name: '',
    email: '',
    password: '',
    role: 'Developer',
    joined: '',
    companyCode: '',
    status: 'active'
  };
  private currentCompanyCode = '';
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) {
        window.location.href = '/login';
        return;
      }
      const parsed = JSON.parse(storedUser);
      this.currentCompanyCode = parsed.companyCode;
      this.loadUsers();
    }
  }
 saveUser(): void {
  if (!this.formUser.name?.trim() || !this.formUser.email?.trim()) {
    alert('Name and email are required');
    return;
  }

  const passwordValue = this.formUser.password?.trim() ?? '';

  if (!this.isEditing) {
    if (!passwordValue || passwordValue.length < 8) {
      alert('Password is required and must be ≥ 8 characters for new users');
      return;
    }
  } else if (passwordValue && passwordValue.length < 8) {
    alert('New password must be at least 8 characters (or leave empty)');
    return;
  }

  const payload: any = {
    name: this.formUser.name.trim(),
    email: this.formUser.email.trim().toLowerCase(),
    role: this.formUser.role,
    companyCode: this.currentCompanyCode
  };

  if (this.isEditing && this.formUser.status) {
    payload.status = this.formUser.status;
  }

  if (passwordValue) {
    payload.password = passwordValue; // ← plain text – backend will hash it
  }

  const request = this.isEditing
    ? this.http.patch(`http://localhost:5000/api/users/${this.formUser._id}`, payload)
    : this.http.post('http://localhost:5000/api/users', payload);

  request.subscribe({
    next: () => {
      this.closeForm();
      this.loadUsers();
    },
    error: (err) => {
      console.error('Save error:', err);
      alert(err.error?.message || 'Operation failed');
    }
  });
}

// Make sure joined shows correctly
loadUsers(): void {
  this.http.get<any>(`http://localhost:5000/api/users?companyCode=${this.currentCompanyCode}`)
    .subscribe({
      next: (res) => {
        this.users = res.users.map((u: any) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          joined: u.joined || '-',   // backend already sends proper joined date
          companyCode: u.companyCode,
          status: u.status
        }));
      },
      error: (err) => console.error('Load users failed:', err)
    });
}
  openCreateForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.formUser = {
      name: '',
      email: '',
      password: '',
      role: 'Developer',
      joined: '',
      companyCode: this.currentCompanyCode,
      status: 'active'
    };
  }
  openEditForm(user: User): void {
    this.showForm = true;
    this.isEditing = true;
    this.formUser = { ...user, password: '' };
  }
  closeForm(): void {
    this.showForm = false;
  }

  deleteUser(id?: string): void {
    if (!id) return;
    if (!confirm('Delete this user?')) return;
    this.http
      .delete(`http://localhost:5000/api/users/${id}`)
      .subscribe({
        next: () => this.loadUsers(),
        error: (err) => {
          console.error('Delete error:', err);
          alert('Failed to delete user');
        }
      });
  }
}