import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { UserDto } from '../../../../shared/models/UserDto';
import { KeycloakClaims, KeycloakUser } from '../../../../shared/models/KeycloakUser';
import { Observable } from 'rxjs';
import Keycloak from 'keycloak-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseApiService<UserDto> {
  protected override readonly endpoint = this.api + '/auth';
  private user = signal<UserDto | null>(null);
  private keycloakUser = signal<KeycloakUser | null>(null);

  constructor(private keycloak: Keycloak) {
    super();
  }

  getUserSignal(): Signal<UserDto | null> {
    return this.user;
  }

  // Identidad tal como la ve Keycloak (no el User de Fluxenture, que puede no existir).
  getKeycloakUserSignal(): Signal<KeycloakUser | null> {
    return this.keycloakUser;
  }

  saveUserInSignal() {
    this.keycloakUser.set(this.readKeycloakUser());
    this.getUser().subscribe(user => {
      this.user.set(user);
    });
  }

  logout() {
    this.user.set(null);
    this.keycloakUser.set(null);
    this.keycloak.logout({ redirectUri: window.location.origin });
  }

  getUser(): Observable<UserDto> {
    return this.http.get<UserDto>(this.endpoint + '/me');
  }

  // Los datos del usuario ya viajan dentro del JWT que keycloak-js tiene en memoria,
  // asi que esto es sincrono y no pega a la red. Equivale al userManager.getUser()
  // de oidc-client-ts (lo que se usa en el starter de Astro).
  readKeycloakUser(): KeycloakUser | null {
    if (!this.keycloak.authenticated) return null;

    // El access token trae los roles; el id token trae el perfil completo cuando
    // el client no mapea esos claims al access token. Preferimos el que este.
    const token = this.keycloak.tokenParsed as KeycloakClaims | undefined;
    const idToken = this.keycloak.idTokenParsed as KeycloakClaims | undefined;
    const claims = { ...idToken, ...token } as KeycloakClaims;
    if (!claims.sub) return null;

    return {
      id: claims.sub,
      username: claims.preferred_username ?? '',
      email: claims.email ?? '',
      emailVerified: claims.email_verified ?? false,
      fullName: claims.name ?? '',
      firstName: claims.given_name ?? '',
      lastName: claims.family_name ?? '',
      roles: this.readRoles(claims),
    };
  }

  // Roles de realm + roles de este client (resource_access esta keyeado por clientId).
  private readRoles(claims: KeycloakClaims): string[] {
    const realmRoles = claims.realm_access?.roles ?? [];
    const clientId = this.keycloak.clientId ?? '';
    const clientRoles = claims.resource_access?.[clientId]?.roles ?? [];
    return [...new Set([...realmRoles, ...clientRoles])];
  }

  hasRole(role: string): boolean {
    return this.keycloak.hasRealmRole(role) || this.keycloak.hasResourceRole(role);
  }

  // Version por red del userinfo endpoint. Solo hace falta si el client no mapea
  // algun claim al token; para lo normal alcanza con readKeycloakUser().
  async loadKeycloakUserInfo(): Promise<KeycloakClaims> {
    return (await this.keycloak.loadUserInfo()) as KeycloakClaims;
  }
}
