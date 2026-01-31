// src/app/users/project-manager/pm-dashboard/pm-dashboard.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Stat {
  activeProjects: number;
  totalTasks: number;
  completedThisWeek: number;
  teamMembers: number;
}

interface Activity {
  action: string;
  item: string;
  by?: string;
  to?: string;
  time: string;
}

@Component({
  selector: 'app-pm-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './pm-dashboard.component.html',
  styleUrls: ['./pm-dashboard.component.css']
})
export class PmDashboardComponent implements OnInit {

  stats: Stat = {
    activeProjects: 0,
    totalTasks: 0,
    completedThisWeek: 0,
    teamMembers: 0
  };

  recentActivity: Activity[] = [];

  isLoading = true;
  errorMessage = '';

  private currentCompanyCode: string = '';
  private currentUserId: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
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
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      this.redirectToLogin('No user data or token found');
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      this.currentCompanyCode = user.companyCode?.trim().toUpperCase() || '';
      this.currentUserId = user._id || user.id || '';

      if (!this.currentCompanyCode || !this.currentUserId) {
        this.redirectToLogin('Missing company code or user ID');
        return;
      }

      this.loadPmDashboardData(token);

    } catch (err) {
      console.error('Invalid user data in localStorage', err);
      this.redirectToLogin('Invalid stored user data');
    }
  }

  private redirectToLogin(reason: string = ''): void {
    if (reason) console.warn('Redirecting to login:', reason);
    alert('Please login again. ' + (reason ? `(${reason})` : ''));
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  private loadPmDashboardData(token: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(
      'http://localhost:5000/api/project-manager/projects',
      { headers }
    ).subscribe({
      next: (projRes) => {
        if (!projRes.success) {
          this.errorMessage = projRes.message || 'Failed to load projects';
          this.isLoading = false;
          return;
        }

        const projects = projRes.projects || [];

        // Active projects
        this.stats.activeProjects = projects.filter((p: any) =>
          ['Active', 'In Progress'].includes(p.status)
        ).length;

        // Total tasks
        this.stats.totalTasks = projects.reduce((sum: number, p: any) => sum + (Number(p.tasksCount) || 0), 0);

        // Unique team members
        const memberSet = new Set<string>();
        projects.forEach((p: any) => {
          if (Array.isArray(p.members)) {
            p.members.forEach((mid: string) => memberSet.add(mid));
          }
        });
        this.stats.teamMembers = memberSet.size;

        // Rough client-side "completed this week" (can be improved later server-side)
        let completedThisWeek = 0;
        projects.forEach((p: any) => {
          const total = Number(p.tasksCount) || 0;
          if (total > 0) {
            // Very approximate – replace with real data when available
            completedThisWeek += Math.round(total * 0.15);
          }
        });
        this.stats.completedThisWeek = completedThisWeek;

        this.generateRecentActivity(projects);
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Dashboard API error:', err);
        if (err.status === 401) {
          this.errorMessage = 'Authentication failed (token invalid or expired)';
          this.redirectToLogin('Invalid or expired token');
        } else if (err.status === 0) {
          this.errorMessage = 'Cannot reach backend server';
        } else {
          this.errorMessage = `Failed to load data (${err.status})`;
        }
        this.isLoading = false;
      }
    });
  }

  private generateRecentActivity(projects: any[]): void {
    const activities: Activity[] = [];

    // Sort by most recent update / creation
    const sorted = [...projects].sort((a, b) => {
      const dateA = new Date(b.lastUpdated || b.joined || 0);
      const dateB = new Date(a.lastUpdated || a.joined || 0);
      return dateA.getTime() - dateB.getTime();
    });

    // Recent project activity
    sorted.slice(0, 3).forEach(p => {
      const time = this.timeAgo(new Date(p.lastUpdated || p.joined || Date.now()));
      activities.push({
        action: 'Project updated',
        item: p.name || 'Unnamed project',
        by: 'You',
        time
      });
    });

    // Some placeholder task activity (replace with real data later)
    if (projects.length > 0) {
      const exampleProject = projects[0]?.name || 'Project';
      activities.push(
        { action: 'Task completed', item: 'UI fixes', to: exampleProject, time: 'Yesterday' },
        { action: 'Task assigned', item: 'API integration', to: 'Team member', time: '2 days ago' }
      );
    }

    this.recentActivity = activities.slice(0, 5);
  }

  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const intervals = [
      { unit: 'year',  sec: 31536000 },
      { unit: 'month', sec: 2592000  },
      { unit: 'day',   sec: 86400    },
      { unit: 'hour',  sec: 3600     },
      { unit: 'minute',sec: 60       }
    ];

    for (const i of intervals) {
      const count = Math.floor(seconds / i.sec);
      if (count >= 1) {
        return `${count} ${i.unit}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }
}