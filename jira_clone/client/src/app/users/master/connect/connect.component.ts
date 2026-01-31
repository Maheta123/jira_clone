import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule, DatePipe, SlicePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  _id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  type: 'contact' | 'feedback';
  rating: number;
  createdAt: string;
}

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule, DatePipe, SlicePipe, TitleCasePipe, FormsModule],
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.css']
})
export class ConnectComponent implements OnInit {
  originalMessages: Message[] = [];
  messages: Message[] = [];
  loading = true;
  error: string | null = null;

  searchTerm = '';
  selectedType: 'all' | 'contact' | 'feedback' = 'all';

  private apiUrl = 'http://localhost:5000/api/messages';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading = true;
    this.error = null;

    this.http.get<Message[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.originalMessages = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Load error:', err);
        this.error = `Failed to load messages: ${err.status} ${err.statusText}`;
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.originalMessages];

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(m => m.type === this.selectedType);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        (m.subject?.toLowerCase().includes(term)) ||
        m.message.toLowerCase().includes(term)
      );
    }

    this.messages = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onTypeChange(): void {
    this.applyFilters();
  }

  // FIXED DELETE FUNCTION
  deleteMessage(id: string): void {
    if (!confirm('Delete this message permanently? This cannot be undone.')) {
      return;
    }

    // Show immediate feedback
    const index = this.messages.findIndex(m => m._id === id);
    if (index !== -1) {
      this.messages.splice(index, 1); // Optimistic UI update
    }

    this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`).subscribe({
      next: (response) => {
        console.log('Deleted successfully:', response);
        // Remove from original list too
        this.originalMessages = this.originalMessages.filter(m => m._id !== id);
        this.applyFilters();
        // Optional: show success toast (we use alert for simplicity)
        // alert('Message deleted successfully');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Delete failed:', err);
        alert(`Failed to delete: ${err.status} - ${err.error?.message || err.message}`);
        // Revert optimistic update
        this.loadMessages(); // Reload to sync with server
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}