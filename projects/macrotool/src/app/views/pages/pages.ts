import { Component, computed, ViewChild } from '@angular/core';
import { AuthService } from '../../core/services/api/auth/auth.service';
import { ViewsService } from '../views.service';
import { MatSidenav } from '@angular/material/sidenav';
import { ChildrenOutletContexts } from '@angular/router';
import { slideInAnimation } from '../../shared/constants/slideAnimaton';



@Component({
  selector: 'app-pages',
  standalone: false,
  templateUrl: './pages.html',
  styleUrl: './pages.scss',
  animations: [slideInAnimation]
})
export class Pages {
  isMobile = computed(() => this.viewsSvc.getIsMobile());
  @ViewChild("sideNav") sideNav!: MatSidenav;

  constructor(
    private authService: AuthService,
    private viewsSvc: ViewsService,
    private contexts: ChildrenOutletContexts
  ) {
    this.authService.saveUserInSignal();
    this.viewsSvc.openSidenav$.subscribe(() => {
      this.sideNav.toggle();
    });
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }



}
