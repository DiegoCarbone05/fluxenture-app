import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(c => c.Login)
  },
  {
    path: '',
    loadComponent: () => import('./splash/splash').then(c => c.Splash),
    canActivate: [authGuard]
  }
];
