import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface NavDestination {
  label: string;
  icon: string;
  link: string;
}

/**
 * Navigation bar de Material 3 para telefonos. Reemplaza al drawer lateral
 * en pantallas chicas: el drawer queda solo para escritorio.
 */
@Component({
  selector: 'flux-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss'
})
export class BottomNav {

  // Labels abreviados para que entren en 5 destinos sin cortarse.
  readonly destinations: NavDestination[] = [
    { label: 'Envíos', icon: 'track_changes', link: '/main/app-pages/tnt' },
    { label: 'Empleados', icon: 'people', link: '/main/app-pages/eployees' },
    { label: 'Ausencias', icon: 'event_busy', link: '/main/app-pages/absents' },
    { label: 'Docs', icon: 'description', link: '/main/app-pages/docs' },
    { label: 'SGI', icon: 'falling', link: '/main/app-pages/sgi' },
  ];
}
