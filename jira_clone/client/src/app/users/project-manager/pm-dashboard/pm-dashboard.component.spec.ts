import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PmDashboardComponent } from './pm-dashboard.component';

describe('PmDashboardComponent', () => {
  let component: PmDashboardComponent;
  let fixture: ComponentFixture<PmDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PmDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PmDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
