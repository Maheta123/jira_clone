// src/app/users/master-admin/support-tickets/support-tickets.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface SupportTicket {
  id: string;
  title: string;
  organization: string;
  user: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  category: string;
  submitted: Date;
  lastUpdate: Date;
  assignedTo?: string;
  description?: string;   // ← Added for full view
  raisedBy?: string;      // ← Optional extra info
}

@Component({
  selector: 'app-support-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './support-tickets.component.html',
  styleUrls: ['./support-tickets.component.css']
})
export class SupportTicketsComponent implements OnInit {
  tickets: SupportTicket[] = [];
  filteredTickets: SupportTicket[] = [];
  
  isLoading = true;
  errorMessage: string | null = null;

  searchTerm = '';
  selectedPriority = 'All';
  selectedStatus = 'All';

  // Modal state
  showModal = false;
  selectedTicket: SupportTicket | null = null;
  modalMode: 'view' | 'edit' = 'view';  // 'view' or 'edit'
  newStatus: string = '';               // For edit mode

  // Stats
  get totalTickets(): number { return this.tickets.length; }
  get openTickets(): number { 
    return this.tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length; 
  }
  get criticalTickets(): number { 
    return this.tickets.filter(t => t.priority === 'Critical').length; 
  }
  get resolvedToday(): number { 
    return this.tickets.filter(t => t.status === 'Resolved' && this.isToday(t.lastUpdate)).length; 
  }

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.get<any>('http://localhost:5000/api/tickets').subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.tickets)) {
          this.tickets = response.tickets.map((t: any) => ({
            id: t.id,
            title: t.title,
            organization: t.organization || 'Unknown Org',
            user: t.user || 'Unknown',
            priority: t.priority as 'Low' | 'Medium' | 'High' | 'Critical',
            status: t.status as 'Open' | 'In Progress' | 'Resolved' | 'Closed',
            category: t.category,
            submitted: new Date(t.submitted),
            lastUpdate: new Date(t.lastUpdate),
            assignedTo: t.assignedTo,
            description: t.description || 'No description provided',
            raisedBy: t.raisedBy
          }));
          
          this.filteredTickets = [...this.tickets];
          this.filterTickets();
        } else {
          this.errorMessage = 'Invalid response format from server';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.errorMessage = 'Failed to load tickets. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  openViewModal(ticket: SupportTicket) {
    this.selectedTicket = { ...ticket };
    this.modalMode = 'view';
    this.showModal = true;
  }

  openEditModal(ticket: SupportTicket) {
    this.selectedTicket = { ...ticket };
    this.newStatus = ticket.status; // Pre-select current status
    this.modalMode = 'edit';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedTicket = null;
    this.newStatus = '';
  }

  saveStatus() {
    if (!this.selectedTicket || !this.newStatus) return;

    this.http.put<any>(`http://localhost:5000/api/tickets/${this.selectedTicket.id}`, { status: this.newStatus.toLowerCase().replace(' ', '-') })
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update local tickets with new data
            const updatedTickets = this.tickets.map(t => 
              t.id === this.selectedTicket!.id ? { ...t, status: response.ticket.status as any, lastUpdate: new Date(response.ticket.lastUpdate) } : t
            );
            this.tickets = updatedTickets;
            this.filteredTickets = [...this.tickets];
            this.filterTickets();

           
            this.closeModal();
          } else {
            alert('Failed to update status: ' + response.message);
          }
        },
        error: (err) => {
          console.error('Status update error:', err);
          alert('Error updating status. Please try again.');
        }
      });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  filterTickets() {
    this.filteredTickets = this.tickets.filter(ticket => {
      const matchesSearch = this.searchTerm === '' ||
        ticket.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        ticket.organization.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        ticket.user.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesPriority = this.selectedPriority === 'All' || ticket.priority === this.selectedPriority;
      const matchesStatus = this.selectedStatus === 'All' || ticket.status === this.selectedStatus;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }

  getPriorityClass(priority: string): string {
    return 'priority-' + priority.toLowerCase();
  }

  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace(' ', '-');
  }
}