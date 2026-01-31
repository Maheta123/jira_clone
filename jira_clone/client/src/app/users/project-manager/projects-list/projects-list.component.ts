// projects-list.component.ts

import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

/* =========================
   Interfaces
========================= */

interface Project {
  _id: string;
  name: string;
  status: string;
  issues: number;
  progress: number;
  tasksCount: number;
  openTasks: number;
  dueSoon: boolean;
  members: string[];
  membersCount: number;
  membersLimit: number;
  managerName: string;
  managerEmail?: string | null;
  joined: string;
  lastUpdated: string;
}

interface AvailableUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  projectCount: number;
}

interface ProjectMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

/* =========================
   Component
========================= */

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.css']
})
export class ProjectsListComponent implements OnInit {

  /* ===== Project List ===== */
  projects: Project[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  /* ===== Assign Modal ===== */
  showAssignModal = false;
  selectedProject: Project | null = null;
  availableUsers: AvailableUser[] = [];
  selectedUserId = '';
  assignLoading = false;
  assignSuccessMessage: string | null = null;
  assignError: string | null = null;

  /* ===== Edit / Reallocate ===== */
  showEditModal = false;
  projectMembers: ProjectMember[] = [];
  editError: string | null = null;

  private apiBase = 'http://localhost:5000';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /* =========================
     Lifecycle
  ========================= */

  ngOnInit() {
    if (this.isBrowser) {
      this.loadMyProjects();
    }
  }

  /* =========================
     Helpers
  ========================= */

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /* =========================
     Load Projects
  ========================= */

  private loadMyProjects() {
    this.isLoading = true;
    this.errorMessage = null;

    const token = localStorage.getItem('token');
    if (!token) {
      this.errorMessage = 'Please login first';
      this.isLoading = false;
      return;
    }

    this.http.get<any>(
      `${this.apiBase}/api/project-manager/projects`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.projects = res.projects || [];
        } else {
          this.errorMessage = res.message || 'Failed to load projects';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Projects load error:', err);
        this.errorMessage = err.error?.message || 'Failed to connect to server';
        this.isLoading = false;
      }
    });
  }

  /* =========================
     ASSIGN MEMBER FLOW
  ========================= */

  openAssignModal(project: Project) {
    if (!this.canAssign(project)) {
      alert('Member limit reached or project not active.');
      return;
    }

    this.selectedProject = project;
    this.showAssignModal = true;
    this.assignError = null;
    this.assignSuccessMessage = null;
    this.selectedUserId = '';
    this.availableUsers = [];

    this.loadAvailableUsers();
  }

  closeAssignModal() {
    this.showAssignModal = false;
    this.selectedProject = null;
    this.availableUsers = [];
    this.selectedUserId = '';
  }

  private loadAvailableUsers() {
    if (!this.selectedProject) return;

    this.http.get<any>(
      `${this.apiBase}/api/project-manager/projects/${this.selectedProject._id}/available-users`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.availableUsers = res.users || [];
        } else {
          this.assignError = res.message || 'Failed to load available users';
        }
      },
      error: (err) => {
        console.error('Available users error:', err);
        this.assignError = err.error?.message || 'Failed to load team members';
      }
    });
  }

  assignUser() {
    if (!this.selectedProject || !this.selectedUserId) return;

    this.assignLoading = true;
    this.assignError = null;
    this.assignSuccessMessage = null;

    this.http.post<any>(
      `${this.apiBase}/api/project-manager/projects/${this.selectedProject._id}/assign-user`,
      { userId: this.selectedUserId },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.assignSuccessMessage = res.message || 'User assigned successfully!';
          setTimeout(() => {
            this.loadMyProjects();
            this.closeAssignModal();
          }, 1200);
        } else {
          this.assignError = res.message || 'Assignment failed';
        }
      },
      error: (err) => {
        console.error('Assign error:', err);
        this.assignError = err.error?.message || 'Failed to assign user';
      },
      complete: () => this.assignLoading = false
    });
  }

  /* =========================
     EDIT / REALLOCATE FLOW
  ========================= */

  openEditModal(project: Project) {
    this.selectedProject = project;
    this.showEditModal = true;
    this.editError = null;
    this.projectMembers = [];

    this.loadProjectMembers();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedProject = null;
    this.projectMembers = [];
  }

  private loadProjectMembers() {
    if (!this.selectedProject) return;

    this.http.get<any>(
      `${this.apiBase}/api/project-manager/projects/${this.selectedProject._id}/members`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.projectMembers = res.members || [];
        } else {
          this.editError = res.message || 'Failed to load members';
        }
      },
      error: (err) => {
        console.error('Load members error:', err);
        this.editError = err.error?.message || 'Failed to load members';
      }
    });
  }

  removeMember(userId: string) {
    if (!this.selectedProject) return;

    if (!confirm('Remove this member from the project?')) return;

    this.http.post<any>(
      `${this.apiBase}/api/project-manager/projects/${this.selectedProject._id}/remove-member`,
      { userId },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.loadProjectMembers();
        this.loadMyProjects();
      },
      error: (err) => {
        console.error('Remove member error:', err);
        this.editError = err.error?.message || 'Failed to remove member';
      }
    });
  }

  /* =========================
     LOGIC HELPER (FIXED)
  ========================= */

  canAssign(project: Project): boolean {
    const membersCount = Number(project.membersCount);
    const membersLimit = Number(project.membersLimit);
    const status = (project.status || '').toLowerCase();

    return status === 'active' && membersCount < membersLimit;
  }

  /* =========================
     UI Helpers
  ========================= */

  getStatusClass(status?: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'active': return 'status-active';
      case 'in progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      default: return 'status-default';
    }
  }
}
