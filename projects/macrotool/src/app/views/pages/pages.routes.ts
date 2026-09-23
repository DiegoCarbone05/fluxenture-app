import { Routes } from '@angular/router';
import { DOC_GENERATORS } from './doc-generator/doc-generators';

export const PAGES_ROUTES: Routes = [
  {
    path: 'app-pages',
    loadComponent: () => import('./pages').then(c => c.Pages),
    children: [
      {
        path: 'tnt',
        loadComponent: () => import('./tnt/tnt').then(c => c.Tnt),
        data: { animation: 'Tnt' }
      },
      {
        path: 'tnt/cds-viewer/:id',
        loadComponent: () => import('./tnt/cds-viewer/cds-viewer').then(c => c.CdsViewer),
        data: { animation: 'CdsViewer' }
      },
      {
        path: 'eployees',
        loadComponent: () => import('./eployees/eployees').then(c => c.Eployees),
        data: { animation: 'Eployees' }
      },
      {
        path: 'eployees/:id',
        loadComponent: () => import('./eployees/emp-view/emp-view').then(c => c.EmpView),
        data: { animation: 'EmpView' }
      },
      {
        path: 'absents',
        loadComponent: () => import('./absents/absents').then(c => c.Absents),
        data: { animation: 'Absents' }
      },
      {
        path: 'absents/:id',
        loadComponent: () => import('./absents/absent-view/absent-view').then(c => c.AbsentView),
        data: { animation: 'AbsentView' }
      },
      {
        path: 'docs',
        loadComponent: () => import('./docs/docs').then(c => c.Docs),
        data: { animation: 'Docs' }
      },
      {
        path: 'doc-generator',
        loadComponent: () => import('./doc-generator/doc-generator').then(c => c.DocGenerator),
        data: { animation: 'DocGenerator' }
      },
      // Un formulario por documento generable, armado desde el registro (ver doc-generators.ts).
      ...DOC_GENERATORS.filter(g => g.available && g.loadComponent).map(g => ({
        path: `doc-generator/${g.id}`,
        loadComponent: g.loadComponent,
        data: { animation: `DocGenerator-${g.id}` }
      })),
      // Ruta vieja del modulo SGI, antes de que existiera el hub.
      { path: 'sgi', redirectTo: 'doc-generator/sgi' },
      {
        path: 'users',
        loadComponent: () => import('./users/users').then(c => c.Users),
        data: { animation: 'Users' }
      }
    ]
  }
];
