import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { APP_ROUTES } from './app/app.routes';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import {
  provideKeycloak,
  includeBearerTokenInterceptor,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
} from 'keycloak-angular';
import { keycloakConfig, backendBearerCondition } from './app/core/config/keycloak.config';
import { DOC_RECORD_CREATORS } from './app/shared/services/doc-record-creator';
import { AbsentDocRecordCreatorService } from './app/core/services/api/absents/absent-doc-record-creator.service';
import { CdDocRecordCreatorService } from './app/core/services/api/cd-api/cd-doc-record-creator.service';

bootstrapApplication(App, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideKeycloak({
      config: keycloakConfig,
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      },
    }),
    { provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG, useValue: [backendBearerCondition] },
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),
    provideRouter(APP_ROUTES, withComponentInputBinding()),
    // Registro de "crear un registro a partir de un documento" (ver shared/services/doc-record-creator.ts).
    // Sumar un modulo nuevo (Factura, SGI, EPP...) es agregar una linea aca, nada mas.
    { provide: DOC_RECORD_CREATORS, useClass: AbsentDocRecordCreatorService, multi: true },
    { provide: DOC_RECORD_CREATORS, useClass: CdDocRecordCreatorService, multi: true },
  ]
}).catch(err => console.error(err));
