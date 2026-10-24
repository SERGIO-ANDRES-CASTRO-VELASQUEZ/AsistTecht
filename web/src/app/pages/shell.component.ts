import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header>
        <a class="marca" [routerLink]="inicio">AsisQR</a>
        <p>{{ auth.sesion()?.nombre }}</p>
        <nav>
          @if (profesor) {
            <a routerLink="/profesor" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
            <a routerLink="/profesor/materias" routerLinkActive="activo">Materias</a>
            <a routerLink="/profesor/grupos" routerLinkActive="activo">Grupos</a>
            <a routerLink="/profesor/estudiantes" routerLinkActive="activo">Estudiantes</a>
            <a routerLink="/profesor/clase" routerLinkActive="activo">Clase</a>
            <a routerLink="/profesor/historial" routerLinkActive="activo">Historial</a>
          } @else {
            <a routerLink="/estudiante" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Mi QR</a>
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
  profesor = false;
  inicio = '/ingreso';
  clave = '/ingreso';

  constructor(public auth: AuthService, private router: Router) {
    this.profesor = auth.rol() === 'Profesor';
    this.inicio = this.profesor ? '/profesor' : '/estudiante';
    this.clave = this.profesor ? '/profesor/clave' : '/estudiante/clave';
  }

  salir(): void {
    this.auth.salir();
    void this.router.navigateByUrl('/ingreso');
  }
}
