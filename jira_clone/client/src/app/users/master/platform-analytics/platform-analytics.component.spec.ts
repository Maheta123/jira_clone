import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformAnalyticsComponent } from './platform-analytics.component';

describe('PlatformAnalyticsComponent', () => {
  let component: PlatformAnalyticsComponent;
  let fixture: ComponentFixture<PlatformAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlatformAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
