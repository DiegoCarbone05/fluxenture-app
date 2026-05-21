import { Component, computed, effect, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { ViewsService } from '../../../views/views.service';


@Component({
  selector: 'flux-toolbar',
  standalone: false,
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
