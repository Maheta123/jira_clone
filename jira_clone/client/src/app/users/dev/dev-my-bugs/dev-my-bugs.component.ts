// src/app/users/dev/dev-my-bugs/dev-my-bugs.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';

interface Bug {
  taskKey: string;        // real taskKey (preferred for display & update)
  mongoId: string;        // fallback identifier if no taskKey
  title: string;
  project: string;
  severity: string;
  status: string;
  reportedBy: string;
  reportedDate: string;
  description: string;
  showComments: boolean;
}

@Component({
  selector: 'app-dev-my-bugs',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dev-my-bugs.component.html',
  styleUrls: ['./dev-my-bugs.component.css']
})
export class DevMyBugsComponent implements OnInit {
  bugs: Bug[] = [];
  loading = true;
  error: string | null = null;

  currentUserId: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.currentUserId = (u._id || u.id || '').toString().trim();
      } catch (e) {
        console.warn('Failed to parse currentUser', e);
      }
    }

    if (!this.currentUserId) {
      this.error = 'Please log in to view your assigned bugs.';
      this.loading = false;
      return;
    }

    this.loadBugs();
  }

  loadBugs() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>('/api/tasks').subscribe({
      next: (tasks) => {
        const myBugs = tasks.filter(task => {
          if (task.assignees?.developer?.userId?.toString() !== this.currentUserId) return false;
          if (task.status === 'done') return false;

          const titleLower = (task.title || '').toLowerCase();
          return (
            task.priority === 'Critical' ||
            titleLower.includes('fix') ||
            titleLower.includes('bug') ||
            titleLower.includes('error') ||
            titleLower.includes('crash') ||
            titleLower.includes('issue') ||
            titleLower.includes('failure')
          );
        });

        this.bugs = myBugs.map(task => {
          const realTaskKey = task.taskKey || '';
          const realMongoId = task._id?.toString() || '';

          return {
            taskKey: realTaskKey || realMongoId.slice(-8) || 'No ID',
            mongoId: realMongoId,
            title: task.title || '(no title)',
            project: task.projectName || task.project || 'Unknown',
            severity: task.priority || 'Medium',
            status: this.mapStatus(task.status),
            reportedBy: task.reportedBy?.name || 'Unknown',
            reportedDate: task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : 'Unknown',
            description: task.description || 'No comments or description available.',
            showComments: false
          };
        });

        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load bugs:', err);
        this.error = 'Failed to load your assigned bugs. Please try again.';
        this.loading = false;
      }
    });
  }

  private mapStatus(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'todo') return 'To Fix';
    if (s === 'inprogress') return 'Fixing';
    if (s === 'done') return 'Fixed';
    return status || 'Unknown';
  }

  toggleComments(bug: Bug) {
    bug.showComments = !bug.showComments;
  }

  startFixing(bug: Bug) {
    const identifier = bug.taskKey || bug.mongoId;

    if (!identifier || identifier === 'No ID') {
      alert('This bug has no valid task key or ID – cannot update status.');
      return;
    }

    this.http.put(`/api/tasks/dev/update/${identifier}`, { status: 'inprogress' }).subscribe({
      next: () => {
        bug.status = 'Fixing';
        alert(`Started fixing ${bug.taskKey || bug.mongoId.slice(-8)}`);
      },
      error: (err) => {
        console.error('Start fixing failed:', err);
        alert('Failed to start fixing this bug. Check console for details.');
      }
    });
  }

  markFixed(bug: Bug) {
    const identifier = bug.taskKey || bug.mongoId;

    if (!identifier || identifier === 'No ID') {
      alert('This bug has no valid task key or ID – cannot mark as fixed.');
      return;
    }

    this.http.put(`/api/tasks/dev/update/${identifier}`, {
      status: 'done',
      resolvedAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.bugs = this.bugs.filter(b => b.taskKey !== bug.taskKey && b.mongoId !== bug.mongoId);
        alert(`${bug.taskKey || bug.mongoId.slice(-8)} marked as fixed`);
      },
      error: (err) => {
        console.error('Mark fixed failed:', err);
        alert('Failed to mark bug as fixed. Check console for details.');
      }
    });
  }
}