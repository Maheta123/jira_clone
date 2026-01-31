// src/app/users/admin/issue-types/issue-types.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

interface IssueType {
  _id?: string;
  name: string;
  description: string;
  icon: string;
  type: 'standard' | 'subtask';
  organizationCode?: string;
  isGlobal?: boolean;
}

@Component({
  selector: 'app-issue-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-types.component.html',
  styleUrls: ['./issue-types.component.css']
})
export class IssueTypesComponent implements OnInit {
  issueTypes: IssueType[] = [];
  isLoading = true;

  showForm = false;
  isEditing = false;

  formIssueType: IssueType = {
    name: '',
    description: '',
    icon: '⭐',
    type: 'standard'
  };

  private currentCompanyCode: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserAndIssueTypes();
  }

  private loadCurrentUserAndIssueTypes(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.currentCompanyCode = user.companyCode || '';
      }
      this.loadIssueTypes();
    }
  }

  loadIssueTypes(): void {
    this.isLoading = true;
    this.http.get<any>(`http://localhost:5000/api/issue-types?companyCode=${this.currentCompanyCode}`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.issueTypes = res.issueTypes;
          }
          this.isLoading = false;
        },
        error: () => {
          alert('Failed to load issue types');
          this.isLoading = false;
        }
      });
  }

  openCreateForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.formIssueType = {
      name: '',
      description: '',
      icon: '⭐',
      type: 'standard',
      organizationCode: this.currentCompanyCode,
      isGlobal: false
    };
  }

  openEditForm(it: IssueType): void {
    this.showForm = true;
    this.isEditing = true;
    this.formIssueType = { ...it };
  }

  closeForm(): void {
    this.showForm = false;
  }

  saveIssueType(): void {
    if (!this.formIssueType.name.trim()) {
      alert('Name is required');
      return;
    }

    const payload = {
      name: this.formIssueType.name.trim(),
      description: this.formIssueType.description || '',
      icon: this.formIssueType.icon || '⭐',
      type: this.formIssueType.type,
      organizationCode: this.currentCompanyCode,
      isGlobal: false  // Master Admin can set true later
    };

    const request = this.isEditing && this.formIssueType._id
      ? this.http.patch(`http://localhost:5000/api/issue-types/${this.formIssueType._id}`, payload)
      : this.http.post('http://localhost:5000/api/issue-types', payload);

    request.subscribe({
      next: () => {
        this.loadIssueTypes();
        this.closeForm();
        alert(this.isEditing ? 'Issue type updated!' : 'Issue type created!');
      },
      error: (err) => {
        alert(err.error?.message || 'Save failed');
      }
    });
  }
  selectIcon(emoji: string): void {
  this.formIssueType.icon = emoji;
}

  deleteIssueType(id: string): void {
    if (!confirm('Delete this issue type?')) return;

    this.http.delete(`http://localhost:5000/api/issue-types/${id}`).subscribe({
      next: () => this.loadIssueTypes(),
      error: () => alert('Delete failed')
    });
  }
}