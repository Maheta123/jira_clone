import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

interface AssignedIssue {
  id: string;           // taskKey
  title: string;
  project: string;
  priority: string;
  status: string;
  _id?: string;         // internal use
  taskKey: string;
}

interface TestResult {
  testCase: string;
  result: 'Pass' | 'Fail' | 'Blocked' | 'Not Run';
  date: string;
}

@Component({
  selector: 'app-qa-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './qa-dashboard.component.html',
  styleUrls: ['./qa-dashboard.component.css']
})
export class QaDashboardComponent implements OnInit {
  currentUserId: string = '';
  currentUserName: string = 'You';

  loading = true;
  error: string | null = null;

  // Stats
  stats = {
    myOpenBugs: 0,
    testsInProgress: 0,
    passedToday: 0,
    failedToday: 0
  };

  assignedIssues: AssignedIssue[] = [];
  recentTests: TestResult[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) { }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Load current user
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.currentUserName = u.name?.trim() || 'You';
        this.currentUserId = (u._id || u.id || '').toString().trim();
      } catch (e) {
        console.warn('Failed to parse currentUser from localStorage', e);
      }
    }

    if (!this.currentUserId) {
      this.error = 'Please log in to view your QA dashboard.';
      this.loading = false;
      return;
    }

    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>('/api/tasks').subscribe({
      next: (tasks) => {
        // Filter tasks where current user is QA assignee
        const myTasks = tasks.filter(task =>
          task.assignees?.qa?.userId?.toString() === this.currentUserId
        );

        // ── Assigned Issues ───────────────────────────────────────
        this.assignedIssues = myTasks
          .filter(task => task.status !== 'done') // still needs QA attention
          .map(task => ({
            id: task.taskKey || task.id || '—',
            taskKey: task.taskKey || task.id || '—',
            title: task.title || '(no title)',
            project: task.project || task.projectName || 'Unknown',
            priority: task.priority || 'Medium',
            status: this.mapStatusForDisplay(task.status),
            _id: task._id
          }));

        // ── Parse all comments from myTasks ───────────────────────
        const allComments: { task: any, comment: { type: string, date: Date, message: string } }[] = [];

        myTasks.forEach(task => {
          const comments = this.parseComments(task.description || '');
          comments.forEach(comm => {
            const date = this.getCommentDate(comm.dateStr, comm.timeStr, comm.ampm);
            if (date) {
              allComments.push({
                task,
                comment: { type: comm.type, date, message: comm.message }
              });
            }
          });

          // Add synthetic comment for tasks without comments but with resolvedAt and done
          if (comments.length === 0 && task.resolvedAt && task.status === 'done') {
            const date = new Date(task.resolvedAt);
            const type = (task.description?.toLowerCase().includes('reopen') ||
              task.description?.toLowerCase().includes('fail')) ? 'Reopen Reason' : 'Pass Comments';
            allComments.push({
              task,
              comment: { type, date, message: 'Completed without explicit comment' }
            });
          }
        });

        // ── Stats ─────────────────────────────────────────────────
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 6);

        let openBugs = 0;
        let inProgress = 0;
        let passed = 0;
        let failed = 0;

        myTasks.forEach(task => {
          if (task.status !== 'done') {
            openBugs++;
          }

          const taskComments = this.parseComments(task.description || '');
          let isInProgress = task.status?.toLowerCase() === 'inprogress';
          if (!isInProgress && taskComments.length > 0) {
            const lastType = taskComments[taskComments.length - 1].type;
            if (lastType === 'Reopen Reason') isInProgress = true;
          }
          if (isInProgress && task.status !== 'done') {
            inProgress++;
          }
        });

        allComments.forEach(ac => {
          if (ac.comment.date >= weekStart && ac.comment.date <= today) {
            if (ac.comment.type === 'Pass Comments') {
              passed++;
            } else if (ac.comment.type === 'Reopen Reason') {
              failed++;
            }
          }
        });

        this.stats = {
          myOpenBugs: openBugs,
          testsInProgress: inProgress,
          passedToday: passed,     // rename prop if you want
          failedToday: failed
        };

        // ── Recent Test Results ───────────────────────────────────
        this.recentTests = allComments
          .sort((a, b) => b.comment.date.getTime() - a.comment.date.getTime())
          .slice(0, 8)
          .map(ac => {
            const taskKey = ac.task.id || ac.task.taskKey || ac.task._id || '—';
            return {
              testCase: `${taskKey} — ${ac.task.title || '(no title)'}`,
              result: this.mapToTestResult(ac.comment.type, ac.task.description || ''),
              date: ac.comment.date.toISOString().split('T')[0]
            };
          });

        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load dashboard data:', err);
        this.error = 'Could not load your tasks. Please try again later.';
        this.loading = false;
      }
    });
  }

  startTesting(issue: AssignedIssue) {
    if (issue.taskKey) {
      // Navigate to test execution page with this task
      this.router.navigate(['/test-execution', issue.taskKey]);
      // OR if no routing: window.location.href = `/test-execution?task=${issue.taskKey}`;
    } else {
      alert(`Cannot start testing for ${issue.title} - missing task ID`);
    }
  }

  private mapStatusForDisplay(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s === 'todo') return 'To Test';
    if (s === 'inprogress') return 'In Testing';
    if (s === 'done') return 'Completed';
    return status || 'Unknown';
  }

  private mapToTestResult(type: string, description: string = ''): 'Pass' | 'Fail' | 'Blocked' | 'Not Run' {
    if (type === 'Pass Comments') return 'Pass';
    if (type === 'Reopen Reason') return 'Fail';
    if (description.toLowerCase().includes('fail') || description.toLowerCase().includes('reopen')) {
      return 'Fail';
    }
    if (description.toLowerCase().includes('blocked')) return 'Blocked';
    return 'Not Run';
  }

  private parseComments(description: string): { type: string, dateStr: string, timeStr: string, ampm: string, message: string }[] {
    const comments = [];
    const regex = /QA (Pass Comments|Reopen Reason) \(([\d]{1,2}\/[\d]{1,2}\/\d{4}), ([\d]{1,2}:\d{2}:\d{2}) (am|pm)\): (.*?)(?=\nQA|$|\n\n)/gs;
    let match;
    while ((match = regex.exec(description)) !== null) {
      comments.push({
        type: match[1],
        dateStr: match[2],
        timeStr: match[3],
        ampm: match[4],
        message: match[5].trim()
      });
    }
    return comments;
  }

  private getCommentDate(dateStr: string, timeStr: string, ampm: string): Date | null {
    try {
      const [day, mon, year] = dateStr.split('/').map(Number);
      let [hour, min, sec] = timeStr.split(':').map(Number);
      if (isNaN(sec)) sec = 0;
      if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      return new Date(year, mon - 1, day, hour, min, sec);
    } catch (e) {
      console.warn('Failed to parse comment date:', { dateStr, timeStr, ampm }, e);
      return null;
    }
  }
}