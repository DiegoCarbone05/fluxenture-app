import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserAccountDialog } from '../../../views/dialogs/user-account-dialog/user-account-dialog';

@Component({
  selector: 'flux-toolbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, UserAccountDialog],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss'
})
export class Toolbar {

  @Input() bgColor!: string;
  @Input() theme: "light" | "dark" = 'light';
  @Input() title: string = '';
  @Input() subTitle: string = '';
  @Output() backClick = new EventEmitter<void>();
  @Input() backButton: boolean = false;

  clickBack() {
    window.history.back();
  }

}
