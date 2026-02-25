import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'flux-toolbar',
  standalone: false,
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss'
})
export class Toolbar {

  @Output() menuClick = new EventEmitter<void>();
  @Input() menuButton: boolean = false;
  @Input() title: string = '';
  @Output() backClick = new EventEmitter<void>();
  @Input() backButton: boolean = false;


  clickBack() {
    this.backClick.emit();
  }
  clickMenu() {
    this.menuClick.emit();
  }

}
