import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';     // Keep if needed, but for @if/@for not required

interface DashboardDisplay {
  organizations: { total: number; change: string };
  users:        { active: number; change: string };
  projects:     { total: number; newToday: string };
  health:       { status: string; uptime: string };
}

interface Activity {
  icon: string;
  time: string;
  message: string;
}

interface DashboardApiResponse {
  success: boolean;
  data: {
    display: DashboardDisplay;
    recentActivities: Activity[];
  };
}

@Component({
  selector: 'app-master-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './master-dashboard.component.html',
  styleUrls: ['./master-dashboard.component.css']
})
export class MasterDashboardComponent implements OnInit {

  stats: DashboardDisplay | null = null;
  recentActivities: Activity[] = [];
  loading = true;
  errorMessage: string | null = null;

  private apiUrl = 'http://localhost:5000/api/master/dashboard';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = null;

    this.http.get<DashboardApiResponse>(this.apiUrl).subscribe({
      next: (response) => {
        if (response?.success === true && response?.data?.display) {
          this.stats = response.data.display;
          this.recentActivities = response.data.recentActivities || [];
        } else {
          this.errorMessage = 'Invalid dashboard response format';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'Failed to load dashboard data. Please check server connection.';
        this.loading = false;
        console.error('Dashboard load error:', err);
      }
    });
  }

  retryLoad(): void {
    this.loadDashboard();
  }

  get organizations() { return this.stats?.organizations; }
  get users()        { return this.stats?.users; }
  get projects()     { return this.stats?.projects; }
  get health()       { return this.stats?.health; }
}