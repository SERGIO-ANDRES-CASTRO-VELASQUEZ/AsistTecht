import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { Rol } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  template: `
    <main class="login" style="padding: 1.5rem 1rem; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <section class="card login-card" style="border-radius: 24px; box-shadow: var(--shadow-lg); width: 100%; max-width: 30rem; padding: 2rem 1.6rem; margin: 0 auto;">
        <!-- Logo Institucional -->
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, var(--primary), #0a523e); color: white; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 1.45rem; font-weight: 800; box-shadow: 0 8px 24px var(--primary-glow); margin-bottom: 0.5rem;">
            GIR
          </div>
          <h1 style="font-size: 1.55rem; margin-bottom: 0.2rem; font-family: var(--font-display);">Gimnasio José Eustasio Rivera</h1>
          <p style="font-size: 0.85rem; margin: 0; color: var(--text-secondary);">Sistema Institucional de Calificaciones y Asistencia</p>
        </div>

        <!-- Selector Visual de Roles con Iconos (5 Roles Oficiales) -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.25rem; background: var(--bg-hover); padding: 0.35rem; border-radius: 14px; border: 1px solid var(--border); margin-bottom: 1.25rem;">
          <button type="button" [class.activo]="rol() === 'Admin'" (click)="seleccionarRol('Admin')" style="padding: 0.45rem 0.1rem; border-radius: 10px; border: 0; cursor: pointer; text-align: center; font-size: 0.72rem; font-weight: 600;" [style.background]="rol() === 'Admin' ? 'var(--bg-surface-solid)' : 'transparent'" [style.color]="rol() === 'Admin' ? 'var(--primary)' : 'var(--text-secondary)'" [style.box-shadow]="rol() === 'Admin' ? 'var(--shadow-sm)' : 'none'">
            <span style="display: block; font-size: 1.15rem; margin-bottom: 0.1rem;">👑</span>
            Admin
          </button>

          <button type="button" [class.activo]="rol() === 'Director'" (click)="seleccionarRol('Director')" style="padding: 0.45rem 0.1rem; border-radius: 10px; border: 0; cursor: pointer; text-align: center; font-size: 0.72rem; font-weight: 600;" [style.background]="rol() === 'Director' ? 'var(--bg-surface-solid)' : 'transparent'" [style.color]="rol() === 'Director' ? 'var(--primary)' : 'var(--text-secondary)'" [style.box-shadow]="rol() === 'Director' ? 'var(--shadow-sm)' : 'none'">
            <span style="display: block; font-size: 1.15rem; margin-bottom: 0.1rem;">🏛️</span>
            Dirección
          </button>

          <button type="button" [class.activo]="rol() === 'Profesor'" (click)="seleccionarRol('Profesor')" style="padding: 0.45rem 0.1rem; border-radius: 10px; border: 0; cursor: pointer; text-align: center; font-size: 0.72rem; font-weight: 600;" [style.background]="rol() === 'Profesor' ? 'var(--bg-surface-solid)' : 'transparent'" [style.color]="rol() === 'Profesor' ? 'var(--primary)' : 'var(--text-secondary)'" [style.box-shadow]="rol() === 'Profesor' ? 'var(--shadow-sm)' : 'none'">
            <span style="display: block; font-size: 1.15rem; margin-bottom: 0.1rem;">👨‍🏫</span>
            Docente
          </button>

          <button type="button" [class.activo]="rol() === 'Estudiante'" (click)="seleccionarRol('Estudiante')" style="padding: 0.45rem 0.1rem; border-radius: 10px; border: 0; cursor: pointer; text-align: center; font-size: 0.72rem; font-weight: 600;" [style.background]="rol() === 'Estudiante' ? 'var(--bg-surface-solid)' : 'transparent'" [style.color]="rol() === 'Estudiante' ? 'var(--primary)' : 'var(--text-secondary)'" [style.box-shadow]="rol() === 'Estudiante' ? 'var(--shadow-sm)' : 'none'">
            <span style="display: block; font-size: 1.15rem; margin-bottom: 0.1rem;">🎓</span>
            Estudiantes
          </button>

          <button type="button" [class.activo]="rol() === 'Acudiente'" (click)="seleccionarRol('Acudiente')" style="padding: 0.45rem 0.1rem; border-radius: 10px; border: 0; cursor: pointer; text-align: center; font-size: 0.72rem; font-weight: 600;" [style.background]="rol() === 'Acudiente' ? 'var(--bg-surface-solid)' : 'transparent'" [style.color]="rol() === 'Acudiente' ? 'var(--primary)' : 'var(--text-secondary)'" [style.box-shadow]="rol() === 'Acudiente' ? 'var(--shadow-sm)' : 'none'">
            <span style="display: block; font-size: 1.15rem; margin-bottom: 0.1rem;">👨‍👩‍👧</span>
            Familia
          </button>
        </div>

        @if (mensajeSolicitudExito()) {
          <div class="aviso exito" style="margin-bottom: 1rem; font-size: 0.85rem;">
            {{ mensajeSolicitudExito() }}
          </div>
        }

        <!-- Formulario de Acceso -->
        <form (ngSubmit)="entrar()" style="display: grid; gap: 0.9rem;">
          <label style="font-weight: 600; font-size: 0.85rem;">
            {{ etiquetaUsuario() }}
            <input [(ngModel)]="usuario" name="usuario" autocomplete="username" required [placeholder]="placeholderUsuario()" style="width: 100%; margin-top: 0.35rem;" />
          </label>

          <label style="font-weight: 600; font-size: 0.85rem;">
            Contraseña
            <input [(ngModel)]="password" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" style="width: 100%; margin-top: 0.35rem;" />
          </label>

          <!-- Enlace para solicitar restablecimiento al Admin -->
          <div style="text-align: right; margin-top: -0.35rem;">
            <button type="button" (click)="abrirModalRecuperar()" style="background: none; border: none; color: var(--primary); font-size: 0.78rem; cursor: pointer; text-decoration: underline; font-weight: 600; padding: 0;">
              🔑 ¿Olvidaste tu contraseña? Solicitar al Administrador
            </button>
          </div>

          @if (error()) { <p class="aviso error">{{ error() }}</p> }

          <button class="btn-principal" type="submit" [disabled]="cargando()" style="width: 100%; padding: 0.75rem; font-size: 0.95rem; justify-content: center; margin-top: 0.3rem;">
            {{ cargando() ? 'Autenticando…' : 'Ingresar al Portal Institucional' }}
          </button>
        </form>

        <!-- Accesos Rápidos de Demostración en 1 Clic -->
        <div style="margin-top: 1.35rem; padding-top: 1.15rem; border-top: 1px dashed var(--border);">
          <span style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; text-align: center;">
            ⚡ Demostración Rápida por Rol
          </span>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem;">
            <button type="button" class="btn-secundario" (click)="accesoRapido('admin', 'Admin2026*', 'Admin')" style="font-size: 0.75rem; padding: 0.4rem 0.25rem; justify-content: center; font-weight: 700; border-color: var(--primary);">
              👑 Admin Master
            </button>
            <button type="button" class="btn-secundario" (click)="accesoRapido('director', 'AsisTecht2026', 'Director')" style="font-size: 0.75rem; padding: 0.4rem 0.25rem; justify-content: center;">
              🏛️ Dirección
            </button>
            <button type="button" class="btn-secundario" (click)="accesoRapido('profesor', 'AsisQR2026', 'Profesor')" style="font-size: 0.75rem; padding: 0.4rem 0.25rem; justify-content: center;">
              👨‍🏫 Docente
            </button>
            <button type="button" class="btn-secundario" (click)="accesoRapido('1000000001', 'Estudiante2026', 'Estudiante')" style="font-size: 0.75rem; padding: 0.4rem 0.25rem; justify-content: center;">
              🎓 Estudiantes (Laura)
            </button>
            <button type="button" class="btn-secundario" (click)="accesoRapido('acudiente', 'Acudiente2026', 'Acudiente')" style="font-size: 0.75rem; padding: 0.4rem 0.25rem; justify-content: center; grid-column: span 2;">
              👨‍👩‍👧 Familia (Elena)
            </button>
          </div>
        </div>

        <!-- Sección de Descarga Directa de APK Móvil -->
        <div style="margin-top: 1.25rem; background: linear-gradient(135deg, rgba(14, 107, 82, 0.09), rgba(37, 99, 235, 0.08)); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.85rem 1rem; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.25rem;">📱</span>
            <strong style="font-size: 0.88rem; color: var(--text-primary);">¿Usas celular Android?</strong>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.65rem;">
            Descarga nuestra aplicación móvil oficial para pase de lista con cámara y notificaciones de asistencia.
          </p>

          <a href="/downloads/asisttecht-movil.apk" download="asisttecht-movil.apk" class="btn-principal" style="width: 100%; justify-content: center; font-size: 0.82rem; padding: 0.55rem 0.85rem; text-decoration: none;">
            <span>📥</span> Descargar App Oficial (.APK)
          </a>
        </div>
      </section>

      <!-- Modal de Solicitud de Restablecimiento de Clave al Administrador -->
      @if (mostrarModalRecuperar()) {
        <div class="modal-backdrop" (click)="cerrarModalRecuperar()">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 26rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h2 style="font-size: 1.2rem; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                <span>🔑</span> Solicitar Contraseña al Admin
              </h2>
              <button type="button" class="btn-cerrar-drawer" style="width: 28px; height: 28px;" (click)="cerrarModalRecuperar()">✕</button>
            </div>

            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Si perdiste o no recuerdas tu contraseña, envía tu documento. El <strong>Administrador Central</strong> recibirá una notificación prioritaria y te asignará una nueva clave temporal para que ingreses y la actualices una única vez.
            </p>

            <form (ngSubmit)="enviarSolicitudClave()" style="display: grid; gap: 0.75rem;">
              <label style="font-size: 0.82rem; font-weight: 600;">
                Tipo de Usuario / Rol
                <select [(ngModel)]="rolRecuperar" name="rolRecuperar" style="width: 100%; margin-top: 0.3rem;">
                  <option value="Estudiante">🎓 Estudiante (Alumna/Alumno)</option>
                  <option value="Profesor">👨‍🏫 Docente / Profesor</option>
                  <option value="Acudiente">👨‍👩‍👧 Acudiente / Familia</option>
                </select>
              </label>

              <label style="font-size: 0.82rem; font-weight: 600;">
                Documento de Identidad o Usuario
                <input [(ngModel)]="docRecuperar" name="docRecuperar" required placeholder="Ej: 1000000001" style="width: 100%; margin-top: 0.3rem;" />
              </label>

              <label style="font-size: 0.82rem; font-weight: 600;">
                Motivo / Teléfono o Correo de contacto (Opcional)
                <textarea [(ngModel)]="msgRecuperar" name="msgRecuperar" rows="2" placeholder="Ej: Olvidé la contraseña, favor restablecerla..." style="width: 100%; margin-top: 0.3rem;"></textarea>
              </label>

              @if (errorRecuperar()) {
                <div class="aviso error" style="font-size: 0.82rem;">{{ errorRecuperar() }}</div>
              }

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" class="btn-secundario" (click)="cerrarModalRecuperar()">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="enviandoRecuperar()">
                  {{ enviandoRecuperar() ? 'Enviando al Admin…' : 'Enviar Solicitud al Admin' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </main>
  `
})
export class LoginComponent {
  usuario = '';
  password = '';
  rol = signal<Rol>('Profesor');
  error = signal('');
  cargando = signal(false);

  // Modal para solicitar clave perdida al Admin
  mostrarModalRecuperar = signal(false);
  rolRecuperar = 'Estudiante';
  docRecuperar = '';
  msgRecuperar = '';
  errorRecuperar = signal('');
  enviandoRecuperar = signal(false);
  mensajeSolicitudExito = signal('');

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    const sesion = this.auth.sesion();
    if (sesion?.rol === 'Admin') void this.router.navigateByUrl('/admin');
    else if (sesion?.rol === 'Director') void this.router.navigateByUrl('/director');
    else if (sesion?.rol === 'Profesor') void this.router.navigateByUrl('/profesor');
    else if (sesion?.rol === 'Estudiante') void this.router.navigateByUrl('/estudiante');
    else if (sesion?.rol === 'Acudiente') void this.router.navigateByUrl('/acudiente');
  }

  seleccionarRol(nuevo: Rol): void {
    this.rol.set(nuevo);
    this.error.set('');
  }

  etiquetaUsuario(): string {
    const r = this.rol();
    if (r === 'Admin') return 'Usuario Administrador Central';
    if (r === 'Director') return 'Usuario de Dirección Institucional';
    if (r === 'Profesor') return 'Cédula de Ciudadanía del Docente';
    if (r === 'Estudiante') return 'Número de Documento del Estudiante';
    if (r === 'Acudiente') return 'Documento o Usuario del Acudiente';
    return 'Usuario Institucional';
  }

  placeholderUsuario(): string {
    const r = this.rol();
    if (r === 'Profesor') return 'Ej: 1075283910 (Cédula de ciudadanía)';
    if (r === 'Estudiante') return 'Ej: 1000000001 (Documento)';
    if (r === 'Admin') return 'admin';
    if (r === 'Director') return 'director';
    if (r === 'Acudiente') return 'acudiente o documento';
    return 'Escribe tu usuario o documento...';
  }

  accesoRapido(usr: string, pass: string, rol: Rol): void {
    this.usuario = usr;
    this.password = pass;
    this.rol.set(rol);
    this.entrar();
  }

  entrar(): void {
    this.error.set('');
    this.mensajeSolicitudExito.set('');
    this.cargando.set(true);
    this.auth.login(this.usuario.trim(), this.password, this.rol()).subscribe({
      next: (sesion) => {
        let destino = '/profesor';
        if (sesion.rol === 'Admin') destino = '/admin';
        else if (sesion.rol === 'Director') destino = '/director';
        else if (sesion.rol === 'Estudiante') {
          destino = sesion.debeCambiarPassword ? '/estudiante/clave' : '/estudiante';
        } else if (sesion.rol === 'Acudiente') destino = '/acudiente';
        void this.router.navigateByUrl(destino);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeError(error));
      }
    });
  }

  abrirModalRecuperar(): void {
    this.mostrarModalRecuperar.set(true);
    this.errorRecuperar.set('');
    this.docRecuperar = this.usuario || '';
    if (this.rol() === 'Profesor' || this.rol() === 'Acudiente' || this.rol() === 'Estudiante') {
      this.rolRecuperar = this.rol();
    }
  }

  cerrarModalRecuperar(): void {
    this.mostrarModalRecuperar.set(false);
    this.errorRecuperar.set('');
  }

  enviarSolicitudClave(): void {
    if (!this.docRecuperar.trim()) {
      this.errorRecuperar.set('Ingresa el documento o usuario.');
      return;
    }

    this.enviandoRecuperar.set(true);
    this.errorRecuperar.set('');

    this.api.solicitarClave(this.docRecuperar.trim(), this.rolRecuperar, this.msgRecuperar.trim()).subscribe({
      next: (res) => {
        this.enviandoRecuperar.set(false);
        this.mostrarModalRecuperar.set(false);
        this.mensajeSolicitudExito.set(
          `✅ Solicitud enviada al Administrador para ${res.nombre || this.docRecuperar}. El Admin te asignará tu clave temporal.`
        );
        this.msgRecuperar = '';
      },
      error: (err) => {
        this.enviandoRecuperar.set(false);
        this.errorRecuperar.set(mensajeError(err));
      }
    });
  }
}
