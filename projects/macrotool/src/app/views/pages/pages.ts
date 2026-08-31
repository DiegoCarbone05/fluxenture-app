import { Component, computed, ViewChild } from '@angular/core';
import { AuthService } from '../../core/services/api/auth/auth.service';
import { ViewsService } from '../views.service';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { ChildrenOutletContexts, RouterOutlet } from '@angular/router';
import { slideInAnimation } from '../../shared/constants/slideAnimaton';
import { Sidenav } from '../../shared/components/sidenav/sidenav';
import { BottomNav } from '../../shared/components/bottom-nav/bottom-nav';

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [MatSidenavModule, RouterOutlet, Sidenav, BottomNav],
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
    // En telefono no se renderiza el drawer, asi que puede no existir.
    this.viewsSvc.openSidenav$.subscribe(() => {
      this.sideNav?.toggle();
    });
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }



}
