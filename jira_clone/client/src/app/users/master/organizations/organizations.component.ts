import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Organization {
  id?: string;
  code?: string;
  name: string;
  domain: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  status: 'active' | 'trial' | 'suspended';
  created: string;
  users?: number;
  projects?: number;
}

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.css']
})
export class OrganizationsComponent implements OnInit {
  organizations: Organization[] = [];
  filteredOrganizations: Organization[] = [];

  searchTerm = '';
  selectedStatus = 'All';

  showModal = false;
  isEditMode = false;
  formSubmitted = false;

  currentOrg: Organization = this.getEmptyOrg();

  constructor(private http: HttpClient) {}

  private getEmptyOrg(): Organization {
    return {
      name: '',
      code: '',
      domain: '',
      plan: 'Starter',
      status: 'trial',
      created: ''
    };
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.http.get<any>('http://localhost:5000/api/organizations').subscribe(res => {
      if (res.success) {
        this.organizations = res.organizations;
        this.filterOrganizations();
      }
    });
  }

  filterOrganizations(): void {
    let filtered = this.organizations;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(term) ||
        o.domain.toLowerCase().includes(term) ||
        (o.code && o.code.toLowerCase().includes(term))
      );
    }

    if (this.selectedStatus !== 'All') {
      filtered = filtered.filter(o => o.status === this.selectedStatus);
    }

    this.filteredOrganizations = filtered;
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.formSubmitted = false;
    this.currentOrg = this.getEmptyOrg();
    this.showModal = true;
  }

  openEditModal(org: Organization): void {
    this.isEditMode = true;
    this.formSubmitted = false;
    this.currentOrg = { ...org };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveOrganization(): void {
    this.formSubmitted = true;

    if (!this.currentOrg.name.trim() || !this.currentOrg.domain.trim()) return;

    const payload = {
      name: this.currentOrg.name.trim(),
      code: this.currentOrg.code?.trim() || '',
      domain: this.currentOrg.domain.trim().toLowerCase(),
      plan: this.currentOrg.plan,
      status: this.currentOrg.status
    };

    const request = this.isEditMode
      ? this.http.patch<any>(
          `http://localhost:5000/api/organizations/${this.currentOrg.id}`,
          payload
        )
      : this.http.post<any>('http://localhost:5000/api/organizations', payload);

    request.subscribe({
      next: res => {
        if (res.success) {
          this.loadOrganizations();
          alert(this.isEditMode ? 'Organization updated!' : 'Organization created!');
          this.closeModal();
        }
      },
      error: err => {
        alert(err.error?.message || 'Failed to save organization');
      }
    });
  }


  changeStatus(org: Organization, status: 'suspended'): void {
    if (!confirm(`Suspend ${org.name}?`)) return;

    this.http.patch<any>(
      `http://localhost:5000/api/organizations/${org.id}`,
      { status }
    ).subscribe(() => this.loadOrganizations());
  }

  viewOrganization(org: Organization): void {
    alert(
      `Name: ${org.name}\nCode: ${org.code || 'N/A'}\nDomain: ${org.domain}`
    );
  }
}
