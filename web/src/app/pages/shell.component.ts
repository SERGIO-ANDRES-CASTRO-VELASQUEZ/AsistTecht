import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header>
        <a class="marca" [routerLink]="inicio">AsisTecht</a>
        <p>{{ auth.sesion()?.nombre }}</p>
        <nav>
          @if (rol === 'Profesor') {
            <a routerLink="/profesor" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
            <a routerLink="/profesor/materias" routerLinkActive="activo">Materias</a>
            <a routerLink="/profesor/grupos" routerLinkActive="activo">Grupos</a>
            <a routerLink="/profesor/estudiantes" routerLinkActive="activo">Estudiantes</a>
            <a routerLink="/profesor/clase" routerLinkActive="activo">Clase</a>
            <a routerLink="/profesor/planilla" routerLinkActive="activo">Planillas</a>
            <a routerLink="/profesor/historial" routerLinkActive="activo">Historial</a>
          } @else if (rol === 'Director') {
            <a routerLink="/director" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Profesores</a>
          } @else {
            <a routerLink="/estudiante" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Mi QR</a>
            <a routerLink="/estudiante/notas" routerLinkActive="activo">Notas</a>
            <a routerLink="/estudiante/rostro" routerLinkActive="activo">Rostro</a>
          }
          <a [routerLink]="clave" routerLinkActive="activo">Clave</a>
          <button type="button" class="texto" (click)="salir()">Salir</button>
        </nav>
      </header>
      <router-outlet />
    </div>
  `
})
export class ShellComponent {
  rol: 'Director' | 'Profesor' | 'Estudiante' | null = null;
  inicio = '/ingreso';
  clave = '/ingreso';

  constructor(public auth: AuthService, private router: Router) {
    this.rol = auth.rol();
    if (this.rol === 'Director') {
      this.inicio = '/director';
      this.clave = '/director/clave';
    } else if (this.rol === 'Profesor') {
      this.inicio = '/profesor';
      this.clave = '/profesor/clave';
    } else {
      this.inicio = '/estudiante';
      this.clave = '/estudiante/clave';
    }
  }

  salir(): void {
    this.auth.salir();
    void this.router.navigateByUrl('/ingreso');
  }
}
