// src/app/subscription-plans/subscription-plans.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isActive: boolean;
  organizationsCount: number;
}

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.css']
})
export class SubscriptionPlansComponent implements OnInit {
  plans: Plan[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  isModalOpen = false;
  editingPlan: Plan | null = null;
  newPlan: Plan = this.getEmptyPlan();
  currentFeature = '';

  constructor(private http: HttpClient) {}

  private getEmptyPlan(): Plan {
    return {
      id: '',
      name: '',
      priceMonthly: 0,
      priceYearly: 0,
      features: [],
      isActive: true,
      organizationsCount: 0
    };
  }

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.get<any>('http://localhost:5000/api/plans').subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.plans)) {
          this.plans = response.plans.map((p: any) => ({
            id: p.id,
            name: p.name || '',
            priceMonthly: p.priceMonthly || 0,
            priceYearly: p.priceYearly || 0,
            features: p.features || [],
            isActive: p.isActive !== false,
            organizationsCount: p.organizationsCount || 0
          }));
        } else {
          this.errorMessage = 'Invalid response from server';
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load plans. Is the server running?';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  openModal(plan?: Plan) {
    if (plan) {
      this.editingPlan = plan;
      this.newPlan = { ...plan, features: [...plan.features] };
    } else {
      this.editingPlan = null;
      this.newPlan = this.getEmptyPlan();
    }
    this.currentFeature = '';
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingPlan = null;
  }

  addFeature() {
    if (this.currentFeature.trim()) {
      this.newPlan.features.push(this.currentFeature.trim());
      this.currentFeature = '';
    }
  }

  removeFeature(index: number) {
    this.newPlan.features.splice(index, 1);
  }

  savePlan() {
    if (!this.newPlan.name.trim()) {
      alert('Plan name is required');
      return;
    }
    if (this.newPlan.priceMonthly < 0 || this.newPlan.priceYearly < 0) {
      alert('Prices cannot be negative');
      return;
    }

    const payload = {
      name: this.newPlan.name.trim(),
      priceMonthly: this.newPlan.priceMonthly,
      priceYearly: this.newPlan.priceYearly,
      features: this.newPlan.features,
      isActive: this.newPlan.isActive
    };

    const request = this.editingPlan
      ? this.http.patch(`http://localhost:5000/api/plans/${this.editingPlan.id}`, payload)
      : this.http.post('http://localhost:5000/api/plans', payload);

    request.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadPlans();
          alert(`Plan "${this.newPlan.name}" saved successfully!`);
          this.closeModal();
        } else {
          alert('Failed to save plan');
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Server error while saving plan');
      }
    });
  }

  togglePlanStatus(plan: Plan) {
    if (!confirm(`Really toggle status of "${plan.name}"?`)) return;

    this.http.patch(`http://localhost:5000/api/plans/${plan.id}`, { isActive: !plan.isActive })
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            plan.isActive = !plan.isActive;
            alert(`Plan "${plan.name}" is now ${plan.isActive ? 'Active' : 'Inactive'}`);
          }
        },
        error: () => alert('Failed to update status')
      });
  }
}