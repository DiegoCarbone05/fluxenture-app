import { Component, computed, inject } from '@angular/core';
import { ViewsService } from '../../../views/views.service';

@Component({
  selector: 'flux-navbar',
  standalone: false,
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss'
})
export class Sidenav {

  private viewsSvc = inject(ViewsService);
  isMobile = computed(() => this.viewsSvc.getIsMobile());

  closeSidenav() {
    if (this.isMobile()) {
      this.viewsSvc.toggleSidenav();
    }
  }
}
