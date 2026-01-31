// src/app/project-board/project-board.component.ts (Final version: includes description, improved error handling)
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  DragDropModule
} from '@angular/cdk/drag-drop';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Task {
  id: string;               // taskKey
  title: string;
  description?: string;     // Added optional description
  assignee: string;
  priority: string;
  projectId: string;
  projectName: string;
  status: string;
}

interface Column {
  name: string;
  key: string;
  tasks: Task[];
  statusValue: string;
}

interface Project {
  _id: string;
  name: string;
}

@Component({
  selector: 'app-project-board',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './project-board.component.html',
  styleUrls: ['./project-board.component.css']
})
export class ProjectBoardComponent implements OnInit {

  searchQuery = '';
  selectedProject = '';

  projects: Project[] = [];
  allTasks: Task[] = [];

  columns: Column[] = [
    { name: 'To Do', key: 'todo', tasks: [], statusValue: 'todo' },
    { name: 'In Progress', key: 'inprogress', tasks: [], statusValue: 'inprogress' },
    { name: 'Done', key: 'done', tasks: [], statusValue: 'done' }
  ];

  filteredColumns: Column[] = [];

  private apiBase = 'http://localhost:5000';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Add these properties
  showEditModal = false;
  selectedTask: Task | null = null;

  // Optional: keep original task to allow cancel (revert changes)
  private originalTask: Task | null = null;

  // ────────────────────────────────────────────────

  openEditModal(task: Task) {
    this.selectedTask = { ...task };           // deep copy
    this.originalTask = { ...task };           // backup for cancel
    this.showEditModal = true;
  }

  closeEditModal() {
    if (this.originalTask && this.selectedTask) {
      // Optional: revert changes if user cancels
      Object.assign(this.selectedTask, this.originalTask);
    }
    this.showEditModal = false;
    this.selectedTask = null;
    this.originalTask = null;
  }

  saveTask() {
    if (!this.selectedTask) return;

    const url = `${this.apiBase}/api/project-manager/tasks/${this.selectedTask.id}`;
    const payload = {
      title: this.selectedTask.title,
      description: this.selectedTask.description,  // Added
      priority: this.selectedTask.priority,
      // add more fields when you implement them in backend
    };

    console.log('Updating task → URL:', url);
    console.log('Payload:', payload);
    console.log('Selected task full object:', this.selectedTask);

    this.http.put<any>(url, payload, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          console.log('Update success:', res);
          if (res.success) {
            const taskIndex = this.allTasks.findIndex(t => t.id === this.selectedTask!.id);
            if (taskIndex !== -1) {
              this.allTasks[taskIndex] = { ...this.selectedTask! };
            }
            this.loadTasksIntoColumns(); // refresh columns
            this.showEditModal = false;
          }
        },
        error: (err) => {
          console.error('Update failed full error:', err);
          let message = 'Failed to update task. Please try again.';
          if (err.status === 404) {
            message = `Task "${this.selectedTask?.id}" not found on server.`;
          } else if (err.status === 403) {
            message = 'You are not authorized to update this task.';
          } else if (err.error && err.error.message) {
            message = err.error.message;
          }
          alert(message);
          // You could revert here if needed
        }
      });
  }

  /* =========================
     Lifecycle
  ========================= */

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadProjects();
      this.loadTasks();
    }
  }

  /* =========================
     Helpers
  ========================= */

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /* =========================
     Load Data
  ========================= */

  private loadProjects() {
    this.http.get<any>(
      `${this.apiBase}/api/project-manager/projects`,
      { headers: this.getHeaders() }
    ).subscribe(res => {
      if (res.success) {
        this.projects = res.projects.map((p: any) => ({
          _id: p._id,
          name: p.name
        }));
      }
    });
  }

  private loadTasks() {
    this.http.get<any>(
      `${this.apiBase}/api/project-manager/tasks`,
      { headers: this.getHeaders() }
    ).subscribe(res => {
      if (res.success) {
        this.allTasks = res.tasks;
        this.loadTasksIntoColumns();
      }
    });
  }

  /* =========================
     Kanban Logic
  ========================= */

  loadTasksIntoColumns() {
    this.columns.forEach(col => (col.tasks = []));

    this.allTasks.forEach(task => {
      const column = this.columns.find(c => c.statusValue === task.status);
      if (column) {
        column.tasks.push(task);
      }
    });

    this.applyFilters();
  }

  getConnectedListIds(): string[] {
    return this.columns.map(col => col.key);
  }

  drop(event: CdkDragDrop<Task[]>) {
    const sourceColumn = this.columns.find(col => col.key === event.previousContainer.id);
    const targetColumn = this.columns.find(col => col.key === event.container.id);

    if (!sourceColumn || !targetColumn) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(sourceColumn.tasks, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        sourceColumn.tasks,
        targetColumn.tasks,
        event.previousIndex,
        event.currentIndex
      );

      const movedTask = targetColumn.tasks[event.currentIndex];
      if (movedTask) {
        movedTask.status = targetColumn.statusValue;
        this.updateTaskStatus(movedTask);
      }
    }

    this.applyFilters();
  }

  /* =========================
     Filters
  ========================= */

  applyFilters() {
    let filteredTasks = [...this.allTasks];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }

    if (this.selectedProject) {
      filteredTasks = filteredTasks.filter(t => t.projectId === this.selectedProject);
    }

    this.filteredColumns = this.columns.map(col => ({
      ...col,
      tasks: col.tasks.filter(task => filteredTasks.includes(task))
    }));
  }

  /* =========================
     Persist Drag & Drop
  ========================= */

  private updateTaskStatus(task: Task) {
    this.http.put<any>(
      `${this.apiBase}/api/project-manager/tasks/${task.id}/status`,
      { status: task.status },
      { headers: this.getHeaders() }
    ).subscribe({
      error: (err) => {
        console.error('Failed to update task status:', err);
       
      }
    });
  }
}