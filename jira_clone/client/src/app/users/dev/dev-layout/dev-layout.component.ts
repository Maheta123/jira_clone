// src/app/users/dev/dev-layout/dev-layout.component.ts
import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dev-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dev-layout.component.html',
  styleUrls: ['./dev-layout.component.css'],
  encapsulation: ViewEncapsulation.None  // Important: overrides/hides public navbar
})
export class DevLayoutComponent implements OnInit {
  currentUserName: string = 'Developer';

  constructor(private router: Router) {}

  ngOnInit() {
    // Try to load user from localStorage (adjust key if different)
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserName = user.name?.trim() || 'Developer';
      } catch (e) {
        console.warn('Failed to parse currentUser', e);
      }
    } else {
      // No user → redirect to login
      this.router.navigate(['/login']);
    }
  }

  logout() {
    // Clear authentication data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');           // if you store JWT
    // localStorage.clear();                    // aggressive option (if safe)

    // Redirect to login or home
    this.router.navigate(['/login']);
  }
}