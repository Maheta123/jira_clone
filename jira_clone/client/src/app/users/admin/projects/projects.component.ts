import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

interface Project {
  _id?: string;
  name: string;
  status: string;
  issues: number;
  members: number;
  memberIds?: string[];
  memberNames?: string[];
  companyCode: string;
  managerId?: string;
  managerName?: string;
  joined?: string;
  createdBy?: string;
}

interface User {
  _id: string;
  name: string;
  role: string;
}

interface CurrentUser {
  companyCode: string;
  email: string;
  role: string;
  name?: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  users: User[] = [];
  managers: User[] = [];
  isLoading = true;
  errorMessage = '';

  showForm = false;
  isEditing = false;

  formProject: Project = {
    name: '',
    status: 'Active',
    issues: 0,
    members: 1,
    companyCode: '',
    managerId: ''
  };


  private currentCompanyCode = '';
  private currentUserEmail = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const user: CurrentUser = JSON.parse(storedUser);
      this.currentCompanyCode = user.companyCode?.trim().toUpperCase() || '';
      this.currentUserEmail = user.email || 'system';

      if (!this.currentCompanyCode) {
        this.router.navigate(['/login']);
        return;
      }

      this.formProject.companyCode = this.currentCompanyCode;
      this.loadUsers();
    } catch (e) {
      console.error('Invalid user data in localStorage', e);
      localStorage.removeItem('currentUser');
      this.router.navigate(['/login']);
    }
  }

  private loadUsers(): void {
    this.http.get<any>(`http://localhost:5000/api/users?companyCode=${this.currentCompanyCode}`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.users = res.users.map((u: any) => ({
              _id: u._id.toString(),
              name: u.name,
              role: u.role
            }));
            this.managers = this.users.filter(u => u.role === 'ProjectManager');
            this.loadProjects();
          } else {
            this.errorMessage = res.message || 'Failed to load users';
          }
        },
        error: () => {
          this.errorMessage = 'Failed to load users';
          this.isLoading = false;
        }
      });
  }

  loadProjects(): void {
    this.isLoading = true;
    this.http.get<any>(`http://localhost:5000/api/projects?companyCode=${this.currentCompanyCode}`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            const rawProjects = res.projects.map((p: any) => ({
              _id: p._id?.toString(),
              name: p.name,
              status: p.status,
              issues: p.issues,
              members: p.members?.length || p.members || 0,
              memberIds: (p.members || []).map((id: any) =>
                (typeof id === 'object' && id?._id ? id._id : id).toString()
              ),
              companyCode: p.companyCode,
              managerId: p.managerId?.toString(),
              managerName: p.managerName,
              joined: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '-',
              createdBy: p.createdBy
            }));

            this.projects = rawProjects.map((project: Project): Project => ({
              ...project,
              memberNames: (project.memberIds ?? []).map((id: string): string =>
                this.users.find(u => u._id === id)?.name || '—'
              )
            }));
          } else {
            this.errorMessage = res.message || 'Failed to load projects';
          }
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load projects';
          this.isLoading = false;
        }
      });
  }

  openCreateForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.formProject = {
      name: '',
      status: 'Active',
      issues: 0,
      members: 1,
      companyCode: this.currentCompanyCode,
      managerId: ''
    };
  }

  openEditForm(project: Project): void {
    this.showForm = true;
    this.isEditing = true;
    this.formProject = { ...project };
  }

  closeForm(): void {
    this.showForm = false;
  }

  saveProject(): void {
    if (!this.formProject.name.trim()) {
      alert('Project name is required');
      return;
    }

    const payload = {
      name: this.formProject.name.trim(),
      status: this.formProject.status,
      issues: Number(this.formProject.issues),
      companyCode: this.currentCompanyCode,
      managerId: this.formProject.managerId || null,
      createdBy: this.currentUserEmail
    };

    const request = this.isEditing && this.formProject._id
      ? this.http.patch(`http://localhost:5000/api/projects/${this.formProject._id}`, payload)
      : this.http.post('http://localhost:5000/api/projects', payload);

    request.subscribe({
      next: () => {
        this.loadProjects();
        this.closeForm();
        alert(this.isEditing ? 'Project updated successfully!' : 'Project created successfully!');
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to save project');
      }
    });
  }

  deleteProject(id?: string): void {
    if (!id || !confirm('Delete this project permanently?')) return;

    this.http.delete(`http://localhost:5000/api/projects/${id}`).subscribe({
      next: () => {
        this.loadProjects();
        alert('Project deleted successfully');
      },
      error: () => alert('Failed to delete project')
    });
  }
}