import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-clave',
  imports: [FormsModule, CommonModule],
  template: `
    <section class="pagina" style="max-width: 38rem; padding: 2rem 1.25rem 4rem;">
      <!-- Banner de Primer Inicio / Clave Temporal Obligatoria -->
      @if (esCambioObligatorio()) {
        <div class="card" style="border: 2px solid #f59e0b; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.08)); margin-bottom: 1.75rem; border-radius: var(--radius-lg); padding: 1.25rem 1.5rem;">
          <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
            <span style="font-size: 2rem; line-height: 1;">🔒</span>
            <div>
              <h2 style="font-size: 1.2rem; color: #b45309; margin: 0 0 0.35rem; font-family: var(--font-display);">
                Cambio Obligatorio de Contraseña Provisional
              </h2>
              <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.45;">
                Ingresaste al sistema con una clave temporal asignada por tu docente o por la plataforma.
                Por directriz de seguridad del <strong>Gimnasio José Eustasio Rivera</strong>, debes establecer una contraseña privada antes de ingresar a tus calificaciones, carnet QR y observador.
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Tarjeta Principal de Cambio de Clave -->
      <div class="card" style="border-radius: var(--radius-lg); padding: 2rem 1.75rem; box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--primary), #0a523e); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
            🛡️
          </div>
          <div>
            <h1 style="font-size: 1.45rem; margin: 0;">Seguridad y Contraseña</h1>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.15rem 0 0;">
              Administra tus credenciales de acceso institucional
            </p>
          </div>
        </div>

        <form (ngSubmit)="guardar()" style="display: grid; gap: 1.25rem;">
          <!-- Clave Actual -->
          <div>
            <label style="display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.4rem; color: var(--text-primary);">
              {{ esCambioObligatorio() ? 'Clave Temporal (asignada)' : 'Contraseña Actual' }}
            </label>
            <div style="position: relative;">
              <input
                [type]="verActual() ? 'text' : 'password'"
                [ngModel]="actual()"
                (ngModelChange)="actual.set($event)"
                name="actual"
                required
                placeholder="Ingresa la clave actual"
                style="width: 100%; padding-right: 2.75rem;"
              />
              <button
                type="button"
                (click)="verActual.set(!verActual())"
                style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.05rem;"
                title="Mostrar u ocultar contraseña"
              >
                {{ verActual() ? '👁️' : '🙈' }}
              </button>
            </div>
          </div>

          <!-- Nueva Contraseña -->
          <div>
            <label style="display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.4rem; color: var(--text-primary);">
              Nueva Contraseña Segura
            </label>
            <div style="position: relative;">
              <input
                [type]="verNueva() ? 'text' : 'password'"
                [ngModel]="nueva()"
                (ngModelChange)="nueva.set($event); aviso.set('')"
                name="nueva"
                required
                placeholder="Mínimo 8 caracteres, mayúsculas, números y símbolos"
                style="width: 100%; padding-right: 2.75rem;"
              />
              <button
                type="button"
                (click)="verNueva.set(!verNueva())"
                style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.05rem;"
                title="Mostrar u ocultar contraseña"
              >
                {{ verNueva() ? '👁️' : '🙈' }}
              </button>
            </div>

            <!-- Barra de Fortaleza Reactiva en Tiempo Real -->
            @if (nueva().length > 0) {
              <div style="margin-top: 0.65rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                  <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Nivel de seguridad:</span>
                  <span style="font-size: 0.75rem; font-weight: 700;" [style.color]="colorFortaleza()">{{ textoFortaleza() }}</span>
                </div>
                <div style="height: 6px; width: 100%; background: var(--bg-hover); border-radius: var(--radius-pill); overflow: hidden; display: flex; gap: 2px;">
                  <div style="height: 100%; border-radius: var(--radius-pill); transition: all 0.3s ease;" [style.width]="porcentajeFortaleza() + '%'" [style.background]="colorFortaleza()"></div>
                </div>
              </div>
            }
          </div>

          <!-- Confirmar Nueva Contraseña -->
          <div>
            <label style="display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.4rem; color: var(--text-primary);">
              Repetir Nueva Contraseña
            </label>
            <input
              type="password"
              [ngModel]="repetirNueva()"
              (ngModelChange)="repetirNueva.set($event)"
              name="repetirNueva"
              required
              placeholder="Vuelve a escribir la clave nueva exactamente igual"
              style="width: 100%;"
            />
            @if (repetirNueva().length > 0 && repetirNueva() !== nueva()) {
              <small style="color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                ⚠️ Las contraseñas no coinciden.
              </small>
            }
          </div>

          <!-- Checklist de Requisitos de Seguridad Institucional Reactivo -->
          <div style="background: var(--bg-hover); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
            <span style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">
              Políticas de Contraseña Requeridas:
            </span>
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; font-size: 0.82rem;">
              <li [style.color]="tieneLargo() ? '#059669' : 'var(--text-muted)'" style="display: flex; align-items: center; gap: 0.45rem;">
                <span>{{ tieneLargo() ? '✅' : '⚪' }}</span>
                Mínimo 8 caracteres de longitud
              </li>
              <li [style.color]="tieneMayuscula() ? '#059669' : 'var(--text-muted)'" style="display: flex; align-items: center; gap: 0.45rem;">
                <span>{{ tieneMayuscula() ? '✅' : '⚪' }}</span>
                Al menos una letra mayúscula (A-Z)
              </li>
              <li [style.color]="tieneMinuscula() ? '#059669' : 'var(--text-muted)'" style="display: flex; align-items: center; gap: 0.45rem;">
                <span>{{ tieneMinuscula() ? '✅' : '⚪' }}</span>
                Al menos una letra minúscula (a-z)
              </li>
              <li [style.color]="tieneNumero() ? '#059669' : 'var(--text-muted)'" style="display: flex; align-items: center; gap: 0.45rem;">
                <span>{{ tieneNumero() ? '✅' : '⚪' }}</span>
                Al menos un dígito numérico (0-9)
              </li>
              <li [style.color]="tieneEspecial() ? '#059669' : 'var(--text-muted)'" style="display: flex; align-items: center; gap: 0.45rem;">
                <span>{{ tieneEspecial() ? '✅' : '⚪' }}</span>
                Al menos un símbolo especial (&#64; $ ! % * ? &amp; # / + = _ . -)
              </li>
            </ul>
          </div>

          @if (aviso()) {
            <div class="aviso" [class.error]="esError()" [class.exito]="!esError()" style="margin: 0; font-size: 0.85rem; padding: 0.75rem 1rem; border-radius: var(--radius-md);">
              {{ aviso() }}
            </div>
          }

          <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem;">
            <button
              class="btn-principal"
              type="submit"
              [disabled]="guardando() || !formularioValido()"
              style="padding: 0.75rem 1.5rem; font-size: 0.95rem; font-weight: 700; flex: 1; justify-content: center;"
            >
              {{ guardando() ? 'Validando y Guardando…' : 'Establecer Contraseña' }}
            </button>

            @if (claveActualizadaConExito() && auth.rol() === 'Estudiante') {
              <button
                type="button"
                class="btn-secundario"
                (click)="irAlPortal()"
                style="padding: 0.75rem 1.25rem; font-size: 0.95rem; font-weight: 700;"
              >
                Ir a mi Portal ➔
              </button>
            }
          </div>
        </form>
      </div>
    </section>
  `
})
export class ClaveComponent {
  private api = inject(ApiService);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  actual = signal('');
  nueva = signal('');
  repetirNueva = signal('');

  verActual = signal(false);
  verNueva = signal(false);
  guardando = signal(false);
  aviso = signal('');
  esError = signal(false);
  claveActualizadaConExito = signal(false);

  esCambioObligatorio = computed(() => {
    return this.auth.rol() === 'Estudiante' && this.auth.debeCambiarPassword();
  });

  tieneLargo = computed(() => this.nueva().length >= 8);
  tieneMayuscula = computed(() => /[A-Z]/.test(this.nueva()));
  tieneMinuscula = computed(() => /[a-z]/.test(this.nueva()));
  tieneNumero = computed(() => /[0-9]/.test(this.nueva()));
  tieneEspecial = computed(() => /[^a-zA-Z0-9\s]/.test(this.nueva()));

  puntosFortaleza = computed(() => {
    let pts = 0;
    if (this.tieneLargo()) pts++;
    if (this.tieneMayuscula()) pts++;
    if (this.tieneMinuscula()) pts++;
    if (this.tieneNumero()) pts++;
    if (this.tieneEspecial()) pts++;
    return pts;
  });

  porcentajeFortaleza = computed(() => {
    return (this.puntosFortaleza() / 5) * 100;
  });

  textoFortaleza = computed(() => {
    const pts = this.puntosFortaleza();
    if (pts <= 2) return 'Muy Débil';
    if (pts === 3) return 'Media';
    if (pts === 4) return 'Buena';
    return 'Excelente y Segura';
  });

  colorFortaleza = computed(() => {
    const pts = this.puntosFortaleza();
    if (pts <= 2) return '#ef4444';
    if (pts === 3) return '#f59e0b';
    if (pts === 4) return '#3b82f6';
    return '#10b981';
  });

  formularioValido = computed(() => {
    return (
      this.actual().trim().length > 0 &&
      this.tieneLargo() &&
      this.tieneMayuscula() &&
      this.tieneMinuscula() &&
      this.tieneNumero() &&
      this.tieneEspecial() &&
      this.nueva() === this.repetirNueva()
    );
  });

  guardar(): void {
    if (!this.formularioValido()) {
      this.esError.set(true);
      this.aviso.set('Verifica que la contraseña cumpla todos los requisitos y coincida.');
      return;
    }

    this.guardando.set(true);
    this.aviso.set('');

    this.api.cambiarClave(this.actual(), this.nueva()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.esError.set(false);
        this.claveActualizadaConExito.set(true);
        this.auth.actualizarDebeCambiarPassword(false);

        this.actual.set('');
        this.nueva.set('');
        this.repetirNueva.set('');
        this.aviso.set('✅ ¡Contraseña actualizada exitosamente! Tu cuenta está protegida.');

        // Si es estudiante y tenía cambio obligatorio, redirigir al carnet
        if (this.auth.rol() === 'Estudiante') {
          setTimeout(() => {
            void this.router.navigateByUrl('/estudiante');
          }, 1500);
        }
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.esError.set(true);
        this.aviso.set(mensajeError(error));
      }
    });
  }

  irAlPortal(): void {
    void this.router.navigateByUrl('/estudiante');
  }
}
