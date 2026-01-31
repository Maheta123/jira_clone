// src/app/users/master/platform-analytics/platform-analytics.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-platform-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-analytics.component.html',
  styleUrls: ['./platform-analytics.component.css']
})
export class PlatformAnalyticsComponent {
  // Summary Stats
  totalOrganizations = 48;
  totalUsers = 1248;
  totalProjects = 326;
  activeSubscriptions = 42;
  mrr = 48750;
  avgProjectsPerOrg = Math.round(326 / 48);

  // User Growth Data
  userGrowth = [
    { month: 'Jan', users: 820 },
    { month: 'Feb', users: 890 },
    { month: 'Mar', users: 950 },
    { month: 'Apr', users: 1020 },
    { month: 'May', users: 1080 },
    { month: 'Jun', users: 1120 },
    { month: 'Jul', users: 1160 },
    { month: 'Aug', users: 1190 },
    { month: 'Sep', users: 1210 },
    { month: 'Oct', users: 1225 },
    { month: 'Nov', users: 1235 },
    { month: 'Dec', users: 1248 }
  ];

  // MRR Growth
  mrrGrowth = [
    { month: 'Jan', amount: 32000 },
    { month: 'Feb', amount: 34500 },
    { month: 'Mar', amount: 36200 },
    { month: 'Apr', amount: 38500 },
    { month: 'May', amount: 40200 },
    { month: 'Jun', amount: 41800 },
    { month: 'Jul', amount: 43500 },
    { month: 'Aug', amount: 45000 },
    { month: 'Sep', amount: 46200 },
    { month: 'Oct', amount: 47000 },
    { month: 'Nov', amount: 48000 },
    { month: 'Dec', amount: 48750 }
  ];

  // Top Organizations
  topOrgs = [
    { name: 'Acme Corp', projects: 42, users: 156, mrr: 8500 },
    { name: 'Tech Startup Inc', projects: 38, users: 142, mrr: 7800 },
    { name: 'Global Finance Ltd', projects: 35, users: 128, mrr: 7200 },
    { name: 'Creative Agency', projects: 28, users: 98, mrr: 6200 },
    { name: 'E-commerce Giant', projects: 25, users: 115, mrr: 5800 }
  ];

  // Platform Health
  uptime = 99.92;
  avgResponseTime = 142;
  dailyActiveUsers = 892;

  // Activity by Role
  activityByRole = [
    { role: 'Master Admin', count: 12 },
    { role: 'Org Admin', count: 156 },
    { role: 'Project Manager', count: 248 },
    { role: 'Developer', count: 612 },
    { role: 'QA Tester', count: 220 }
  ];
get userGrowthPoints(): string {
  return this.userGrowth.map(d => d.users).join(',');
}

getRolePercentage(count: number): number {
  return (count / this.totalUsers) * 100;
}
}