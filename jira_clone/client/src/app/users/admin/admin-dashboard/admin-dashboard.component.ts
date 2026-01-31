// src/app/users/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Stats {
  totalProjects: number;
  totalIssues: number;
  activeUsers: number;
  openIssues: number;
}

interface Activity {
  description: string;
  timestamp: string;
}

interface Project {
  name: string;
  status: string;
  issues: number;
  members: number;
  createdAt?: string | Date;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  stats: Stats = {
    totalProjects: 0,
    totalIssues: 0,
    activeUsers: 0,
    openIssues: 0
  };

  recentActivities: Activity[] = [];
  projects: Project[] = [];

  isLoading = true;
  errorMessage = '';

  private currentCompanyCode: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserAndDashboard();
  }

  private loadCurrentUserAndDashboard(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      alert('Not logged in. Redirecting to login...');
      window.location.href = '/login';
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      // ✅ FIXED HERE
      this.currentCompanyCode = user.companyCode?.trim().toUpperCase() || '';

      if (!this.currentCompanyCode) {
        alert('Company code missing. Please login again.');
        window.location.href = '/login';
        return;
      }

      this.loadDashboardData();

    } catch (err) {
      console.error('Invalid user data in localStorage', err);
      window.location.href = '/login';
    }
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<any>(
      `http://localhost:5000/api/projects?companyCode=${this.currentCompanyCode}`
    ).subscribe({
      next: (projRes) => {
        const allProjects = projRes.success ? projRes.projects || [] : [];
        this.projects = allProjects.slice(0, 5);
        this.stats.totalProjects = allProjects.length;

        this.http.get<any>(
          `http://localhost:5000/api/users?companyCode=${this.currentCompanyCode}`
        ).subscribe({
          next: (userRes) => {
            const users = userRes.success ? userRes.users || [] : [];
            this.stats.activeUsers = users.filter(
              (u: any) => u.status === 'active'
            ).length;

            this.http.get<any>(
              `http://localhost:5000/api/tickets?companyCode=${this.currentCompanyCode}`
            ).subscribe({
              next: (ticketRes) => {
                const tickets = ticketRes.success ? ticketRes.tickets || [] : [];

                this.stats.totalIssues = tickets.length;
                this.stats.openIssues = tickets.filter((t: any) =>
                  ['Open', 'In Progress'].includes(t.status)
                ).length;

                this.generateRecentActivities(tickets, this.projects, users);
                this.isLoading = false;
              },
              error: () => {
                this.errorMessage = 'Failed to load tickets';
                this.isLoading = false;
              }
            });
          },
          error: () => {
            this.errorMessage = 'Failed to load users';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Failed to load projects';
        this.isLoading = false;
      }
    });
  }

  private generateRecentActivities(
    tickets: any[],
    projects: any[],
    users: any[]
  ): void {
    const activities: Activity[] = [];

    tickets.slice(0, 3).forEach(t => {
      activities.push({
        description: `New ticket "${t.title}" created`,
        timestamp: new Date(t.submitted || Date.now()).toLocaleString()
      });
    });

    projects.slice(0, 2).forEach(p => {
      activities.push({
        description: `Project "${p.name}" created`,
        timestamp: new Date(p.createdAt || Date.now()).toLocaleString()
      });
    });

    users.slice(0, 2).forEach(u => {
      activities.push({
        description: `New user "${u.name}" joined`,
        timestamp: new Date(u.createdAt || Date.now()).toLocaleString()
      });
    });

    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    this.recentActivities = activities.slice(0, 5);
  }
}
