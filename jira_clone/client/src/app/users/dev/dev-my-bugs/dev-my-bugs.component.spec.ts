import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevMyBugsComponent } from './dev-my-bugs.component';

describe('DevMyBugsComponent', () => {
  let component: DevMyBugsComponent;
  let fixture: ComponentFixture<DevMyBugsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevMyBugsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DevMyBugsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
