import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';

interface BugReport {
  id: string;
  title: string;
  description: string;
  steps: string;
  severity: string;
  status: string;
  browser?: string;
  os?: string;
  reportedDate: string;
  projectId: string;
  projectName: string;
  assignees: any;
  reportedBy?: { userId?: string; name: string };
  resolved?: string;
}

interface Project { id: string; name: string; }
interface Developer { userId: string; name: string; }

@Component({
  selector: 'app-report-bug',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './report-bug.component.html',
  styleUrls: ['./report-bug.component.css']
})
export class ReportBugComponent implements OnInit {
  allBugReports: BugReport[] = [];                // raw data
  displayedBugReports: BugReport[] = [];          // filtered & shown

  projects: Project[] = [];
  developers: Developer[] = [];

  currentBug: Partial<BugReport> = {};
  selectedDeveloperId = '';
  editingIndex: number | null = null;
  isFormVisible = false;
  showSuccess = false;

  currentUserName = 'Temp';
  currentUserId = '';
  currentProjects: string[] = [];

  // Filters
  selectedProjectId: string = '';                 // '' = all projects
  selectedView: 'all' | 'reported' | 'assigned' = 'all';

  showModal = false;
  modalType: 'pass' | 'reopen' | 'resolve' | null = null;
  editingBug: BugReport | null = null;
  comments = '';

  showCommentsModal = false;
  commentText = '';

  loading = true;
  error: string | null = null;

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
        this.currentUserName = u.name?.trim() || 'Temp';
        this.currentUserId = (u._id || u.id || '').toString().trim();
        this.currentProjects = u.currentProjects || [];
      } catch {}
    }

    this.loadProjects();
  }

  loadProjects() {
    this.http.get<Project[]>('/api/tasks/projects').subscribe({
      next: data => {
        this.projects = data.filter(p => 
          this.currentProjects.some(cid => cid.toString() === p.id.toString())
        );
        this.loadAllBugs();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load projects:', err);
        this.error = 'Failed to load projects. Check if server is running and API is accessible.';
        this.loading = false;
      }
    });
  }

  loadAllBugs() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>('/api/tasks').subscribe({
      next: raw => {
        this.allBugReports = raw.map(bug => ({
          id: bug.id || bug.taskKey || '—',
          title: bug.title || '(no title)',
          description: bug.description || '',
          steps: bug.steps || '',
          severity: (bug.priority || 'Medium').toLowerCase(),
          status: bug.status || 'todo',
          browser: bug.browser || '',
          os: bug.os || '',
          reportedDate: bug.reported || '',
          projectId: bug.projectId?.toString() || '',
          projectName: bug.projectName || bug.project || '—',
          assignees: bug.assignees || {},
          reportedBy: bug.reportedBy || { name: 'Unknown' },
          resolved: bug.resolved || ''
        }));

        this.applyFilters();
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load bugs:', err);
        this.error = 'Failed to load bugs. Check server and API.';
        this.loading = false;
      }
    });
  }

  applyFilters() {
    let filtered = [...this.allBugReports];

    // 1. Project filter
    if (this.selectedProjectId) {
      filtered = filtered.filter(b => b.projectId === this.selectedProjectId);
    }

    // 2. View filter (Reported / Assigned)
    if (this.selectedView === 'reported') {
      filtered = filtered.filter(b => b.reportedBy?.userId?.toString() === this.currentUserId);
    } else if (this.selectedView === 'assigned') {
      filtered = filtered.filter(b => 
        b.assignees?.developer?.userId?.toString() === this.currentUserId ||
        b.assignees?.qa?.userId?.toString() === this.currentUserId
      );
    }
    // 'all' → no additional filter

    this.displayedBugReports = filtered;
  }

  // Filter change handlers
  onProjectChange() {
    this.applyFilters();
  }

  onViewChange(view: 'all' | 'reported' | 'assigned') {
    this.selectedView = view;
    this.applyFilters();
  }

  // ─────────────────────────────────────────────────────────────
  //  Below are your original full features — just keep them
  // ─────────────────────────────────────────────────────────────

  newBug() {
    this.editingIndex = null;
    this.currentBug = {
      title: '',
      description: '',
      steps: '',
      severity: 'medium',
      status: 'todo',
      browser: '',
      os: '',
      projectId: '',
      assignees: {}
    };
    this.selectedDeveloperId = '';
    this.developers = [];
    this.isFormVisible = true;
  }

  editBug(index: number) {
    this.editingIndex = index;
    const bug = this.displayedBugReports[index];
    this.currentBug = { ...bug };
    this.selectedDeveloperId = bug.assignees?.developer?.userId || '';
    if (bug.projectId) this.loadDevelopers(bug.projectId);
    this.isFormVisible = true;
  }

  cancelEdit() {
    this.isFormVisible = false;
    this.currentBug = {};
    this.selectedDeveloperId = '';
    this.developers = [];
  }

  onSubmit() {
    if (!this.currentBug.title || !this.currentBug.description || !this.currentBug.steps ||
        !this.currentBug.severity || !this.currentBug.projectId) {
      alert('Please fill all required fields');
      return;
    }

    const payload: any = {
      title: this.currentBug.title.trim(),
      description: this.currentBug.description.trim(),
      steps: this.currentBug.steps.trim(),
      priority: this.currentBug.severity.charAt(0).toUpperCase() + this.currentBug.severity.slice(1),
      status: this.currentBug.status || 'todo',
      browser: this.currentBug.browser?.trim() || '',
      os: this.currentBug.os?.trim() || '',
      projectId: this.currentBug.projectId,
      projectName: this.projects.find(p => p.id === this.currentBug.projectId)?.name || '',
      assignees: {
        developer: this.selectedDeveloperId ? {
          userId: this.selectedDeveloperId,
          name: this.developers.find(d => d.userId === this.selectedDeveloperId)?.name || ''
        } : undefined,
        qa: {
          userId: this.currentUserId,
          name: this.currentUserName
        }
      }
    };

    if (this.editingIndex === null) {
      payload.reportedBy = {
        userId: this.currentUserId,
        name: this.currentUserName
      };
    }

    const req = this.editingIndex === null
      ? this.http.post('/api/tasks', payload)
      : this.http.put(`/api/tasks/${this.displayedBugReports[this.editingIndex].id}`, payload);

    req.subscribe({
      next: () => {
        this.loadAllBugs();
        this.isFormVisible = false;
        this.showSuccess = true;
        setTimeout(() => this.showSuccess = false, 3000);
      },
      error: err => {
        console.error('Save failed:', err);
        alert('Failed to save bug');
      }
    });
  }

  deleteBug(index: number) {
    if (!confirm('Delete this bug permanently?')) return;
    const id = this.displayedBugReports[index].id;
    this.http.delete(`/api/tasks/${id}`).subscribe({
      next: () => this.loadAllBugs(),
      error: () => alert('Delete failed')
    });
  }

  onStart(bug: BugReport) {
    this.updateStatus(bug.id, 'inprogress');
  }

  onResolve(bug: BugReport) {
    this.editingBug = bug;
    this.modalType = 'resolve';
    this.comments = '';
    this.showModal = true;
  }

  onRetest(bug: BugReport) {
    this.updateStatus(bug.id, 'inprogress');
  }

  onPass(bug: BugReport) {
    this.editingBug = bug;
    this.modalType = 'pass';
    this.comments = '';
    this.showModal = true;
  }

  onReopen(bug: BugReport) {
    this.editingBug = bug;
    this.modalType = 'reopen';
    this.comments = '';
    this.showModal = true;
  }

  viewComments(bug: BugReport) {
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

    let appendText = '';
    let newStatus = this.editingBug.status;

    const ts = new Date().toLocaleString();

    if (this.modalType === 'pass') {
      appendText = `\nQA Pass (${ts}): ${this.comments.trim()}`;
      newStatus = 'done';
    } else if (this.modalType === 'reopen') {
      appendText = `\nReopened by QA (${ts}): ${this.comments.trim()}`;
      newStatus = 'todo';
    } else if (this.modalType === 'resolve') {
      appendText = `\nResolved by Dev (${ts}): ${this.comments.trim()}`;
      newStatus = 'todo';
    }

    const newDesc = (this.editingBug.description || '') + appendText;

    this.http.put(`/api/tasks/${this.editingBug.id}`, {
      description: newDesc,
      status: newStatus
    }).subscribe({
      next: () => {
        this.loadAllBugs();
        this.closeModal();
      },
      error: () => alert('Update failed')
    });
  }

  private updateStatus(id: string, status: string) {
    this.http.put(`/api/tasks/${id}`, { status }).subscribe({
      next: () => this.loadAllBugs(),
      error: () => alert('Status update failed')
    });
  }

  loadDevelopers(projectId: string) {
    if (!projectId) return;
    this.http.get<Developer[]>(`/api/tasks/developers/${projectId}`).subscribe({
      next: d => this.developers = d,
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load developers:', err);
        this.developers = [];
        alert('Failed to load developers for this project');
      }
    });
  }

  formatAssignees(a: any): string {
    if (!a) return 'Unassigned';
    const parts: string[] = [];
    if (a.developer?.name) parts.push(a.developer.name);
    if (a.qa?.name) parts.push(`QA: ${a.qa.name}`);
    return parts.length ? parts.join(', ') : 'Unassigned';
  }

  formatStatus(s: string): string {
    switch (s) {
      case 'todo': return 'To Do';
      case 'inprogress': return 'In Progress';
      case 'done': return 'Done';
      default: return s;
    }
  }
}