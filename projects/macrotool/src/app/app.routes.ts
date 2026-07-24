import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const APP_ROUTES: Routes = [
  {
    path: '',
    loadChildren: () => import('./views/auth/auth.routes').then(r => r.AUTH_ROUTES),
  },
  {
    path: 'main',
    loadChildren: () => import('./views/pages/pages.routes').then(r => r.PAGES_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'splash'
  }
];
