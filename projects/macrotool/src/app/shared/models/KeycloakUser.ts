import { KeycloakTokenParsed } from 'keycloak-js';

// KeycloakTokenParsed solo tipa los claims de infraestructura (sub, exp, realm_access...),
// asi que lo extendemos con los claims de perfil que Keycloak agrega via el scope "profile".
export type KeycloakClaims = KeycloakTokenParsed & {
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
};

// Vista plana de los datos del usuario logueado en Keycloak. Es lo que en el
// starter de Astro devuelve userManager.getUser().profile: aca no hace falta
// pedirlo por red porque ya viaja dentro del access token.
export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  firstName: string;
  lastName: string;
  roles: string[];
}
