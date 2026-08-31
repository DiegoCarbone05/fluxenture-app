import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./splash/splash').then(c => c.Splash),
    canActivate: [authGuard]
  },
  {
    path: 'no-autorizado',
    loadComponent: () => import('./not-authorized/not-authorized').then(c => c.NotAuthorized)
  }
];
