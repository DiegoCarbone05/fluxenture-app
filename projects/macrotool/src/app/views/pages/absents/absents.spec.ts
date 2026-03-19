import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Absents } from './absents';

describe('Absents', () => {
  let component: Absents;
  let fixture: ComponentFixture<Absents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Absents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Absents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
