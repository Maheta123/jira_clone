import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevLayoutComponent } from './dev-layout.component';

describe('DevLayoutComponent', () => {
  let component: DevLayoutComponent;
  let fixture: ComponentFixture<DevLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DevLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
