import { Component, signal } from '@angular/core';
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
    <main class="login" style="padding: 1.5rem 1rem; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <section class="card login-card" style="border-radius: 24px; box-shadow: var(--shadow-lg); width: 100%; max-width: 28rem; padding: 2.2rem 1.8rem; margin: 0 auto;">
        <!-- Logo Institucional -->
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 56px; height: 56px; border-radius: 18px; background: linear-gradient(135deg, var(--primary), #0a523e); color: white; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; box-shadow: 0 8px 24px var(--primary-glow); margin-bottom: 0.65rem;">
            GIR
          </div>
          <h1 style="font-size: 1.55rem; margin-bottom: 0.25rem; font-family: var(--font-display); font-weight: 700;">Gimnasio José Eustasio Rivera</h1>
          <p style="font-size: 0.85rem; margin: 0; color: var(--text-secondary);">Sistema Institucional de Calificaciones y Asistencia</p>
        </div>

        @if (mensajeSolicitudExito()) {
          <div class="aviso exito" style="margin-bottom: 1rem; font-size: 0.85rem;">
            {{ mensajeSolicitudExito() }}
          </div>
        }

        <!-- Formulario de Acceso Unificado (ERR-004) -->
        <form (ngSubmit)="entrar()" style="display: grid; gap: 1rem;">
          <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">
            Usuario o Documento de Identidad
            <input
              [(ngModel)]="usuario"
              name="usuario"
              autocomplete="username"
              required
              placeholder="Ingresa tu cédula, documento o usuario..."
              style="width: 100%; margin-top: 0.35rem;"
            />
          </label>

          <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">
            Contraseña Institucional
            <input
              [(ngModel)]="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              style="width: 100%; margin-top: 0.35rem;"
            />
          </label>

          <!-- Enlace para solicitar restablecimiento al Admin -->
          <div style="text-align: right; margin-top: -0.25rem;">
            <button type="button" (click)="abrirModalRecuperar()" style="background: none; border: none; color: var(--primary); font-size: 0.78rem; cursor: pointer; text-decoration: underline; font-weight: 600; padding: 0;">
              🔑 ¿Olvidaste tu contraseña? Solicitar al Administrador
            </button>
          </div>

          @if (error()) { <p class="aviso error">{{ error() }}</p> }

          <button class="btn-principal" type="submit" [disabled]="cargando()" style="width: 100%; padding: 0.8rem; font-size: 0.95rem; justify-content: center; margin-top: 0.4rem; font-weight: 600;">
            {{ cargando() ? 'Verificando credenciales…' : 'Ingresar al Portal Institucional' }}
          </button>
        </form>

        <!-- Sección de Descarga Directa de APK Móvil -->
        <div style="margin-top: 1.5rem; background: linear-gradient(135deg, rgba(14, 107, 82, 0.08), rgba(37, 99, 235, 0.06)); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.9rem 1rem; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.25rem;">📱</span>
            <strong style="font-size: 0.88rem; color: var(--text-primary);">¿Usas celular Android?</strong>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.65rem;">
            Descarga nuestra aplicación móvil oficial para pase de lista con cámara y notificaciones en tiempo real.
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
                  <option value="Profesor">👨‍🏫 Docente / Profesor (Cédula)</option>
                  <option value="Acudiente">👨‍👩‍👧 Acudiente / Familia</option>
                </select>
              </label>

              <label style="font-size: 0.82rem; font-weight: 600;">
                {{ rolRecuperar === 'Profesor' ? 'Cédula de Ciudadanía del Docente' : 'Documento de Identidad o Usuario' }}
                <input
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
