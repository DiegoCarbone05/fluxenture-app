import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthGuardData, createAuthGuard } from 'keycloak-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/api/auth/auth.service';

const isAccessAllowed = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  authData: AuthGuardData
) => {
  const { authenticated, keycloak } = authData;
  const router = inject(Router);

  if (!authenticated) {
    // No autenticado: redirige al login centralizado de Keycloak.
    await keycloak.login({ redirectUri: window.location.origin + '/main/app-pages/tnt' });
    return false;
  }

  // Autenticado en Keycloak != autorizado en Fluxenture: el backend rechaza con 403
  // si el email no tiene un User dado de alta (ver FluxentureAccountFilter).
  try {
    await firstValueFrom(inject(AuthService).getUser());
  } catch (err) {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return router.parseUrl('/no-autorizado');
    }
    throw err;
  }

  // Si esta autorizado y esta en el area de auth (splash), lo mandamos a main para evitar loops.
  const url = state.url.replace(/^\//, '');
  if (!url.startsWith('main')) {
    return router.parseUrl('/main/app-pages/tnt');
  }
  return true;
};

export const authGuard: CanActivateFn = createAuthGuard<CanActivateFn>(isAccessAllowed);
