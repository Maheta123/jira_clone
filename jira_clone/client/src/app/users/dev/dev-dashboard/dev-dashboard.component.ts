// src/app/users/dev/dev-dashboard/dev-dashboard.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

interface AssignedTask {
  id: string;
  title: string;
  project: string;
  priority: string;
  status: string;
  _id?: string;
  taskKey: string;
}

interface RecentActivity {
  taskKey: string;
  title: string;
  action: string;
  date: string;
  timeAgo: string;
}

@Component({
  selector: 'app-dev-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dev-dashboard.component.html',
  styleUrls: ['./dev-dashboard.component.css']
})
export class DevDashboardComponent implements OnInit {
  loading = true;
  error: string | null = null;

  currentUserId: string = '';
  currentUserName: string = 'Developer';

  stats = {
    myOpenTasks: 0,
    openBugs: 0,
    inProgressTasks: 0,
    completedThisWeek: 0,
    codeReviewsPending: 0,
    buildsPassing: 100
  };

  assignedTasks: AssignedTask[] = [];
  recentActivities: RecentActivity[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.currentUserName = u.name?.trim() || 'Developer';
        this.currentUserId = (u._id || u.id || '').toString().trim();
      } catch (e) {
        console.warn('Failed to parse currentUser', e);
      }
    }

    if (!this.currentUserId) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>('/api/tasks').subscribe({
      next: (tasks) => {
        // Filter only tasks assigned to current developer
        const myDevTasks = tasks.filter(task =>
          task.assignees?.developer?.userId?.toString() === this.currentUserId
        );

        // Assigned Tasks Table (already working – unchanged)
        this.assignedTasks = myDevTasks.map(task => ({
          id: task.taskKey || task.id || '—',
          taskKey: task.taskKey || task.id || '—',
          title: task.title || '(no title)',
          project: task.project || task.projectName || 'Unknown',
          priority: task.priority || 'Medium',
          status: this.mapStatusForDisplay(task.status),
          _id: task._id
        }));

        // ── Date handling ── Use UTC date-only for comparison
        const nowLocal = new Date();
        const todayUTC = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()));

        // 14-day window in UTC (very safe)
        const windowStartLocal = new Date(nowLocal);
        windowStartLocal.setDate(windowStartLocal.getDate() - 14);
        const windowStartUTC = new Date(Date.UTC(
          windowStartLocal.getUTCFullYear(),
          windowStartLocal.getUTCMonth(),
          windowStartLocal.getUTCDate()
        ));

        let openTasksCount = 0;
        let openBugsCount = 0;
        let inProgressCount = 0;
        let completedCount = 0;

        const recentActs: RecentActivity[] = [];

        myDevTasks.forEach(task => {
          const statusLower = (task.status || '').toLowerCase();

          // Open tasks stats
          if (statusLower !== 'done') {
            openTasksCount++;

            const titleLower = task.title.toLowerCase();
            if (
              task.priority === 'Critical' ||
              titleLower.includes('fix') ||
              titleLower.includes('bug') ||
              titleLower.includes('error') ||
              titleLower.includes('crash') ||
              titleLower.includes('issue')
            ) {
              openBugsCount++;
            }

            if (statusLower === 'inprogress') {
              inProgressCount++;
            }
          }

          // Completed this period – UTC date comparison
          if (statusLower === 'done' && task.resolvedAt) {
            const resolved = new Date(task.resolvedAt);
            const resolvedDateUTC = new Date(Date.UTC(resolved.getUTCFullYear(), resolved.getUTCMonth(), resolved.getUTCDate()));

            if (resolvedDateUTC >= windowStartUTC && resolvedDateUTC <= todayUTC) {
              completedCount++;

              // Friendly time-ago
              const msPerDay = 1000 * 60 * 60 * 24;
              const daysAgo = Math.floor((nowLocal.getTime() - resolved.getTime()) / msPerDay);

              let timeAgo = 'Today';
              if (daysAgo === 1) timeAgo = 'Yesterday';
              else if (daysAgo > 1) timeAgo = `${daysAgo} days ago`;

              recentActs.push({
                taskKey: task.taskKey || task.id || '—',
                title: task.title || '(no title)',
                action: 'Completed task',
                date: resolved.toISOString().split('T')[0],
                timeAgo
              });
            }
          }
        });

        // Sort recent activities newest → oldest
        recentActs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        this.stats = {
          myOpenTasks: openTasksCount,
          openBugs: openBugsCount,
          inProgressTasks: inProgressCount,
          completedThisWeek: completedCount,
          codeReviewsPending: 0,
          buildsPassing: 100
        };

        this.recentActivities = recentActs.slice(0, 10);

        // Debug output (open browser console F12 to see)
        console.log('Dev Dashboard Debug Info:', {
          currentUserId: this.currentUserId,
          myDevTasksCount: myDevTasks.length,
          todayUTC: todayUTC.toISOString(),
          windowStartUTC: windowStartUTC.toISOString(),
          completedThisWeek: completedCount,
          recentActivities: recentActs
        });

        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('[Dev Dashboard] Load failed:', err);
        this.error = 'Could not load dashboard data. Please try again.';
        this.loading = false;
      }
    });
  }

  private mapStatusForDisplay(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'todo') return 'To Do';
    if (s === 'inprogress') return 'In Progress';
    if (s === 'done') return 'Completed';
    return status || 'Unknown';
  }

  startWork(task: AssignedTask) {
    alert(`Starting work on ${task.id} — ${task.title}`);
    // Later: PUT status 'inprogress'
  }
}