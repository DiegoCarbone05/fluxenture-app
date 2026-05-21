import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/api/auth/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.verifySession().pipe(
    take(1),
    map(isValid => {
      if (!isValid) {
        router.navigate(['/login']);
        return false;
      }
      // If valid and user is on auth area (e.g. splash), redirect to main/tnt to avoid loop
      const url = state.url.replace(/^\//, '');
      if (!url.startsWith('main')) {
        router.navigate(['/main', 'app-pages', 'tnt']);
        return false;
      }
      return true; // If valid and user is on main area, allow access
    })
  );
};
