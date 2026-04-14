import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpView } from './emp-view';

describe('EmpView', () => {
  let component: EmpView;
  let fixture: ComponentFixture<EmpView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmpView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
