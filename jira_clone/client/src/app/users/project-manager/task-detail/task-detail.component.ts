// src/app/users/project-manager/task-detail/task-detail.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.css']
})
export class TaskDetailComponent {
  taskId = 'TASK-101'; // In real app, get from route param
  task = {
    title: 'Design new dashboard',
    project: 'E-commerce Platform',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Sarah Designer',
    description: 'Create modern dashboard with charts, stats, and quick actions. Use Angular Material components.',
    dueDate: '2025-12-30'
  };
}