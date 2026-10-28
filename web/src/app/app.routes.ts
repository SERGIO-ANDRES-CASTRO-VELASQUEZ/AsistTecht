import { Routes } from '@angular/router';
import { profesorGuard, estudianteGuard, directorGuard, acudienteGuard, adminGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login.component';
import { MateriasComponent } from './pages/materias.component';
import { GruposComponent } from './pages/grupos.component';
import { EstudiantesComponent } from './pages/estudiantes.component';
import { ClaseComponent } from './pages/clase.component';
import { HistorialComponent } from './pages/historial.component';
import { QrComponent } from './pages/qr.component';
import { ClaveComponent } from './pages/clave.component';
import { ShellComponent } from './pages/shell.component';
import { PlanillaComponent } from './pages/planilla.component';
import { RostroComponent } from './pages/rostro.component';
import { AcademicoComponent } from './pages/academico.component';
import { DirectorComponent } from './pages/director.component';
import { DashboardDirectorComponent } from './pages/dashboard-director.component';
import { DashboardProfesorComponent } from './pages/dashboard-profesor.component';
import { PortalAcudienteComponent } from './pages/portal-acudiente.component';
import { ConvivenciaComponent } from './pages/convivencia.component';
import { BoletinComponent } from './pages/boletin.component';
import { AdminComponent } from './pages/admin.component';

export const routes: Routes = [
  { path: 'ingreso', component: LoginComponent },
  {
    path: 'admin',
    component: ShellComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },
  {
    path: 'profesor',
    component: ShellComponent,
    canActivate: [profesorGuard],
    children: [
      { path: '', component: DashboardProfesorComponent },
      { path: 'materias', component: MateriasComponent },
      { path: 'grupos', component: GruposComponent },
      { path: 'estudiantes', component: EstudiantesComponent },
      { path: 'clase', component: ClaseComponent },
      { path: 'planilla', component: PlanillaComponent },
      { path: 'convivencia', component: ConvivenciaComponent },
      { path: 'historial', component: HistorialComponent },
      { path: 'estudiantes/:id/rostro', component: RostroComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },
  {
    path: 'director',
    component: ShellComponent,
    canActivate: [directorGuard],
    children: [
      { path: '', component: DashboardDirectorComponent },
      { path: 'profesores', component: DirectorComponent },
      { path: 'convivencia', component: ConvivenciaComponent },
      { path: 'boletin', component: BoletinComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },

  {
    path: 'estudiante',
    component: ShellComponent,
    canActivate: [estudianteGuard],
    children: [
      { path: '', component: QrComponent },
      { path: 'boletin', component: BoletinComponent },
      { path: 'notas', component: AcademicoComponent },
      { path: 'convivencia', component: ConvivenciaComponent },
      { path: 'rostro', component: RostroComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },
  {
    path: 'acudiente',
    component: ShellComponent,
    canActivate: [acudienteGuard],
    children: [
      { path: '', component: PortalAcudienteComponent },
      { path: 'boletin', component: BoletinComponent },
      { path: 'convivencia', component: ConvivenciaComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },
  {
    path: 'boletin-preview/:id',
    component: BoletinComponent
  },
  { path: '', pathMatch: 'full', redirectTo: 'ingreso' },
  { path: '**', redirectTo: 'ingreso' }
];
