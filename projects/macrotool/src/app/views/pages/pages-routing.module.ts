import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Tnt } from './tnt/tnt';
import { CdsViewer } from './tnt/cds-viewer/cds-viewer';
import { Eployees } from './eployees/eployees';
import { Pages } from './pages';
import { Absents } from './absents/absents';
import { Docs } from './docs/docs';
import { Sgi } from './sgi/sgi';
import { AbsentView } from './absents/absent-view/absent-view';
import { EmpView } from './eployees/emp-view/emp-view';

const routes: Routes = [
  {
    path: 'app-pages',
    component: Pages,
    children: [
      {
        path: 'tnt',
        component: Tnt,
        data: { animation: 'Tnt' }
      },
      {
        path: 'tnt/cds-viewer/:id',
        component: CdsViewer,
        data: { animation: 'CdsViewer' }
      },
      {
        path: 'eployees',
        component: Eployees,
        data: { animation: 'Eployees' }
      },
      {
        path: 'eployees/:id',
        component: EmpView,
        data: { animation: 'EmpView' }
      },
      {
        path: 'absents',
        component: Absents,
        data: { animation: 'Absents' }
      },
      {
        path: 'absents/:id',
        component: AbsentView,
        data: { animation: 'AbsentView' }
      },
      {
        path: 'docs',
        component: Docs,
        data: { animation: 'Docs' }
      },
      {
        path: 'sgi',
        component: Sgi,
        data: { animation: 'Sgi' }
      }
    ]
  },
  // {
  //   path: 'tnt',
  //   component: Tnt,
  //   children: [
  //     {
  //       path: 'cds-viewer/:id',
  //       component: CdsViewer
  //     }
  //   ]
  // },
  // {
  //   path: 'eployees',
  //   component: Eployees
  // },
  // {
  //   path: 'cds-viewer/:id',
  //   component: CdsViewer
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
