import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  template: `
    <main class="login-page-container">
      <!-- Fondo de Pantalla Inmersivo: Fotografía Educativa + Desenfoque (Blur) + Degradado Esmeralda -->
      <div class="login-bg-media" aria-hidden="true"></div>
      <div class="login-bg-overlay" aria-hidden="true"></div>

      <!-- Orbes de Luz Ambiental Flotantes (Profundidad Visual) -->
      <div class="login-orb login-orb-1" aria-hidden="true"></div>
      <div class="login-orb login-orb-2" aria-hidden="true"></div>

      <!-- Tarjeta Glassmorphic Flotante del Login -->
      <section class="login-glass-card">
        <!-- Logo Institucional y Nombre del Colegio -->
        <div class="login-brand-header">
          <div class="login-brand-icon">GIR</div>
          <h1 class="login-school-title">Gimnasio José Eustasio Rivera</h1>
          <p class="login-school-sub">
            <span class="pulsing-live-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10b981; margin-right: 0.25rem;"></span>
            <span>AsisTecht · Portal Institucional Único</span>
          </p>
        </div>

        <!-- Selector Interactivo de Rol (Guía Visual Dinámica) -->
        <div class="login-role-pills" role="tablist" aria-label="Selección de perfil de acceso">
          <button
            type="button"
            class="login-role-pill-btn"
            [class.activo]="rolOrientacion() === 'Estudiante'"
            (click)="seleccionarRol('Estudiante')"
            title="Acceso para alumnas y alumnos con documento de identidad"
          >
            <span style="font-size: 1.15rem;">🎓</span>
            <span>Alumnos</span>
          </button>

          <button
            type="button"
            class="login-role-pill-btn"
            [class.activo]="rolOrientacion() === 'Profesor'"
            (click)="seleccionarRol('Profesor')"
            title="Acceso para docentes con cédula de ciudadanía"
          >
            <span style="font-size: 1.15rem;">👨‍🏫</span>
            <span>Docentes</span>
          </button>

          <button
            type="button"
            class="login-role-pill-btn"
            [class.activo]="rolOrientacion() === 'Director'"
            (click)="seleccionarRol('Director')"
            title="Acceso para directivos y secretaría académica"
          >
            <span style="font-size: 1.15rem;">🏛️</span>
            <span>Dirección</span>
          </button>

          <button
            type="button"
            class="login-role-pill-btn"
            [class.activo]="rolOrientacion() === 'Acudiente'"
            (click)="seleccionarRol('Acudiente')"
            title="Acceso para padres de familia y acudientes"
          >
            <span style="font-size: 1.15rem;">👨‍👩‍👧</span>
            <span>Familias</span>
          </button>
        </div>

        @if (mensajeSolicitudExito()) {
          <div class="aviso exito" style="margin-bottom: 1rem; font-size: 0.85rem; animation: fadeIn 0.3s ease;">
            {{ mensajeSolicitudExito() }}
          </div>
        }

        <!-- Formulario de Acceso Unificado -->
        <form (ngSubmit)="entrar()" style="display: grid; gap: 1.05rem;">
          <label style="font-weight: 600; font-size: 0.84rem; color: var(--text-primary); display: grid; gap: 0.35rem;">
            <span>{{ labelUsuario() }}</span>
            <div class="input-field-group">
              <span class="input-field-icon">👤</span>
              <input
                type="text"
                class="input-field-input"
                [(ngModel)]="usuario"
                name="usuario"
                autocomplete="username"
                required
                [placeholder]="placeholderUsuario()"
                [attr.inputmode]="rolOrientacion() === 'Profesor' || rolOrientacion() === 'Estudiante' ? 'numeric' : 'text'"
              />
            </div>
          </label>

          <label style="font-weight: 600; font-size: 0.84rem; color: var(--text-primary); display: grid; gap: 0.35rem;">
            <span>Contraseña Institucional</span>
            <div class="input-field-group">
              <span class="input-field-icon">🔒</span>
              <input
                [(ngModel)]="password"
                name="password"
                [type]="mostrarPassword() ? 'text' : 'password'"
                class="input-field-input"
                autocomplete="current-password"
                required
                placeholder="••••••••••••"
              />
              <button
                type="button"
                class="btn-toggle-eye"
                (click)="mostrarPassword.set(!mostrarPassword())"
                [title]="mostrarPassword() ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                {{ mostrarPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
          </label>

          <!-- Enlace para solicitar restablecimiento al Admin -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: -0.3rem;">
            <small style="color: var(--text-muted); font-size: 0.74rem;">
              Año Lectivo 2026
            </small>
            <button
              type="button"
              (click)="abrirModalRecuperar()"
              style="background: none; border: none; color: var(--primary); font-size: 0.78rem; cursor: pointer; text-decoration: underline; font-weight: 600; padding: 0.2rem 0; transition: color 0.2s;"
            >
              🔑 ¿Olvidaste tu contraseña?
            </button>
          </div>

          @if (error()) {
            <p class="aviso error" style="margin: 0; animation: fadeIn 0.25s ease;">{{ error() }}</p>
          }

          <button
            class="btn-principal btn-login-submit"
            type="submit"
            [disabled]="cargando()"
          >
            @if (cargando()) {
              <span>⏳ Verificando credenciales…</span>
            } @else {
              <span>✨ Ingresar al Portal Institucional</span>
            }
          </button>
        </form>

        <!-- Sección de Descarga Directa de APK Móvil -->
        <div class="login-apk-banner">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.25rem;">📱</span>
            <strong style="font-size: 0.88rem; color: var(--text-primary);">¿Usas celular Android?</strong>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.65rem; line-height: 1.35;">
            Descarga nuestra aplicación móvil oficial para pase de lista con cámara y notificaciones en tiempo real.
          </p>

          <a href="/downloads/asisttecht-movil.apk" download="asisttecht-movil.apk" class="btn-principal login-apk-btn">
            <span>📥</span> Descargar App Oficial (.APK)
          </a>
        </div>
      </section>

      <!-- Modal de Solicitud de Restablecimiento de Clave al Administrador -->
      @if (mostrarModalRecuperar()) {
        <div class="modal-backdrop" (click)="cerrarModalRecuperar()">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 27rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-radius: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h2 style="font-size: 1.2rem; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                <span>🔑</span> Solicitar Contraseña al Admin
              </h2>
              <button type="button" class="btn-cerrar-drawer" style="width: 28px; height: 28px;" (click)="cerrarModalRecuperar()">✕</button>
            </div>

            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.45;">
              Si perdiste o no recuerdas tu contraseña, envía tu documento. El <strong>Administrador Central</strong> recibirá una notificación prioritaria y te asignará una nueva clave temporal para que ingreses y la actualices una única vez.
            </p>

            <form (ngSubmit)="enviarSolicitudClave()" style="display: grid; gap: 0.85rem;">
              <label style="font-size: 0.82rem; font-weight: 600;">
                Tipo de Usuario / Rol
                <select [(ngModel)]="rolRecuperar" name="rolRecuperar" style="width: 100%; margin-top: 0.3rem;">
                  <option value="Estudiante">🎓 Estudiante (Alumna/Alumno)</option>
                  <option value="Profesor">👨‍🏫 Docente / Profesor (Cédula)</option>
                  <option value="Acudiente">👨‍👩‍👧 Acudiente / Familia</option>
                </select>
              </label>

              <label style="font-size: 0.82rem; font-weight: 600;">
                {{ rolRecuperar === 'Profesor' ? 'Cédula de Ciudadanía del Docente' : 'Documento de Identidad o Usuario' }}
                <input
                  type="text"
                  [(ngModel)]="docRecuperar"
                  name="docRecuperar"
                  required
                  [attr.inputmode]="rolRecuperar === 'Profesor' || rolRecuperar === 'Estudiante' ? 'numeric' : 'text'"
                  [attr.pattern]="rolRecuperar === 'Profesor' ? '[0-9]*' : null"
                  (input)="filtrarDocRecuperar($event)"
                  placeholder="Ej: 1075283910"
                  style="width: 100%; margin-top: 0.3rem;"
                />
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
  error = signal('');
  cargando = signal(false);
  mostrarPassword = signal(false);
  rolOrientacion = signal<'Todos' | 'Estudiante' | 'Profesor' | 'Director' | 'Acudiente'>('Todos');

  placeholderUsuario = computed(() => {
    switch (this.rolOrientacion()) {
      case 'Estudiante':
        return 'Ingresa documento de identidad (TI o CC)...';
      case 'Profesor':
        return 'Ingresa tu número de cédula...';
      case 'Director':
        return 'Ingresa usuario (ej: director)...';
      case 'Acudiente':
        return 'Ingresa documento del acudiente...';
      default:
        return 'Ingresa tu cédula, documento o usuario...';
    }
  });

  labelUsuario = computed(() => {
    switch (this.rolOrientacion()) {
      case 'Estudiante':
        return 'Documento de Identidad del Alumno';
      case 'Profesor':
        return 'Cédula de Ciudadanía del Docente';
      case 'Director':
        return 'Usuario Directivo';
      case 'Acudiente':
        return 'Documento del Acudiente / Familia';
      default:
        return 'Usuario o Documento de Identidad';
    }
  });

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

  seleccionarRol(rol: 'Estudiante' | 'Profesor' | 'Director' | 'Acudiente'): void {
    if (this.rolOrientacion() === rol) {
      this.rolOrientacion.set('Todos');
    } else {
      this.rolOrientacion.set(rol);
    }
  }

  entrar(): void {
    if (!this.usuario.trim() || !this.password) {
      this.error.set('Por favor ingresa tu usuario/documento y contraseña.');
      return;
    }

    this.error.set('');
    this.mensajeSolicitudExito.set('');
    this.cargando.set(true);

    this.auth.login(this.usuario.trim(), this.password).subscribe({
      next: (sesion) => {
        let destino = '/profesor';
        if (sesion.rol === 'Admin') destino = '/admin';
        else if (sesion.rol === 'Director') destino = '/director';
        else if (sesion.rol === 'Profesor') destino = '/profesor';
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

  filtrarDocRecuperar(e: Event): void {
    if (this.rolRecuperar === 'Profesor') {
      const val = (e.target as HTMLInputElement).value;
      this.docRecuperar = val.replace(/[^0-9]/g, '');
    }
  }

  abrirModalRecuperar(): void {
    this.mostrarModalRecuperar.set(true);
    this.errorRecuperar.set('');
    this.docRecuperar = this.usuario || '';
  }

  cerrarModalRecuperar(): void {
    this.mostrarModalRecuperar.set(false);
    this.errorRecuperar.set('');
  }

  enviarSolicitudClave(): void {
    const doc = this.docRecuperar.trim();
    if (!doc) {
      this.errorRecuperar.set('Ingresa el documento o usuario.');
      return;
    }

    if (this.rolRecuperar === 'Profesor' && !/^\d+$/.test(doc)) {
      this.errorRecuperar.set('La cédula del docente debe contener únicamente números.');
      return;
    }

    this.enviandoRecuperar.set(true);
    this.errorRecuperar.set('');

    this.api.solicitarClave(doc, this.rolRecuperar, this.msgRecuperar.trim()).subscribe({
      next: (res) => {
        this.enviandoRecuperar.set(false);
        this.mostrarModalRecuperar.set(false);
        this.mensajeSolicitudExito.set(
          `✅ Solicitud enviada al Administrador para ${res.nombre || doc}. El Admin te asignará tu clave temporal.`
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
