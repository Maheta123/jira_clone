import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface ApiTask {
  id: string;
  title: string;
  project: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  assignee: string;
  reported: string;
  resolved: string;
  developerName: string;
  qaName: string;
  description: string;
}

interface Bug {
  id: string;
  title: string;
  project: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  assignee: string;
  reported: string;
  resolved: string;
  developerName: string;
  qaName: string;
  description: string;
}

@Component({
  selector: 'app-my-bugs',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './my-bugs.component.html',
  styleUrl: './my-bugs.component.css'
})
export class MyBugsComponent implements OnInit {
  myBugs: Bug[] = [];
  loading = true;
  error: string | null = null;
  currentQaName: string = '';

  showModal = false;
  modalType: 'pass' | 'reopen' | null = null;
  editingBug: Bug | null = null;
  comments: string = '';

  showCommentsModal = false;
  commentText: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      this.error = 'No user data found.';
      this.loading = false;
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      this.currentQaName = user.name?.trim() || '';
      if (!this.currentQaName) {
        this.error = 'Invalid user data.';
        this.loading = false;
        return;
      }
    } catch (err) {
      this.error = 'Error parsing user data.';
      this.loading = false;
      return;
    }

    this.loadBugs();
  }

  loadBugs() {
    this.loading = true;
    this.error = null;

    this.http.get<ApiTask[]>('http://localhost:5000/api/tasks').subscribe({
      next: data => {
        this.myBugs = data.filter(bug => bug.qaName === this.currentQaName).map(bug => ({
          ...bug,
          severity: bug.priority,
          assignee: bug.developerName,
          description: bug.description || '',
          resolved: bug.resolved || ''
        }));
        this.loading = false;
      },
      error: err => {
        let msg = 'Failed to load bugs.';
        if (err.status === 0) msg += ' Backend unreachable.';
        if (err.status === 404) msg += ' API route not found.';
        if (err.status >= 500) msg += ' Server error.';
        this.error = msg;
        this.loading = false;
      }
    });
  }

  formatStatus(status: string): string {
    if (status === 'todo') return 'Fixed - Ready for Testing';
    if (status === 'inprogress') return 'In Verification';
    if (status === 'done') return 'Resolved';
    return status;
  }

  onRetest(bug: Bug) {
    this.updateBug(bug.id, { status: 'inprogress' });
  }

  onPass(bug: Bug) {
    this.editingBug = bug;
    this.modalType = 'pass';
    this.comments = '';
    this.showModal = true;
  }

  onReopen(bug: Bug) {
    this.editingBug = bug;
    this.modalType = 'reopen';
    this.comments = '';
    this.showModal = true;
  }

  viewComments(bug: Bug) {
    this.editingBug = bug;
    this.commentText = bug.description || 'No comments yet.';
    this.showCommentsModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingBug = null;
    this.modalType = null;
    this.comments = '';
  }

  closeCommentsModal() {
    this.showCommentsModal = false;
    this.editingBug = null;
    this.commentText = '';
  }

  saveChanges() {
    if (!this.editingBug || !this.modalType) return;

    const appendText = this.modalType === 'pass' 
      ? `\nQA Pass Comments (${new Date().toLocaleString()}): ${this.comments.trim()}`
      : `\nQA Reopen Reason (${new Date().toLocaleString()}): ${this.comments.trim()}`;

    const newDesc = this.editingBug.description 
      ? `${this.editingBug.description}\n${appendText}`
      : appendText;

    const payload: any = {
      status: this.modalType === 'pass' ? 'done' : 'todo',
      description: newDesc,
      assignees: { qa: { name: '' } }
    };

    console.log('Sending payload:', payload);

    this.updateBug(this.editingBug.id, payload);
    this.closeModal();
  }

  private updateBug(id: string, payload: any) {
    this.http.put(`http://localhost:5000/api/tasks/${id}`, payload).subscribe({
      next: (res: any) => {
        const updated = res.task;
        const index = this.myBugs.findIndex(b => b.id === updated.id);
        if (index !== -1) {
          this.myBugs[index] = {
            ...updated,
            severity: updated.priority,
            assignee: updated.developerName,
            description: updated.description || '',
            resolved: updated.resolved || ''
          };
        }
        // Reload bugs to reflect changes
        this.loadBugs();
      },
      error: err => {
        console.error('Update error:', err);
        alert(err.error?.message || 'Update failed');
      }
    });
  }
}