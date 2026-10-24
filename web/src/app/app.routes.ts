import { Routes } from '@angular/router';
import { profesorGuard, estudianteGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login.component';
import { InicioComponent } from './pages/inicio.component';
import { MateriasComponent } from './pages/materias.component';
import { GruposComponent } from './pages/grupos.component';
import { EstudiantesComponent } from './pages/estudiantes.component';
import { ClaseComponent } from './pages/clase.component';
import { HistorialComponent } from './pages/historial.component';
import { QrComponent } from './pages/qr.component';
import { ClaveComponent } from './pages/clave.component';
import { ShellComponent } from './pages/shell.component';

export const routes: Routes = [
  { path: 'ingreso', component: LoginComponent },
  {
    path: 'profesor',
    component: ShellComponent,
    canActivate: [profesorGuard],
    children: [
      { path: '', component: InicioComponent },
      { path: 'materias', component: MateriasComponent },
      { path: 'grupos', component: GruposComponent },
      { path: 'estudiantes', component: EstudiantesComponent },
      { path: 'clase', component: ClaseComponent },
      { path: 'historial', component: HistorialComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },
  {
    path: 'estudiante',
    component: ShellComponent,
    canActivate: [estudianteGuard],
    children: [
      { path: '', component: QrComponent },
      { path: 'clave', component: ClaveComponent }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'ingreso' },
  { path: '**', redirectTo: 'ingreso' }
];
