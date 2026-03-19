import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDocDialog } from './add-doc-dialog';

describe('AddDocDialog', () => {
  let component: AddDocDialog;
  let fixture: ComponentFixture<AddDocDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddDocDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddDocDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
