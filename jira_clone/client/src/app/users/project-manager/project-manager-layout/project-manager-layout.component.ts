import { Component, OnInit, ViewEncapsulation, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// ... your User interface ...
interface User {
  _id: string;
  name: string;
  email: string;
  companyCode?: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-project-manager-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './project-manager-layout.component.html',
  styleUrls: ['./project-manager-layout.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ProjectManagerLayoutComponent implements OnInit {

  currentUser: User | null = null;
  userName: string = 'Project Manager';
  userInitials: string = 'PM';

  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Only try to read localStorage in the browser
    if (!this.isBrowser) {
      return;
    }

    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      this.logout();
      return;
    }

    try {
      this.currentUser = JSON.parse(storedUser) as User;

      this.userName =
        this.currentUser.name?.trim() ||
        this.currentUser.email?.split('@')[0]?.trim() ||
        'Project Manager';

      this.userInitials = this.getInitials(this.userName);

      const allowedRoles = ['ProjectManager', 'PM', 'Manager', 'Admin'];

      if (!allowedRoles.includes(this.currentUser.role)) {
        console.warn(`Unauthorized - role: ${this.currentUser.role}`);
        this.logout();
      }
    } catch (e) {
      console.error('Invalid user data in localStorage', e);
      this.logout();
    }
  }

  logout() {
    // Also protect logout
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    }

    this.router.navigate(['/login'], { replaceUrl: true });
  }

  getInitials(name: string): string {
    if (!name?.trim()) return 'PM';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }
}