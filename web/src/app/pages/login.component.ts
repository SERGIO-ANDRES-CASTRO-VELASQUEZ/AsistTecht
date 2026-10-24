import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Rol } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="login">
      <section class="card login-card">
        <p class="marca">AsisTecht</p>
        <h1>Asistencia con la cámara abierta</h1>
        <p class="lead">El docente registra al grupo. Cada estudiante descarga su QR y, si quiere, guarda su rostro. En clase, la cámara marca la asistencia.</p>

        <div class="segmento">
          <button type="button" [class.activo]="rol() === 'Director'" (click)="rol.set('Director')">Dirección</button>
          <button type="button" [class.activo]="rol() === 'Profesor'" (click)="rol.set('Profesor')">Profesor</button>
          <button type="button" [class.activo]="rol() === 'Estudiante'" (click)="rol.set('Estudiante')">Estudiante</button>
        </div>

        <form (ngSubmit)="entrar()">
          <label>
            {{ rol() === 'Estudiante' ? 'Número de documento' : 'Usuario' }}
            <input [(ngModel)]="usuario" name="usuario" autocomplete="username" required />
          </label>
          <label>
            Clave
            <input [(ngModel)]="password" name="password" type="password" autocomplete="current-password" required />
          </label>
          @if (error()) { <p class="aviso error">{{ error() }}</p> }
          <button class="primario" type="submit" [disabled]="cargando()">
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <details>
          <summary>Datos de prueba</summary>
          <p>Dirección: <strong>director</strong> / <strong>AsisTecht2026</strong></p>
          <p>Profesor: <strong>profesor</strong> / <strong>AsisQR2026</strong></p>
          <p>Estudiante: <strong>1000000001</strong> / <strong>Estudiante2026</strong></p>
        </details>
      </section>
    </main>
  `
})
export class LoginComponent {
  usuario = '';
  password = '';
  rol = signal<Rol>('Profesor');
  error = signal('');
  cargando = signal(false);

  constructor(private auth: AuthService, private router: Router) {
    const sesion = this.auth.sesion();
    if (sesion?.rol === 'Director') void this.router.navigateByUrl('/director');
    if (sesion?.rol === 'Profesor') void this.router.navigateByUrl('/profesor');
    if (sesion?.rol === 'Estudiante') void this.router.navigateByUrl('/estudiante');
  }

  entrar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.auth.login(this.usuario.trim(), this.password, this.rol()).subscribe({
      next: (sesion) => {
        const destino = sesion.rol === 'Director' ? '/director' : sesion.rol === 'Profesor' ? '/profesor' : '/estudiante';
        void this.router.navigateByUrl(destino);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeError(error));
      }
    });
  }
}
