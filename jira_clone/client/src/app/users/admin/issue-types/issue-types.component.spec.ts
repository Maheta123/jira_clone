import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueTypesComponent } from './issue-types.component';

describe('IssueTypesComponent', () => {
  let component: IssueTypesComponent;
  let fixture: ComponentFixture<IssueTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueTypesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
