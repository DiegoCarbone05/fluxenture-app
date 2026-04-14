import { Component, computed, ViewChild } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { ViewsService } from '../views.service';
import { MatSidenav } from '@angular/material/sidenav';



@Component({
  selector: 'app-pages',
  standalone: false,
  templateUrl: './pages.html',
  styleUrl: './pages.scss'
})
export class Pages {
  isMobile = computed(() => this.viewsSvc.getIsMobile());
  @ViewChild("sideNav") sideNav!: MatSidenav;

  constructor(
    private authService: AuthService,
    private viewsSvc: ViewsService
  ) {
    this.authService.saveUserInSignal();
    this.viewsSvc.openSidenav$.subscribe(() => {
      this.sideNav.toggle();
    });
  }



}
