import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyBugsComponent } from './my-bugs.component';

describe('MyBugsComponent', () => {
  let component: MyBugsComponent;
  let fixture: ComponentFixture<MyBugsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBugsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyBugsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
