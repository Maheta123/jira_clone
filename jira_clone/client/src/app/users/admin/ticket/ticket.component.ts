import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface User {
  name: string;
  email: string;
  companyCode: string;
  role: string;
  // add more fields if needed
}

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.css']
})
export class TicketComponent implements OnInit {
  ticket = {
    title: '',
    category: 'bug',
    priority: 'medium',
    description: '',
    organization: '',
    userName: ''
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  currentUser: User | null = null;

  categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'access', label: 'Access / Permission Issue' },
    { value: 'billing', label: 'Billing / Payment' },
    { value: 'api', label: 'API / Integration' },
    { value: 'ui/ux', label: 'UI / UX / Design' },
    { value: 'authentication', label: 'Login / Authentication' },
    { value: 'other', label: 'Other' }
  ];

  priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300' }
  ];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {  // Only access localStorage in browser (not SSR)
      const storedUser = localStorage.getItem('currentUser');

      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser) as User;

          this.ticket.userName = 
            this.currentUser.name?.trim() || 
            this.currentUser.email?.split('@')[0]?.trim() || 
            'User';

          this.ticket.organization = 
            this.currentUser.companyCode?.trim() || 
            'My Company';
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      } else {
        console.warn('No logged-in user found - using defaults');
      }
    } else {
      console.warn('Running in SSR mode - skipping localStorage access');
    }
  }

  submitTicket(form: NgForm) {
    if (form.invalid || !this.ticket.title.trim() || !this.ticket.description.trim()) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Ensure raisedBy is never empty
    const raisedByValue = 
      this.currentUser?.email?.trim() ||
      this.currentUser?.name?.trim() ||
      this.ticket.userName?.trim() ||
      'Anonymous User (' + new Date().toLocaleDateString() + ')';

    const ticketData = {
      title: this.ticket.title.trim(),
      category: this.ticket.category,
      priority: this.ticket.priority,
      description: this.ticket.description.trim(),
      raisedBy: raisedByValue,                     // ← guaranteed non-empty
      organization: this.ticket.organization?.trim() || 'Unknown',
      user: this.ticket.userName?.trim() || 'Unknown User'
    };

    console.log('Sending ticket data:', ticketData); // ← DEBUG: check what is sent

    this.http.post('http://localhost:5000/api/tickets', ticketData).subscribe({
      next: (res: any) => {
        this.successMessage = res.message || 'Ticket created successfully!';
        this.isLoading = false;

        // Reset only editable fields
        this.ticket.title = '';
        this.ticket.category = 'bug';
        this.ticket.priority = 'medium';
        this.ticket.description = '';
        form.resetForm({ ...this.ticket }); // keep readonly values
        setTimeout(() => this.successMessage = '', 6000);
      },
      error: (err) => {
        console.error('Ticket error:', err);
        this.errorMessage = err.error?.message || 'Failed to create ticket. Please try again.';
        this.isLoading = false;
      }
    });
  }
}