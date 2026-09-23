import { Component, computed, inject, Input, signal } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { KeycloakUser } from '../../../shared/models/KeycloakUser';
import { APP_VERSION } from '../../../core/config/app-version.generated';

/**
 * Menu de cuenta de Servaltek: boton de usuario + panel flotante con el
 * logotipo del SSO, "Cerrar sesion", el avatar con iniciales y la identidad
 * (nombre + mail) que ya viaja dentro del token de Keycloak.
 *
 * Port del `DropdownMenu` + `.account` del navbar de la landing
 * (servaltek/src/components/AppNavbar.astro). Trae su propio trigger, igual que
 * alla: se dropea donde iba el boton de usuario y no necesita nada mas.
 *
 * El panel va en un overlay del CDK y no en un `position: absolute` como en
 * Astro: aca el header vive dentro de contenedores con overflow propio que
 * recortarian el panel. Es el mismo problema que en la landing resuelve
 * `.dropdown { position: relative }`.
 */
@Component({
  selector: 'flux-user-account-dialog',
  standalone: true,
  imports: [OverlayModule, RouterLink, MatIconModule],
  templateUrl: './user-account-dialog.html',
  styleUrl: './user-account-dialog.scss',
  host: {
    '[class.dark]': 'theme === "dark"',
  }
})
export class UserAccountDialog {
  private authService = inject(AuthService);
  readonly appVersion = APP_VERSION;

  /** Destino de "Ver cuenta". */
  @Input() accountLink: string = '/main/app-pages/users';

  /**
   * Tinta del trigger, para el mismo caso que el `theme` de flux-toolbar: el
   * boton se dibuja sobre una barra de color (primary / warn / verde) y en
   * negro no se lee. Solo afecta al trigger — el panel flota sobre el contenido
   * de la pagina, que siempre es claro.
   */
  @Input() theme: 'light' | 'dark' = 'light';

  /**
   * El signal lo llena `Pages` via saveUserInSignal(); el fallback sincrono
   * cubre a quien monte el header antes de esa llamada (readKeycloakUser lee el
   * token que keycloak-js ya tiene en memoria, no pega a la red).
   */
  private keycloakUser = this.authService.getKeycloakUserSignal();
  readonly user = computed<KeycloakUser | null>(
    () => this.keycloakUser() ?? this.authService.readKeycloakUser()
  );

  readonly isOpen = signal(false);

  /** Nombre completo, con fallback al par nombre/apellido si el token no lo trae. */
  readonly fullName = computed(() => {
    const user = this.user();
    if (!user) return '';
    return user.fullName || `${user.firstName} ${user.lastName}`.trim();
  });

  /**
   * Iniciales para el boton y el avatar. El fallback al username/mail cubre el
   * token sin given_name / family_name; si no sale nada usable quedan los
   * iconos, mejor que un boton vacio.
   */
  readonly initials = computed(() => {
    const user = this.user();
    if (!user) return '';
    const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`;
    return (fromName || user.username?.[0] || user.email?.[0] || '').toUpperCase();
  });

  /** Posicion del panel: debajo del trigger y alineado a su borde derecho. */
  readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 10 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -10 },
  ];

  toggle() {
    // Sin sesion no hay nada que mostrar; el guard ya se encarga del login.
    if (!this.user()) return;
    this.isOpen.update(open => !open);
  }

  close() {
    this.isOpen.set(false);
  }

  logout() {
    this.close();
    this.authService.logout();
  }
}
