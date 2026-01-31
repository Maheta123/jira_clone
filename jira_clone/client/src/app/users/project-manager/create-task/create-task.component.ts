import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Project {
  _id: string;
  name: string;
  status?: string;
}

interface TeamMember {
  _id: string;
  name: string;
}

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-task.component.html',
  styleUrls: ['./create-task.component.css']
})
export class CreateTaskComponent implements OnInit {

  projects: Project[] = [];
  developers: TeamMember[] = [];
  qaTesters: TeamMember[] = [];

  newTask = {
    projectId: '',
    title: '',
    description: '',
    developerId: '',
    qaId: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical'
  };

  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private apiBase = 'http://localhost:5000';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.loadProjects();
    }
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  loadProjects() {
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
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error loading projects';
        console.error('Load projects error:', err);
      }
    });
  }

  onProjectChange() {
    this.developers = [];
    this.qaTesters = [];
    this.newTask.developerId = '';
    this.newTask.qaId = '';

    if (!this.newTask.projectId) return;

    this.http.get<any>(
      `${this.apiBase}/api/project-manager/projects/${this.newTask.projectId}/task-members`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.developers = res.developers || [];
          this.qaTesters = res.qaTesters || [];

          if (this.developers.length === 1) {
            this.newTask.developerId = this.developers[0]._id;
          }
          if (this.qaTesters.length === 1) {
            this.newTask.qaId = this.qaTesters[0]._id;
          }
        } else {
          this.errorMessage = res.message || 'Failed to load team members';
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error loading team members';
        console.error('Load task-members error:', err);
      }
    });
  }

  createTask() {
    this.errorMessage = null;
    this.successMessage = null;

    // Basic client-side validation
    if (!this.newTask.projectId || !this.newTask.title.trim() ||
        !this.newTask.developerId || !this.newTask.qaId) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    this.isSubmitting = true;

    this.http.post<any>(
      `${this.apiBase}/api/project-manager/tasks`,
      this.newTask,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = 'Task created successfully!';
          setTimeout(() => {
            this.router.navigate(['/project-manager/task-board']);
          }, 1400);
        } else {
          this.errorMessage = res.message || 'Failed to create task';
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Server error while creating task';
        this.isSubmitting = false;
        console.error('Create task error:', err);
      }
    });
  }

  resetForm() {
    this.newTask = {
      projectId: '',
      title: '',
      description: '',
      developerId: '',
      qaId: '',
      priority: 'Medium'
    };
    this.developers = [];
    this.qaTesters = [];
    this.errorMessage = null;
    this.successMessage = null;
    this.isSubmitting = false;
  }
}