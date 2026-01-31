import {
  Component,
  OnInit,
  ViewEncapsulation,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface User {
  _id: string;
  name: string;
  email: string;
  companyCode: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-qa-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './qa-layout.component.html',
  styleUrls: ['./qa-layout.component.css'],
  encapsulation: ViewEncapsulation.None   // ← Important: hides default/public navbar
})
export class QaLayoutComponent implements OnInit {

  currentUser: User | null = null;
  userName: string = 'QA Tester';
  userInitials: string = 'QA';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Prevent SSR crash
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      this.logout();
      return;
    }

    try {
      this.currentUser = JSON.parse(storedUser) as User;

      // Set display name
      this.userName =
        this.currentUser.name?.trim() ||
        this.currentUser.email?.split('@')[0]?.trim() ||
        'QA Tester';

      // Set initials for avatar
      this.userInitials = this.getInitials(this.userName);

      // Role check – adjust according to your actual role value
      if (this.currentUser.role !== 'QATester' && this.currentUser.role !== 'QA') {
        console.warn('Unauthorized access attempt – not QA/QATester role');
        this.logout();
      }

    } catch (error) {
      console.error('Invalid stored user data:', error);
      this.logout();
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    }

    this.router.navigate(['/login'], { replaceUrl: true });
  }

  getInitials(name: string): string {
    if (!name?.trim()) return 'QA';

    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  }
}