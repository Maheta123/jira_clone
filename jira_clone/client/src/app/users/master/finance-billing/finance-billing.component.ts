import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Invoice {
  id: string;
  organization: string;
  plan: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface MrrDataPoint {
  month: string;
  amount: number;
}

interface InvoiceDetail {
  invoiceId: string;
  organization: string;
  planName?: string;
  plan?: string;
  billingCycle?: string;
  amount: number;
  formattedDate: string;
  formattedEndDate: string;
  status: string;
}

interface NewInvoiceForm {
  organization: string;
  plan: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
}

@Component({
  selector: 'app-finance-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance-billing.component.html',
  styleUrls: ['./finance-billing.component.css']
})
export class FinanceBillingComponent implements OnInit, AfterViewInit {
  totalRevenue = 0;
  mrr = 0;
  newSubscriptions = 0;
  churnRate = 0;

  invoices: Invoice[] = [];
  mrrData: MrrDataPoint[] = [];
  error: string | null = null;

  // View Modal
  showViewModal = false;
  selectedInvoice: InvoiceDetail | null = null;
  modalLoading = false;

  // Generate Modal
  showGenerateModal = false;
  newInvoiceForm: NewInvoiceForm = {
    organization: '',
    plan: 'Starter',
    amount: 0,
    billingCycle: 'monthly'
  };
  generateLoading = false;
  generateError: string | null = null;

  // Dynamic Y-axis
  yAxisLabels: string[] = ['$0', '$200', '$400', '$600', '$800'];
  maxYValue = 800;

  @ViewChildren('barElement') barElements!: QueryList<ElementRef>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  refreshData(): void {
    const url = 'http://localhost:5000/api/billing/dashboard?t=' + new Date().getTime();
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.processDashboardData(data);
      },
      error: (err) => {
        this.error = 'Refresh failed. Check console.';
        console.error(err);
      }
    });
  }

  loadData(): void {
    this.http.get<any>('http://localhost:5000/api/billing/dashboard').subscribe({
      next: (data) => {
        this.processDashboardData(data);
        this.error = null;
      },
      error: (err) => {
        console.error('Failed to load billing data', err);
        this.error = 'Failed to load dashboard data. Please check if the server is running.';
      }
    });
  }

  private processDashboardData(data: any): void {
    this.totalRevenue = data.totalRevenue || 0;
    this.mrr = data.mrr || 0;
    this.newSubscriptions = data.newSubscriptions || 0;
    this.churnRate = data.churnRate || 0;
    this.mrrData = data.mrrData || [];

    this.invoices = (data.invoices || []).map((inv: any) => ({
      id: inv.id,
      organization: inv.organization,
      plan: inv.plan,
      amount: inv.amount,
      date: inv.date,
      status: inv.status
    }));

    this.updateYAxisScale();
    setTimeout(() => this.animateBars(), 300);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.animateBars(), 300);
  }

  updateYAxisScale(): void {
    if (this.mrrData.length === 0) {
      this.yAxisLabels = ['$0', '$200', '$400', '$600', '$800'];
      this.maxYValue = 800;
      return;
    }

    const amounts = this.mrrData.map(d => d.amount);
    const maxAmount = Math.max(...amounts, 0);

    if (maxAmount === 0) {
      this.yAxisLabels = ['$0'];
      this.maxYValue = 100;
      return;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(maxAmount)));
    const roundedMax = Math.ceil(maxAmount / magnitude) * magnitude;
    const niceMax = roundedMax < maxAmount * 1.1 ? roundedMax * 1.2 : roundedMax;

    this.maxYValue = niceMax;

    this.yAxisLabels = [];
    for (let i = 0; i <= 4; i++) {
      const value = (niceMax / 4) * i;
      this.yAxisLabels.push('$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 }));
    }
    this.yAxisLabels = this.yAxisLabels.reverse();
  }

  animateBars(): void {
    if (!this.barElements || this.barElements.length === 0) return;

    this.barElements.forEach((el, index) => {
      const bar = el.nativeElement as HTMLElement;
      const heightPercent = this.getBarHeight(parseFloat(bar.dataset['amount'] || '0'));

      // Reset
      bar.style.height = '0%';
      bar.style.transition = 'none';
      void bar.offsetHeight;

      // Animate to correct height
      setTimeout(() => {
        bar.style.transition = `height 0.8s ease ${index * 0.1}s`;
        bar.style.height = `${heightPercent}%`;
      }, 50);
    });
  }

  viewInvoice(invoice: Invoice) {
    if (!invoice.id) {
      alert('Invoice ID missing');
      return;
    }

    this.showViewModal = true;
    this.modalLoading = true;
    this.selectedInvoice = null;

    const encodedId = encodeURIComponent(invoice.id);
    this.http.get<any>(`http://localhost:5000/api/billing/invoice/${encodedId}`).subscribe({
      next: (res) => {
        if (res.success && res.invoice) {
          this.selectedInvoice = res.invoice;
        } else {
          this.error = 'Invoice not found on server';
        }
        this.modalLoading = false;
      },
      error: (err) => {
        console.error('View invoice error:', err);
        this.error = 'Could not load invoice details';
        this.modalLoading = false;
        this.showViewModal = false;
      }
    });
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedInvoice = null;
    this.modalLoading = false;
  }

  exportReport() {
    if (this.invoices.length === 0) {
      alert('No invoices to export');
      return;
    }

    const headers = ['Invoice ID', 'Organization', 'Plan', 'Amount', 'Date', 'Status'];
    const rows = this.invoices.map(inv => [
      inv.id,
      inv.organization,
      inv.plan,
      inv.amount,
      inv.date,
      inv.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  openGenerateModal() {
    this.showGenerateModal = true;
    this.newInvoiceForm = {
      organization: '',
      plan: 'Starter',
      amount: 0,
      billingCycle: 'monthly'
    };
    this.generateLoading = false;
    this.generateError = null;
  }

  closeGenerateModal() {
    this.showGenerateModal = false;
  }

  submitNewInvoice() {
    if (!this.newInvoiceForm.organization || !this.newInvoiceForm.plan || this.newInvoiceForm.amount <= 0) {
      this.generateError = 'Please fill all required fields';
      return;
    }

    this.generateLoading = true;
    this.generateError = null;

    this.http.post<any>('http://localhost:5000/api/billing/invoice', this.newInvoiceForm).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Invoice generated successfully!');
          this.closeGenerateModal();
          this.refreshData();
        } else {
          this.generateError = res.message || 'Failed to generate invoice';
        }
        this.generateLoading = false;
      },
      error: (err) => {
        this.generateError = err.error?.message || 'Server error';
        this.generateLoading = false;
        console.error(err);
      }
    });
  }

  downloadInvoice(invoiceOrId: Invoice | string) {
    let invoiceId: string;

    if (typeof invoiceOrId === 'string') {
      invoiceId = invoiceOrId;
    } else {
      invoiceId = invoiceOrId.id;
    }

    if (!invoiceId) {
      alert('Invoice ID missing');
      return;
    }

    const encodedId = encodeURIComponent(invoiceId);
    const link = document.createElement('a');
    link.href = `http://localhost:5000/api/billing/invoice/${encodedId}/pdf`;
    link.download = `invoice-${invoiceId.replace(/#/g, '')}.html`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getBarHeight(amount: number): number {
    if (this.mrrData.length === 0 || this.maxYValue === 0) return 0;
    return Math.max(5, (amount / this.maxYValue) * 100);
  }
}