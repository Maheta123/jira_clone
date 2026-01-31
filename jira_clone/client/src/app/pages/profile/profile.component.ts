import { Component, OnInit, Inject, PLATFORM_ID , ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

interface UserProfile {
  _id?: string;              // ← made optional
  name: string;
  email?: string;            // ← optional
  role?: string;             // ← optional
  companyCode?: string;
  organizationName?: string;
  status?: string;
  createdAt?: string;
  lastLogin?: string;
  avatarUrl?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  encapsulation: ViewEncapsulation.None

})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isEditing = false;
  editForm: Partial<UserProfile> = { name: '' };


   isProfileView = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProfile();
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      this.errorMessage = 'Not logged in';
      this.isLoading = false;
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const userId = user._id;

      if (!userId) {
        this.errorMessage = 'User ID not found';
        this.isLoading = false;
        return;
      }

      this.http.get<any>(`http://localhost:5000/api/users/${userId}`).subscribe({
        next: (res) => {
          if (res.success && res.user) {
            this.profile = {
              _id: res.user._id ?? '',
              name: res.user.name ?? 'Unknown',
              email: res.user.email ?? 'N/A',
              role: res.user.role ?? 'Unknown',
              companyCode: res.user.companyCode,
              organizationName: res.user.organizationName || null,
              status: res.user.status ?? 'active',
              createdAt: res.user.createdAt 
                ? new Date(res.user.createdAt).toLocaleDateString() 
                : 'N/A',
              lastLogin: res.user.lastLogin 
                ? new Date(res.user.lastLogin).toLocaleString() 
                : 'Never',
              avatarUrl: res.user.avatarUrl || 'https://via.placeholder.com/150'
            };

            this.editForm = { name: this.profile.name };
          } else {
            this.errorMessage = res.message || 'Failed to load profile';
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load profile';
          this.isLoading = false;
        }
      });
    } catch (e) {
      this.errorMessage = 'Invalid user data';
      this.isLoading = false;
    }
  }

  startEditing(): void {
    this.isEditing = true;
    this.successMessage = null;
    this.editForm = { name: this.profile?.name || '' };
  }

  cancelEditing() {
    this.isEditing = false;
    this.editForm = { ...this.profile! };
  }

  saveProfile(): void {
    if (!this.profile?._id || !this.editForm.name?.trim()) {
      this.errorMessage = 'Name is required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const updateData = {
      name: this.editForm.name.trim()
    };

    this.http.patch<any>(`http://localhost:5000/api/users/${this.profile._id}`, updateData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // Update local profile safely
            if (this.profile) {
              this.profile = {
                ...this.profile,
                name: updateData.name
              };
            }
            this.isEditing = false;
            this.successMessage = 'Profile updated successfully!';
          } else {
            this.errorMessage = res.message || 'Update failed';
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update profile';
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}