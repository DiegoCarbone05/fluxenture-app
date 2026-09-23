import { IncludeBearerTokenCondition, createInterceptorCondition } from 'keycloak-angular';

// Igual que en base-api.service.ts: comentar/descomentar para local o produccion.
// Keycloak es centralizado (un unico auth.servaltek.com y un unico realm para todos
// los entornos), asi que lo unico que cambia por entorno es el clientId: cada app/
// entorno tiene su propio client registrado en Keycloak (flux-frontend-dev vs
// flux-frontend), cada uno con sus propios redirect URIs / web origins.
export const keycloakConfig = {
  url: 'https://auth.servaltek.com/',
  realm: 'servaltek',
  // clientId: 'servaltek-auth-dev',
  clientId: 'fluxapp', // produccion (fluxenture.web.app)
};

// Solo se agrega el Bearer token a los requests que van hacia el backend de Fluxenture.
// Debe reflejar las mismas URLs que base-api.service.ts (el api activo ahi mismo).
export const backendBearerCondition = createInterceptorCondition<IncludeBearerTokenCondition>({
  urlPattern: /^(https:\/\/fluxenture\.servaltek\.com|http:\/\/localhost:8270|http:\/\/192\.168\.100\.41:8080)(\/.*)?$/i,
});

export const getUser = async (token: string) => {
  const response = await fetch('https://auth.servaltek.com/auth/realms/servaltek/protocol/openid-connect/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user = await response.json();
  return user;
}



