import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

type TaskStatus = 'todo' | 'inprogress' | 'done';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface Issue {
  id: string;                 // ← taskKey
  title: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  developerName: string;
  qaName: string;
}

@Component({
  selector: 'app-issues',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './issues.component.html',
  styleUrls: ['./issues.component.css']
})
export class IssuesComponent implements OnInit {

  issues: Issue[] = [];
  loading = true;
  error: string | null = null;

  showEditModal = false;
  editingIssue: Issue | null = null;

  editForm = {
    title: '',
    priority: 'Medium' as TaskPriority,
    status: 'todo' as TaskStatus,
    developerName: '',
    qaName: ''
  };

  priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

  statuses = [
    { value: 'todo', label: 'To Do' },
    { value: 'inprogress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadIssues();
  }

  loadIssues() {
    this.loading = true;
    this.error = null;

    this.http.get<Issue[]>('http://localhost:5000/api/tasks').subscribe({
      next: data => {
        this.issues = data;
        this.loading = false;
      },
      error: err => {
        let msg = 'Failed to load issues.';
        if (err.status === 0) msg += ' Backend unreachable.';
        if (err.status === 404) msg += ' API route not found.';
        if (err.status >= 500) msg += ' Server error.';
        this.error = msg;
        this.loading = false;
      }
    });
  }

  formatStatus(status: TaskStatus) {
    return this.statuses.find(s => s.value === status)?.label || status;
  }

  openEditModal(issue: Issue) {
    this.editingIssue = issue;
    this.editForm = {
      title: issue.title,
      priority: issue.priority,
      status: issue.status,
      developerName: issue.developerName,
      qaName: issue.qaName
    };
    this.showEditModal = true;
  }

  closeModal() {
    this.showEditModal = false;
    this.editingIssue = null;
  }

  saveChanges() {
    if (!this.editingIssue) return;

    const payload: any = {
      title: this.editForm.title.trim(),
      priority: this.editForm.priority,
      status: this.editForm.status,
      assignees: {}
    };

    if (this.editForm.developerName.trim()) {
      payload.assignees.developer = {
        name: this.editForm.developerName.trim()
      };
    }

    if (this.editForm.qaName.trim()) {
      payload.assignees.qa = {
        name: this.editForm.qaName.trim()
      };
    }

    if (Object.keys(payload.assignees).length === 0) {
      delete payload.assignees;
    }

    this.http.put(`http://localhost:5000/api/tasks/${this.editingIssue.id}`, payload).subscribe({
      next: (res: any) => {
        const updated = res.task;

        const index = this.issues.findIndex(i => i.id === updated.id);
        if (index !== -1) {
          this.issues[index] = updated;
        }

        this.closeModal();
      },
      error: err => {
        alert(err.error?.message || 'Update failed');
      }
    });
  }
}