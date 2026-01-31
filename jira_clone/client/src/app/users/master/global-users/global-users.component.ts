import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface User {
  id?: string;
  name: string;
  email: string;
  organization?: string;
  companyCode: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'invited';
  lastActive: string;
}

interface Organization {
  id: string;
  code: string;
  name: string;
  domain: string;
  plan: string;
  status: string;
  created: string;
}

interface UserListResponse {
  success: boolean;
  users: any[];
  message?: string;
}

interface OrgListResponse {
  success: boolean;
  organizations: any[];
  message?: string;
}

interface UserSingleResponse {
  success: boolean;
  user: any;
  message?: string;
}

@Component({
  selector: 'app-global-users',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './global-users.component.html',
  styleUrls: ['./global-users.component.css']
})
export class GlobalUsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  organizations: Organization[] = [];

  isLoading = true;
  errorMessage: string | null = null;

  searchTerm = '';
  selectedStatus = 'All';

  showModal = false;
  isEditMode = false;
  formSubmitted = false;

  currentUser: User = this.getEmptyUser();

  constructor(private http: HttpClient) {}

  private getEmptyUser(): User {
    return {
      name: '',
      email: '',
      companyCode: '',
      organization: '',
      role: 'Developer',
      status: 'invited',
      lastActive: '-'
    };
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadUsers();
  }

  loadOrganizations(): void {
    this.http.get<OrgListResponse>('http://localhost:5000/api/organizations').subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.organizations)) {
          this.organizations = response.organizations.map((o: any) => ({
            id: o.id,
            code: o.code,
            name: o.name,
            domain: o.domain,
            plan: o.plan,
            status: o.status,
            created: o.created
          }));
        }
      },
      error: () => {
        console.error('Failed to load organizations');
      }
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.get<UserListResponse>('http://localhost:5000/api/users').subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.users)) {
          this.users = response.users.map((u: any) => ({
            id: u.id,
            name: u.name || '',
            email: u.email || '',
            companyCode: u.companyCode || '',
            organization: u.organization || '',
            role: u.role || 'Developer',
            status: u.status || 'invited',
            lastActive: u.lastActive || '-'
          }));
          this.filteredUsers = [...this.users];
          this.filterUsers();
        } else {
          this.errorMessage = 'Invalid response format from server';
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load users. Server may be down.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  getOrgName(code: string): string {
    const org = this.organizations.find(
      o => o.code.toUpperCase() === code.toUpperCase()
    );
    return org ? org.name : '';
  }

  filterUsers(): void {
    let filtered = this.users;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.companyCode.toLowerCase().includes(term) ||
        (u.organization?.toLowerCase().includes(term) ?? false)
      );
    }

    if (this.selectedStatus !== 'All') {
      filtered = filtered.filter(u => u.status === this.selectedStatus);
    }

    this.filteredUsers = filtered;
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.formSubmitted = false;
    this.currentUser = this.getEmptyUser();
    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.formSubmitted = false;
    this.currentUser = { ...user };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formSubmitted = false;
  }

  onOrgChange(): void {
    if (!this.currentUser.organization?.trim()) {
      const org = this.organizations.find(
        o => o.code === this.currentUser.companyCode
      );
      if (org) {
        this.currentUser.organization = org.name;
      }
    }
  }

  saveUser(): void {
    this.formSubmitted = true;

    if (
      !this.currentUser.name.trim() ||
      !this.currentUser.email.trim() ||
      !this.currentUser.companyCode.trim()
    ) {
      return;
    }

    const payload = {
      name: this.currentUser.name.trim(),
      email: this.currentUser.email.trim().toLowerCase(),
      companyCode: this.currentUser.companyCode.trim().toUpperCase(),
      organization: this.currentUser.organization?.trim() || null,
      role: this.currentUser.role,
      status: this.currentUser.status
    };

    const request = this.isEditMode
      ? this.http.patch<UserSingleResponse>(
          `http://localhost:5000/api/users/${this.currentUser.id}`,
          payload
        )
      : this.http.post<UserSingleResponse>(
          'http://localhost:5000/api/users',
          payload
        );

    request.subscribe({
      next: (response) => {
        if (response.success && response.user) {
          const updatedUser = response.user;

          if (this.isEditMode) {
            const index = this.users.findIndex(u => u.id === updatedUser.id);
            if (index !== -1) {
              this.users[index] = {
                ...this.users[index],
                ...updatedUser,
                lastActive: updatedUser.lastActive || this.users[index].lastActive
              };
            }
          } else {
            this.users.unshift({
              id: updatedUser.id,
              name: updatedUser.name || '',
              email: updatedUser.email || '',
              companyCode: updatedUser.companyCode || '',
              organization: updatedUser.organization || '',
              role: updatedUser.role || 'Developer',
              status: updatedUser.status || 'invited',
              lastActive: updatedUser.lastActive || '-'
            });
          }

          this.filterUsers();
          alert(
            this.isEditMode
              ? 'User updated successfully!'
              : 'User created successfully!\nDefault password: ChangeMe123!'
          );
          this.closeModal();
        } else {
          alert('Operation failed: Invalid response from server');
        }
      },
      error: (err) => {
        const msg = err.error?.message || 'Server error occurred';
        alert(`Operation failed: ${msg}`);
      }
    });
  }

  changeStatus(user: User, newStatus: 'suspended'): void {
    if (!user.id || user.status === newStatus) return;

    if (!confirm(`Really change status of ${user.name} to ${newStatus}?`)) return;

    this.http
      .patch<UserSingleResponse>(
        `http://localhost:5000/api/users/${user.id}`,
        { status: newStatus }
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.user) {
            const index = this.users.findIndex(u => u.id === user.id);
            if (index !== -1) {
              this.users[index].status = response.user.status;
              this.filterUsers();
              alert(`Status changed to ${newStatus}`);
            }
          }
        },
        error: (err) => {
          const msg = err.error?.message || 'Server error';
          alert(`Failed to update status: ${msg}`);
        }
      });
  }

  viewProfile(user: User): void {
    alert(
      `User Profile\n\n` +
      `Name: ${user.name}\n` +
      `Email: ${user.email}\n` +
      `Company Code: ${user.companyCode}\n` +
      `Organization: ${user.organization || this.getOrgName(user.companyCode) || '-'}\n` +
      `Role: ${user.role}\n` +
      `Status: ${user.status}\n` +
      `Last Active: ${user.lastActive}`
    );
  }
}
