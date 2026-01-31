import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceBillingComponent } from './finance-billing.component';

describe('FinanceBillingComponent', () => {
  let component: FinanceBillingComponent;
  let fixture: ComponentFixture<FinanceBillingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceBillingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceBillingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
