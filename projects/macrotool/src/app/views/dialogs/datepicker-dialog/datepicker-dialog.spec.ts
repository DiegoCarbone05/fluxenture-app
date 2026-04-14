import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatepickerDialog } from './datepicker-dialog';

describe('DatepickerDialog', () => {
  let component: DatepickerDialog;
  let fixture: ComponentFixture<DatepickerDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatepickerDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatepickerDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
