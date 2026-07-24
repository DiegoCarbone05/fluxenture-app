import { Component, computed, effect, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { ViewsService } from '../../../views/views.service';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'flux-toolbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss'
})
export class Toolbar {

  @Input() bgColor!: string;
  @Input() theme: "light" | "dark" = 'light';
  @Output() menuClick = new EventEmitter<void>();
  @Input() menuButton: boolean = true;
  @Input() title: string = '';
  @Input() subTitle: string = '';
  @Output() backClick = new EventEmitter<void>();
  @Input() backButton: boolean = false;

  user = computed(() => this.authService.getUserSignal()());
  isMobile = computed(() => this.viewService.getIsMobile());

  constructor(private authService: AuthService, private viewService: ViewsService) {
  }

  logout() {
    this.authService.logout();
  }

  clickBack() {
    window.history.back();
  }
  clickMenu() {
    this.viewService.openSidenav();
  }

}
