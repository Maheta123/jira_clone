import { Component, OnInit, Inject, PLATFORM_ID, ViewEncapsulation} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

interface User {
  _id: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-master-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './master-layout.component.html',
  styleUrls: ['./master-layout.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class MasterLayoutComponent implements OnInit {
  currentUser: User | null = null;
  userName: string = 'Admin'; // fallback

  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Only run localStorage code in the browser
    if (this.isBrowser) {
      this.loadUserFromStorage();
    } else {
      // Server-side: we can't access storage → redirect or set default
      // Most common: just set fallback values (or redirect if critical)
      this.currentUser = null;
      this.userName = 'Admin (SSR)';
    }
  }

  private loadUserFromStorage() {
    try {
      const storedUser = localStorage.getItem('currentUser');

      if (!storedUser) {
        console.warn('No currentUser found in localStorage → logging out');
        this.logout();
        return;
      }

      this.currentUser = JSON.parse(storedUser) as User;

      // Set display name with fallback
      this.userName =
        this.currentUser?.name?.trim() ||
        this.currentUser?.email?.split('@')[0]?.trim() ||
        'Admin';

      // Critical security check: only allow MasterAdmin
      if (this.currentUser?.role !== 'MasterAdmin') {
        console.warn(`Unauthorized access - role is ${this.currentUser?.role}, expected MasterAdmin`);
        this.logout();
        return;
      }

      // Optional: You can also check token validity here if needed
      // const token = localStorage.getItem('token');
      // if (!token) this.logout();

    } catch (error) {
      console.error('Error parsing currentUser from localStorage:', error);
      this.logout();
    }
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    }

    this.currentUser = null;
    this.userName = 'Admin';

    // Use replaceUrl to prevent back-button issues after logout
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  getInitials(name: string | undefined): string {
    if (!name?.trim()) return 'MA';

    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return cleanName.substring(0, 2).toUpperCase();
  }
}