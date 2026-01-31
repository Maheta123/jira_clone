import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface TestCase {
  _id: string;
  taskKey: string;
  id: string;                // for display
  title: string;
  priority: string;
  status: 'Not Run' | 'Pass' | 'Fail' | 'Blocked';
  originalTaskStatus: string;
  steps: string[];
  expectedResult: string;
  notes: string;             // all QA/Test comments concatenated
  lastExecutedBy?: string;
  lastExecutedOn?: string;   // ISO date string for display
  assignedTo: string;
}

@Component({
  selector: 'app-test-execution',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './test-execution.component.html',
  styleUrls: ['./test-execution.component.css']
})
export class TestExecutionComponent implements OnInit {
  testCases: TestCase[] = [];
  selectedTest: TestCase | null = null;

  loading = true;
  error: string | null = null;

  currentUserId = '';
  currentUserName = 'You';

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
        this.currentUserName = u.name?.trim() || 'You';
        this.currentUserId = (u._id || u.id || '').toString().trim();
      } catch (e) {
        console.warn('Failed to parse currentUser', e);
      }
    }

    this.loadTestCases();
  }

  loadTestCases() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>('/api/tasks').subscribe({
      next: (tasks) => {
        // More realistic test-case filtering
        const potentialTests = tasks.filter(task => {
          const titleLower = (task.title || '').toLowerCase();
          const descLower = (task.description || '').toLowerCase();
          return (
            titleLower.includes('test') ||
            titleLower.includes('verify') ||
            titleLower.includes('check') ||
            titleLower.includes('validate') ||
            descLower.includes('qa pass') ||
            descLower.includes('qa reopen') ||
            descLower.includes('pass comments') ||
            descLower.includes('test execution') ||
            descLower.includes('test notes') ||
            task.assignees?.qa?.userId ||   // QA is assigned
            task.status === 'done' && task.resolvedAt
          );
        });

        this.testCases = potentialTests.map(task => {
          const comments = this.parseComments(task.description || '');
          const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;

          let displayStatus: 'Not Run' | 'Pass' | 'Fail' | 'Blocked' = 'Not Run';
          if (task.status?.toLowerCase() === 'done') {
            displayStatus = 'Pass';
          }
          if (lastComment?.type === 'Reopen Reason') {
            displayStatus = 'Fail';
          }

          const lastExecDate = lastComment?.date || (task.resolvedAt ? new Date(task.resolvedAt) : null);

          return {
            _id: task._id,
            taskKey: task.taskKey || task.id || task._id || '—',
            id: task.taskKey || task.id || '—',
            title: task.title || '(no title)',
            priority: task.priority || 'Medium',
            status: displayStatus,
            originalTaskStatus: task.status || 'todo',
            steps: task.steps
            ? task.steps.split('\n').map((s: string) => s.trim()).filter((s: string) => s)
            : [],
            expectedResult: this.extractExpectedResult(task.description || ''),
            notes: comments.map(c => 
              `${c.type} (${c.dateStr}, ${c.timeStr} ${c.ampm}): ${c.message}`
            ).join('\n\n') || '',
            executedBy: task.assignees?.qa?.name || task.reportedBy?.name || 'Unknown',
            executedOn: task.resolvedAt ? new Date(task.resolvedAt) : undefined,
           assignedTo: task.assignees?.qa?.userId?.toString() || ''
          };
        });

        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load tasks:', err);
        this.error = 'Failed to load test cases. ' + (err.error?.message || err.statusText);
        this.loading = false;
      }
    });
  }

  // ───────────────────────────────────────────────
  //  Helpers (aligned with QA Dashboard)
  // ───────────────────────────────────────────────

  private parseComments(description: string): {type: string, dateStr: string, timeStr: string, ampm: string, message: string, date?: Date}[] {
    const comments = [];
    // Made seconds optional + more tolerant line ending
    const regex = /QA (Pass Comments|Reopen Reason) \(([\d]{1,2}\/[\d]{1,2}\/\d{4}), ([\d]{1,2}:\d{2}(?::\d{2})?) (am|pm)\): (.*?)(?=\nQA|$|\n\n|$)/gs;
    let match;
    while ((match = regex.exec(description)) !== null) {
      const date = this.parseCommentDate(match[2], match[3], match[4]);
      comments.push({
        type: match[1],
        dateStr: match[2],
        timeStr: match[3],
        ampm: match[4],
        message: match[5].trim(),
        date
      });
    }
    return comments;
  }

  private parseCommentDate(dateStr: string, timeStr: string, ampm: string): Date | undefined {
    try {
      const [day, mon, year] = dateStr.split('/').map(Number);
      const [hourStr, minStr, secStr = '0'] = timeStr.split(':');
      let hour = Number(hourStr);
      const min = Number(minStr);
      const sec = Number(secStr);

      if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;

      return new Date(year, mon - 1, day, hour, min, sec);
    } catch {
      return undefined;
    }
  }

  private extractExpectedResult(desc: string): string {
    if (!desc) return 'No expected result specified';
    // Take first meaningful line that doesn't look like a comment
    const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.match(/^(QA |Test Execution |Test Notes |Reopen Reason)/i)) {
        return line;
      }
    }
    return lines[0] || 'No expected result specified';
  }

  private mapTestToTaskStatus(testStatus: 'Pass' | 'Fail' | 'Blocked'): string {
    switch (testStatus) {
      case 'Pass':    return 'done';
      case 'Fail':
      case 'Blocked': return 'todo';   // or 'inprogress' if you prefer
      default:        return 'todo';
    }
  }

  executeTest(result: 'Pass' | 'Fail' | 'Blocked') {
    if (!this.selectedTest) return;

    const taskKey = this.selectedTest.taskKey;
    if (!taskKey || taskKey === '—') {
      alert('Cannot update: missing valid task key');
      return;
    }

    let notesToAdd = '';
    if (result === 'Fail') {
      const reason = prompt('Describe what went wrong (this will create a bug report):')?.trim();
      if (reason) {
        notesToAdd = `\nTest Execution (${new Date().toISOString()}): ${reason}`;
      }
    }

    const payload: any = {
      status: this.mapTestToTaskStatus(result),
      description: (this.selectedTest.notes || '') + notesToAdd
    };

    if (result === 'Pass') {
      payload.resolvedAt = new Date().toISOString();
    }

    this.http.put(`/api/tasks/${taskKey}`, payload).subscribe({
      next: () => {
        // Update local state
        const idx = this.testCases.findIndex(t => t.taskKey === taskKey);
        if (idx !== -1) {
          this.testCases[idx] = {
            ...this.testCases[idx],
            status: result,
            notes: this.testCases[idx].notes + notesToAdd,
            lastExecutedOn: new Date().toISOString().split('T')[0],
            lastExecutedBy: this.currentUserName
          };
        }

        if (result === 'Fail' && notesToAdd.trim()) {
          this.createBugFromFailure(this.selectedTest!, notesToAdd.trim());
        }

        this.closeDetails();
        alert(`Test marked as ${result}`);
      },
      error: (err) => {
        console.error(err);
        alert('Failed to update test result: ' + (err.status === 404 ? 'Task not found' : 'Server error'));
      }
    });
  }

  private createBugFromFailure(test: TestCase, failureReason: string) {
    const bugPayload = {
      title: `Test Failure: ${test.title} (${test.id})`,
      description: `**Failed test case**\n\n**Steps:**\n${test.steps.join('\n')}\n\n**Expected:** ${test.expectedResult}\n\n**Failure reason:** ${failureReason}\n\n**Original task:** ${test.id}`,
      priority: test.priority === 'High' ? 'Critical' : test.priority === 'Medium' ? 'High' : 'Medium',
      projectId: '696090e4cebde5f20d1502ff', // ← improve later (fetch from task)
      projectName: 'Website Redesign',       // ← same
      assignees: {
        developer: { name: 'Dev', userId: '6955fc52e20a64470d58813d' }, // ← placeholder
        qa: { name: this.currentUserName, userId: this.currentUserId }
      },
      reportedBy: { name: this.currentUserName, userId: this.currentUserId }
    };

    this.http.post('/api/tasks', bugPayload).subscribe({
      next: () => alert('→ Bug report created!'),
      error: () => alert('Test marked failed, but bug creation failed.')
    });
  }

  // UI helpers
  viewDetails(test: TestCase) {
    this.selectedTest = { ...test };
  }

  closeDetails() {
    this.selectedTest = null;
  }

  get totalTests() { return this.testCases.length; }
  get passedCount() { return this.testCases.filter(t => t.status === 'Pass').length; }
  get failedCount() { return this.testCases.filter(t => t.status === 'Fail').length; }
  get blockedCount() { return this.testCases.filter(t => t.status === 'Blocked').length; }
  get notRunCount() { return this.testCases.filter(t => t.status === 'Not Run').length; }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }
}