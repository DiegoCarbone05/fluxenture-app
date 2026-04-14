import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sgi } from './sgi';

describe('Sgi', () => {
  let component: Sgi;
  let fixture: ComponentFixture<Sgi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Sgi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sgi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
