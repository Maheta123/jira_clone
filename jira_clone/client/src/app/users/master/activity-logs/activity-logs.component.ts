// src/app/users/master/activity-logs/activity-logs.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ActivityLog {
  id: string;
  timestamp: string | Date;
  user: string;
  role: string;
  action: string;
  target: string;
  organization?: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
}

@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.css']
})
export class ActivityLogsComponent implements OnInit {

  logs: ActivityLog[] = [];
  filteredLogs: ActivityLog[] = [];

  searchTerm = '';
  selectedFilter = 'all';

  loading = true;
  errorMessage: string | null = null;

  // Stats (will be filled from backend)
  totalCount = 0;
  successCount = 0;
  warningCount = 0;
  errorCount = 0;

  private apiUrl = 'http://localhost:5000/api/master/dashboard';  // same endpoint

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadActivityLogs();
  }

  loadActivityLogs(): void {
    this.loading = true;
    this.errorMessage = null;

    this.http.get<any>(this.apiUrl).subscribe({
      next: (response) => {
        if (response?.success && response?.data?.recentActivities) {
          // Map backend recentActivities to our ActivityLog interface
          this.logs = response.data.recentActivities.map((act: any, index: number) => ({
            id: `ACT-${String(index + 1).padStart(4, '0')}`, // temporary ID - can be improved
            timestamp: new Date(), // backend doesn't send exact date, we use relative time
            user: 'System',        // we can improve this later if we send user info
            role: 'Platform',
            action: act.message.split('<strong>')[0].trim() || 'Activity',
            target: act.message.includes('<strong>"') 
              ? act.message.split('<strong>"')[1].split('"')[0] 
              : '',
            organization: '',
            ipAddress: 'internal',
            status: 'success'      // assume success for now - can be improved
          }));

          // Update stats (dummy for now - can be real from backend later)
          this.totalCount = this.logs.length;
          this.successCount = this.logs.filter(l => l.status === 'success').length;
          this.warningCount = this.logs.filter(l => l.status === 'warning').length;
          this.errorCount = this.logs.filter(l => l.status === 'error').length;

          this.filterLogs();
        } else {
          this.errorMessage = 'Invalid response format from server';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load activity logs';
        this.loading = false;
        console.error('Activity logs error:', err);
      }
    });
  }

  filterLogs(): void {
    this.filteredLogs = this.logs.filter(log => {
      const matchesSearch = !this.searchTerm || 
        log.user.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesFilter = this.selectedFilter === 'all' || log.status === this.selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }

  formatTime(timestamp: string | Date): string {
    // Since backend gives relative time already, we can just display it
    // If you want to show full date later, we can adjust
    return typeof timestamp === 'string' ? timestamp : 'Just now';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }

  retryLoad(): void {
    this.loadActivityLogs();
  }
}