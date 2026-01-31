import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalUsersComponent } from './global-users.component';

describe('GlobalUsersComponent', () => {
  let component: GlobalUsersComponent;
  let fixture: ComponentFixture<GlobalUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalUsersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
