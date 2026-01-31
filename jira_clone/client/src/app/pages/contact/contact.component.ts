import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {

  selectedPurpose: 'contact' | 'feedback' = 'contact';

  formData = {
    name: '',
    email: '',
    subject: '',
    rating: 0,
    category: '',
    message: '',
    type: 'contact' as 'contact' | 'feedback'
  };

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('✅ ContactComponent loaded');
  }

  selectPurpose(purpose: 'contact' | 'feedback') {
    console.log('🔄 Tab switched to:', purpose);
    this.selectedPurpose = purpose;
    this.formData.type = purpose;
    this.clearMessages();
  }

  submitForm() {
    console.log('🚀 submitForm() triggered');
    console.log('📦 Form Data BEFORE validation:', this.formData);

    this.clearMessages();

    if (!this.formData.name.trim() ||
        !this.formData.email.trim() ||
        !this.formData.message.trim()) {

      console.error('❌ Validation failed: required fields missing');
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
      console.error('❌ Invalid email format');
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;

    console.log('📡 Sending HTTP POST to backend...');
    console.log('➡️ URL: http://localhost:5000/api/messages');
    console.log('➡️ Payload:', this.formData);

    this.http.post<any>('http://localhost:5000/api/messages', this.formData)
      .subscribe({
        next: (res) => {
          console.log('✅ Server response:', res);

          this.successMessage =
            res?.message || 'Thank you! Your submission was successful.';

          this.isLoading = false;
          this.resetForm();
        },
        error: (err) => {
          console.error('🔥 HTTP ERROR:', err);

          let msg = 'Submission failed. Please try again.';

          if (err.status === 0) {
            msg = '❌ Cannot reach backend. Is server running on port 5000?';
          } else if (err.status === 404) {
            msg = '❌ API route /api/messages not found';
          } else if (err.error?.message) {
            msg = err.error.message;
          }

          this.errorMessage = msg;
          this.isLoading = false;
        }
      });
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private resetForm() {
    console.log('🔁 Resetting form after success');

    setTimeout(() => {
      this.formData = {
        name: '',
        email: '',
        subject: '',
        rating: 0,
        category: '',
        message: '',
        type: this.selectedPurpose
      };

      this.successMessage = '';
      console.log('✅ Form reset completed');
    }, 3000);
  }
}
