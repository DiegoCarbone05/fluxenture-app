import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsentView } from './absent-view';

describe('AbsentView', () => {
  let component: AbsentView;
  let fixture: ComponentFixture<AbsentView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AbsentView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbsentView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
