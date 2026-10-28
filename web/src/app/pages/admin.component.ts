import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Estudiante, Grupo, ResumenAdmin, SolicitudClave } from '../core/models';
import { mensajeError } from '../core/errores';

interface ToastNotif {
  id: number;
  tipo: 'exito' | 'error' | 'alerta' | 'info';
  titulo: string;
  mensaje: string;
  icono: string;
}

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <!-- Contenedor Flotante de Notificaciones Pop-up (Toasts) -->
      <div class="toast-container" aria-live="polite">
        @for (t of toasts(); track t.id) {
          <div class="toast-card" [class]="'toast-' + t.tipo">
            <span class="toast-icono">{{ t.icono }}</span>
            <div style="flex: 1; min-width: 0;">
              <strong class="toast-titulo">{{ t.titulo }}</strong>
              <p class="toast-mensaje">{{ t.mensaje }}</p>
            </div>
            <button type="button" class="toast-cerrar" (click)="cerrarToast(t.id)" title="Cerrar notificación">✕</button>
          </div>
        }
      </div>

      <!-- Encabezado Institucional -->
      <div class="entre" style="margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.8rem;">⚙️</span>
            <h1 style="margin: 0;">Panel de Administración Central</h1>
          </div>
          <p class="lead" style="margin: 0;">
            Gobierno institucional de usuarios, matrículas, vinculación familiar y control de estado en base de datos.
          </p>
        </div>

        @if (solicitudesPendientesCount() > 0) {
          <div class="badge badge-amarillo" style="font-size: 0.88rem; padding: 0.5rem 1rem; border-radius: var(--radius-pill); cursor: pointer;" (click)="tabActiva.set('solicitudes')">
            🔔 {{ solicitudesPendientesCount() }} Solicitudes de clave pendientes
          </div>
        }
      </div>

      <!-- Modal de Notificación de Credenciales Asignadas -->
      @if (modalClave()) {
        <div class="modal-backdrop" (click)="cerrarModalClave()">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 28rem; width: 92%; margin: 0 auto; text-align: center; border-top: 4px solid var(--primary); box-shadow: var(--shadow-lg);">
            <span style="font-size: 2.75rem; display: block; margin-bottom: 0.5rem;">🔑</span>
            <h2 style="font-size: 1.35rem; margin-bottom: 0.25rem;">Credencial Generada</h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
              Usuario: <strong>{{ modalClave()?.nombre }}</strong>
            </p>

            <div style="background: var(--bg-hover); border: 2px dashed var(--primary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                Clave Provisional de Acceso:
              </span>
              <strong style="font-size: 1.4rem; font-family: monospace; letter-spacing: 0.08em; color: var(--primary);">
                {{ modalClave()?.clave }}
              </strong>
            </div>

            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
              ⚠️ El usuario ingresará con esta clave temporal y el sistema le solicitará cambiarla obligatoriamente una única vez.
            </p>

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button type="button" class="btn-principal" (click)="copiarClave(modalClave()?.clave || '')">
                📋 {{ copiado() ? '¡Copiada!' : 'Copiar Clave' }}
              </button>
              <button type="button" class="btn-secundario" (click)="cerrarModalClave()">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Pop-up para Inactivar Estudiante con Motivo -->
      @if (estudianteParaInactivar()) {
        <div class="modal-backdrop" (click)="cerrarModalInactivacion()">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 30rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid #ef4444;">
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem;">
              <span style="font-size: 2rem;">⚠️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0;">Inactivar Estudiante</h2>
                <small style="color: var(--text-muted);">El alumno no podrá ingresar ni consultar calificaciones</small>
              </div>
            </div>

            <div style="background: var(--bg-hover); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem;">
              <strong style="display: block; font-size: 0.95rem;">{{ estudianteParaInactivar()?.nombre }}</strong>
              <span style="font-size: 0.82rem; color: var(--text-secondary);">Doc: {{ estudianteParaInactivar()?.documento }} · Grupo: {{ estudianteParaInactivar()?.grupo || 'GIR' }}</span>
            </div>

            <form (ngSubmit)="confirmarInactivacionEstudiante()" style="display: grid; gap: 0.85rem;">
              <label style="font-size: 0.85rem; font-weight: 600;">
                Motivo de la Inactivación:
                <select [(ngModel)]="motivoInactivacionSeleccionado" name="motivoInactivacionSeleccionado" style="width: 100%; margin-top: 0.35rem;" required>
                  <option value="Suspensión disciplinaria temporal">Suspensión disciplinaria temporal</option>
                  <option value="Retiro voluntario / Traslado de institución">Retiro voluntario / Traslado de institución</option>
                  <option value="Trámite administrativo / Falta de documentación">Trámite administrativo / Falta de documentación</option>
                  <option value="Inasistencia reiterada prolongada">Inasistencia reiterada prolongada</option>
                  <option value="Mora o pendiente con secretaría académica">Mora o pendiente con secretaría académica</option>
                  <option value="OTRO">Otro motivo específico...</option>
                </select>
              </label>

              @if (motivoInactivacionSeleccionado === 'OTRO') {
                <label style="font-size: 0.85rem; font-weight: 600;">
                  Detalle del Motivo:
                  <input [(ngModel)]="motivoInactivacionOtro" name="motivoInactivacionOtro" required placeholder="Escribe la razón detallada..." style="width: 100%; margin-top: 0.35rem;" />
                </label>
              }

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" class="btn-secundario" (click)="cerrarModalInactivacion()">Cancelar</button>
                <button type="submit" class="btn-peligro" [disabled]="inactivando()">
                  {{ inactivando() ? 'Inactivando…' : 'Confirmar Inactivación' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Pop-up para Crear Nuevo Grado / Grupo Escolar Rápido -->
      @if (mostrarModalNuevoGrupo()) {
        <div class="modal-backdrop" (click)="mostrarModalNuevoGrupo.set(false)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 25rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg);">
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">Crear Grado / Grupo Escolar</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Ingresa el nombre del grado o grupo para asignar a los estudiantes (ej. 10-A, 11-B, Grado Noveno).
            </p>
            <form (ngSubmit)="guardarNuevoGrupo()" style="display: grid; gap: 0.75rem;">
              <input [(ngModel)]="nombreNuevoGrupo" name="nombreNuevoGrupo" required placeholder="Ej: 10-A" style="width: 100%;" />
              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.35rem;">
                <button type="button" class="btn-secundario" (click)="mostrarModalNuevoGrupo.set(false)">Cancelar</button>
                <button type="submit" class="btn-principal">Guardar Grado</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Editar Estudiante -->
      @if (estudianteParaEditar()) {
        <div class="modal-backdrop" (click)="estudianteParaEditar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 32rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid var(--primary);">
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.8rem;">✏️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0;">Editar Estudiante</h2>
                <small style="color: var(--text-muted);">Actualiza los datos institucionales del alumno</small>
              </div>
            </div>

            <form (ngSubmit)="guardarEdicionEstudiante()" style="display: grid; gap: 0.85rem;">
              <label style="font-size: 0.85rem; font-weight: 600;">Nombre Completo
                <input [(ngModel)]="editEstNombre" name="editEstNombre" required style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <label style="font-size: 0.85rem; font-weight: 600;">Documento de Identidad
                <input [(ngModel)]="editEstDocumento" name="editEstDocumento" inputmode="numeric" required style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <label style="font-size: 0.85rem; font-weight: 600;">Grado / Grupo Escolar
                <select [(ngModel)]="editEstGrupoId" name="editEstGrupoId" required style="width: 100%; margin-top: 0.35rem;">
                  <option [ngValue]="0">Sin grupo asignado</option>
                  @for (g of grupos(); track g.id) {
                    <option [ngValue]="g.id">{{ g.nombre }}</option>
                  }
                </select>
              </label>

              <label style="font-size: 0.85rem; font-weight: 600;">Acudiente Vinculado
                <select [(ngModel)]="editEstAcudienteId" name="editEstAcudienteId" style="width: 100%; margin-top: 0.35rem;">
                  <option [ngValue]="0">Sin acudiente vinculado</option>
                  @for (ac of acudientes(); track ac.id) {
                    <option [ngValue]="ac.id">{{ ac.nombre }} (Doc. {{ ac.documento }})</option>
                  }
                </select>
              </label>

              <label style="font-size: 0.85rem; font-weight: 600;">Nueva Contraseña (Opcional)
                <input [(ngModel)]="editEstPassword" name="editEstPassword" type="password" placeholder="Dejar en blanco para conservar actual" style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" class="btn-secundario" (click)="estudianteParaEditar.set(null)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardandoEdicion()">
                  {{ guardandoEdicion() ? 'Guardando…' : 'Guardar Cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Eliminar Estudiante -->
      @if (estudianteParaEliminar()) {
        <div class="modal-backdrop" (click)="estudianteParaEliminar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 28rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid #ef4444; text-align: center;">
            <span style="font-size: 2.75rem; display: block; margin-bottom: 0.5rem;">🗑️</span>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.35rem; color: #ef4444;">¿Eliminar Estudiante?</h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Estás a punto de eliminar definitivamente del sistema a:
            </p>

            <div style="background: var(--bg-hover); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 1rem;">
              <strong style="display: block; font-size: 1.05rem;">{{ estudianteParaEliminar()?.nombre }}</strong>
              <span style="font-size: 0.82rem; color: var(--text-muted);">Doc. {{ estudianteParaEliminar()?.documento }} · {{ estudianteParaEliminar()?.grupo }}</span>
            </div>

            <p style="font-size: 0.8rem; color: #ef4444; margin-bottom: 1.25rem; line-height: 1.4;">
              ⚠️ Esta acción borrará permanentemente sus asistencias, notas, carnet, biometría facial y observaciones de convivencia asociadas.
            </p>

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button type="button" class="btn-secundario" (click)="estudianteParaEliminar.set(null)">Cancelar</button>
              <button type="button" class="btn-peligro" [disabled]="eliminando()" (click)="confirmarEliminarEstudiante()">
                {{ eliminando() ? 'Eliminando…' : 'Sí, Eliminar Definitivamente' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Editar Docente -->
      @if (profesorParaEditar()) {
        <div class="modal-backdrop" (click)="profesorParaEditar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 30rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid var(--primary);">
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.8rem;">✏️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0;">Editar Docente</h2>
                <small style="color: var(--text-muted);">Actualiza los datos del profesor</small>
              </div>
            </div>

            <form (ngSubmit)="guardarEdicionProfesor()" style="display: grid; gap: 0.85rem;">
              <label style="font-size: 0.85rem; font-weight: 600;">Nombre Completo
                <input [(ngModel)]="editDocNombre" name="editDocNombre" required style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <label style="font-size: 0.85rem; font-weight: 600;">Cédula de Ciudadanía (Acceso)
                <input [(ngModel)]="editDocUsuario" name="editDocUsuario" inputmode="numeric" required placeholder="Número de cédula" style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <label style="font-size: 0.85rem; font-weight: 600;">Nueva Contraseña (Opcional)
                <input [(ngModel)]="editDocPassword" name="editDocPassword" type="password" placeholder="Dejar en blanco para conservar actual" style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" class="btn-secundario" (click)="profesorParaEditar.set(null)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardandoEdicion()">
                  {{ guardandoEdicion() ? 'Guardando…' : 'Guardar Cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Eliminar Docente -->
      @if (profesorParaEliminar()) {
        <div class="modal-backdrop" (click)="profesorParaEliminar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 28rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid #ef4444; text-align: center;">
            <span style="font-size: 2.75rem; display: block; margin-bottom: 0.5rem;">🗑️</span>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.35rem; color: #ef4444;">¿Eliminar Docente?</h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Estás a punto de eliminar al profesor:
            </p>

            <div style="background: var(--bg-hover); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 1rem;">
              <strong style="display: block; font-size: 1.05rem;">{{ profesorParaEliminar()?.nombre }}</strong>
              <span style="font-size: 0.82rem; color: var(--text-muted);">Usuario: {{ profesorParaEliminar()?.usuario }}</span>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
              ℹ️ Sus grupos y asignaturas serán reasignados automáticamente a otro docente activo para no dejar cursos desatendidos.
            </p>

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button type="button" class="btn-secundario" (click)="profesorParaEliminar.set(null)">Cancelar</button>
              <button type="button" class="btn-peligro" [disabled]="eliminando()" (click)="confirmarEliminarProfesor()">
                {{ eliminando() ? 'Eliminando…' : 'Sí, Eliminar Docente' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Editar Acudiente -->
      @if (acudienteParaEditar()) {
        <div class="modal-backdrop" (click)="acudienteParaEditar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 34rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid var(--primary);">
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.8rem;">✏️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0;">Editar Acudiente / Familia</h2>
                <small style="color: var(--text-muted);">Actualiza datos personales y amarre de hijos</small>
              </div>
            </div>

            <form (ngSubmit)="guardarEdicionAcudiente()" style="display: grid; gap: 0.85rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <label style="font-size: 0.85rem; font-weight: 600;">Nombre Completo
                  <input [(ngModel)]="editAcudNombre" name="editAcudNombre" required style="width: 100%; margin-top: 0.35rem;" />
                </label>

                <label style="font-size: 0.85rem; font-weight: 600;">Documento
                  <input [(ngModel)]="editAcudDocumento" name="editAcudDocumento" inputmode="numeric" required style="width: 100%; margin-top: 0.35rem;" />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <label style="font-size: 0.85rem; font-weight: 600;">Teléfono
                  <input [(ngModel)]="editAcudTelefono" name="editAcudTelefono" style="width: 100%; margin-top: 0.35rem;" />
                </label>

                <label style="font-size: 0.85rem; font-weight: 600;">Correo Electrónico
                  <input [(ngModel)]="editAcudCorreo" name="editAcudCorreo" type="email" style="width: 100%; margin-top: 0.35rem;" />
                </label>
              </div>

              <label style="font-size: 0.85rem; font-weight: 600;">Nueva Contraseña (Opcional)
                <input [(ngModel)]="editAcudPassword" name="editAcudPassword" type="password" placeholder="Dejar en blanco para conservar actual" style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <div>
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">
                  Estudiantes Amarrados (Hijos a cargo):
                  <span class="badge badge-verde" style="font-size: 0.7rem; margin-left: 0.35rem;">
                    {{ editHijosSeleccionados.size }} hijo(s) seleccionado(s)
                  </span>
                </label>
                <div style="max-height: 10rem; overflow-y: auto; background: var(--bg-hover); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: 0.35rem;">
                  @for (est of estudiantes(); track est.id) {
                    <label style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; cursor: pointer; padding: 0.25rem 0.4rem; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                      <input type="checkbox" [checked]="editHijosSeleccionados.has(est.id)" (change)="toggleEditHijo(est.id)" />
                      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <strong>{{ est.nombre }}</strong> ({{ est.grupo }})
                      </span>
                    </label>
                  }
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" class="btn-secundario" (click)="acudienteParaEditar.set(null)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardandoEdicion()">
                  {{ guardandoEdicion() ? 'Guardando…' : 'Guardar Cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Eliminar Acudiente -->
      @if (acudienteParaEliminar()) {
        <div class="modal-backdrop" (click)="acudienteParaEliminar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 28rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid #ef4444; text-align: center;">
            <span style="font-size: 2.75rem; display: block; margin-bottom: 0.5rem;">🗑️</span>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.35rem; color: #ef4444;">¿Eliminar Acudiente?</h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Estás a punto de eliminar a:
            </p>

            <div style="background: var(--bg-hover); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 1rem;">
              <strong style="display: block; font-size: 1.05rem;">{{ acudienteParaEliminar()?.nombre }}</strong>
              <span style="font-size: 0.82rem; color: var(--text-muted);">Doc. {{ acudienteParaEliminar()?.documento }}</span>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
              ℹ️ Sus hijos matriculados no serán eliminados, únicamente quedarán desvinculados de esta cuenta familiar.
            </p>

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button type="button" class="btn-secundario" (click)="acudienteParaEliminar.set(null)">Cancelar</button>
              <button type="button" class="btn-peligro" [disabled]="eliminando()" (click)="confirmarEliminarAcudiente()">
                {{ eliminando() ? 'Eliminando…' : 'Sí, Eliminar Acudiente' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Navegación por Tabs del Panel Admin -->
      <div class="segmento-toggle" style="margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button type="button" [class.activo]="tabActiva() === 'resumen'" (click)="tabActiva.set('resumen')">
          📊 Resumen del Campus
        </button>
        <button type="button" [class.activo]="tabActiva() === 'solicitudes'" (click)="tabActiva.set('solicitudes')">
          🔐 Solicitudes de Clave
          @if (solicitudesPendientesCount() > 0) {
            <span class="badge badge-amarillo" style="font-size: 0.7rem; margin-left: 0.35rem;">{{ solicitudesPendientesCount() }}</span>
          }
        </button>
        <button type="button" [class.activo]="tabActiva() === 'estudiantes'" (click)="tabActiva.set('estudiantes')">
          🎓 Estudiantes ({{ estudiantes().length }})
        </button>
        <button type="button" [class.activo]="tabActiva() === 'docentes'" (click)="tabActiva.set('docentes')">
          👨‍🏫 Docentes ({{ profesores().length }})
        </button>
        <button type="button" [class.activo]="tabActiva() === 'acudientes'" (click)="tabActiva.set('acudientes')">
          👨‍👩‍👧 Familias / Acudientes ({{ acudientes().length }})
        </button>
      </div>

      <!-- ======================================================================
           TAB 1: RESUMEN DEL CAMPUS (TABLERO DIRECTIVO EJECUTIVO)
           ====================================================================== -->
      @if (tabActiva() === 'resumen') {
        <!-- Banner Institucional de Cabecera -->
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(14, 107, 82, 0.08), rgba(124, 58, 237, 0.06)); border: 1.5px solid var(--border); padding: 1.5rem;">
          <div class="entre" style="flex-wrap: wrap; gap: 1rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="logo-escuela" style="width: 54px; height: 54px; font-size: 1.4rem;">GIR</div>
              <div>
                <h2 style="font-size: 1.35rem; margin: 0; color: var(--text-primary);">Campus Central · Gimnasio José Eustasio Rivera</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
                  Año Lectivo 2026 · Sistema Integrado de Control Escolar, Convivencia y Calificaciones MEN 1290
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge badge-verde" style="font-size: 0.78rem; padding: 0.4rem 0.85rem;">
                🟢 Servidores Operacionales
              </span>
              <span class="badge" style="background: var(--bg-hover); font-size: 0.78rem; padding: 0.4rem 0.85rem; color: var(--text-secondary);">
                🛡️ Cifrado BCrypt Activo
              </span>
            </div>
          </div>
        </div>

        <!-- Grilla de KPIs y Métricas Principales -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14.5rem, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <!-- KPI 1: Estudiantes -->
          <div class="card stat-card" style="cursor: pointer; transition: transform 0.2s;" (click)="tabActiva.set('estudiantes')">
            <div class="entre" style="margin-bottom: 0.4rem;">
              <span class="stat-label">🎓 Estudiantes Matriculados</span>
              <span style="font-size: 1.3rem;">🎓</span>
            </div>
            <strong class="stat-valor">{{ resumen()?.estudiantes?.total || 0 }}</strong>
            <div style="display: flex; gap: 0.4rem; margin-top: 0.4rem;">
              <span class="badge badge-verde" style="font-size: 0.7rem;">{{ resumen()?.estudiantes?.activos || 0 }} activos</span>
              @if ((resumen()?.estudiantes?.inactivos || 0) > 0) {
                <span class="badge badge-rojo" style="font-size: 0.7rem;">{{ resumen()?.estudiantes?.inactivos }} inactivos</span>
              }
            </div>
          </div>

          <!-- KPI 2: Docentes -->
          <div class="card stat-card" style="cursor: pointer;" (click)="tabActiva.set('docentes')">
            <div class="entre" style="margin-bottom: 0.4rem;">
              <span class="stat-label">👨‍🏫 Planta Docente</span>
              <span style="font-size: 1.3rem;">👨‍🏫</span>
            </div>
            <strong class="stat-valor">{{ resumen()?.profesores?.total || 0 }}</strong>
            <span style="font-size: 0.78rem; color: #059669; font-weight: 600; display: block; margin-top: 0.4rem;">
              ✓ {{ resumen()?.profesores?.activos || 0 }} con Cédula Verificada
            </span>
          </div>

          <!-- KPI 3: Familias -->
          <div class="card stat-card" style="cursor: pointer;" (click)="tabActiva.set('acudientes')">
            <div class="entre" style="margin-bottom: 0.4rem;">
              <span class="stat-label">👨‍👩‍👧 Familias / Acudientes</span>
              <span style="font-size: 1.3rem;">👨‍👩‍👧</span>
            </div>
            <strong class="stat-valor">{{ resumen()?.acudientes?.total || 0 }}</strong>
            <span style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-top: 0.4rem;">
              Boletín oficial y observador habilitado
            </span>
          </div>

          <!-- KPI 4: Solicitudes de Clave -->
          <div class="card stat-card" style="cursor: pointer; border-left: 4px solid;" [style.border-left-color]="(resumen()?.solicitudesPendientes || 0) > 0 ? '#f59e0b' : 'var(--primary)'" (click)="tabActiva.set('solicitudes')">
            <div class="entre" style="margin-bottom: 0.4rem;">
              <span class="stat-label">🔐 Solicitudes de Clave</span>
              <span style="font-size: 1.3rem;">🔑</span>
            </div>
            <strong class="stat-valor" [style.color]="(resumen()?.solicitudesPendientes || 0) > 0 ? '#d97706' : 'var(--primary)'">
              {{ resumen()?.solicitudesPendientes || 0 }}
            </strong>
            <span style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-top: 0.4rem;">
              {{ (resumen()?.solicitudesPendientes || 0) > 0 ? '⚠️ Requieren atención prioritaria' : '✓ Todas las solicitudes al día' }}
            </span>
          </div>

          <!-- KPI 5: Grados -->
          <div class="card stat-card">
            <div class="entre" style="margin-bottom: 0.4rem;">
              <span class="stat-label">🏫 Grados Escolares</span>
              <span style="font-size: 1.3rem;">🏫</span>
            </div>
            <strong class="stat-valor">{{ resumen()?.totalGrupos || grupos().length }}</strong>
            <span style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-top: 0.4rem;">
              Cursos académicos registrados
            </span>
          </div>

          <!-- KPI 6: Asignaturas -->
          <div class="card stat-card">
            <div class="entre" style="margin-bottom: 0.4rem;">
              <span class="stat-label">📚 Asignaturas Base</span>
              <span style="font-size: 1.3rem;">📚</span>
            </div>
            <strong class="stat-valor">{{ resumen()?.totalMaterias || 10 }}</strong>
            <span style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-top: 0.4rem;">
              Malla curricular oficial MEN
            </span>
          </div>
        </div>

        <!-- Acciones Rápidas y Seguridad Institucional -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 1.25rem;">
          <!-- Tarjeta de Acciones Rápidas -->
          <div class="card" style="padding: 1.25rem 1.4rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.85rem;">
              <span style="font-size: 1.3rem;">⚡</span>
              <h3 style="margin: 0; font-size: 1.1rem;">Acciones Rápidas del Administrador</h3>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Operaciones de alta frecuencia para el control diario del campus escolar:
            </p>

            <div style="display: grid; gap: 0.5rem;">
              <button type="button" class="btn-secundario" style="justify-content: flex-start; text-align: left; padding: 0.65rem 0.85rem;" (click)="tabActiva.set('docentes'); mostrarFormDocente.set(true)">
                <span style="font-size: 1.1rem; margin-right: 0.4rem;">👨‍🏫</span>
                <div>
                  <strong style="display: block; font-size: 0.84rem;">Registrar Docente con Cédula</strong>
                  <small style="color: var(--text-muted);">Crear acceso por documento numérico oficial</small>
                </div>
              </button>

              <button type="button" class="btn-secundario" style="justify-content: flex-start; text-align: left; padding: 0.65rem 0.85rem;" (click)="tabActiva.set('estudiantes'); abrirFormularioEstudiante()">
                <span style="font-size: 1.1rem; margin-right: 0.4rem;">🎓</span>
                <div>
                  <strong style="display: block; font-size: 0.84rem;">Matricular Estudiante</strong>
                  <small style="color: var(--text-muted);">Generar código QR y clave dinámica provisional</small>
                </div>
              </button>

              <button type="button" class="btn-secundario" style="justify-content: flex-start; text-align: left; padding: 0.65rem 0.85rem;" (click)="tabActiva.set('acudientes'); mostrarFormAcudiente.set(true)">
                <span style="font-size: 1.1rem; margin-right: 0.4rem;">👨‍👩‍👧</span>
                <div>
                  <strong style="display: block; font-size: 0.84rem;">Crear Acudiente y Amarrar Hijos</strong>
                  <small style="color: var(--text-muted);">Vincular acudiente a estudiantes para boletines</small>
                </div>
              </button>

              <button type="button" class="btn-secundario" style="justify-content: flex-start; text-align: left; padding: 0.65rem 0.85rem;" (click)="tabActiva.set('solicitudes')">
                <span style="font-size: 1.1rem; margin-right: 0.4rem;">🔑</span>
                <div>
                  <strong style="display: block; font-size: 0.84rem;">Atender Solicitudes de Clave</strong>
                  <small style="color: var(--text-muted);">Generar claves temporales para usuarios</small>
                </div>
              </button>
            </div>
          </div>

          <!-- Tarjeta de Políticas de Seguridad -->
          <div class="card" style="padding: 1.25rem 1.4rem; background: var(--bg-hover);">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.85rem;">
              <span style="font-size: 1.3rem;">🛡️</span>
              <h3 style="margin: 0; font-size: 1.1rem;">Políticas de Seguridad Institucional</h3>
            </div>

            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.65rem; font-size: 0.82rem; color: var(--text-secondary);">
              <li style="display: flex; gap: 0.45rem;">
                <span style="color: var(--primary); font-weight: 700;">✔</span>
                <span><strong>Ingreso Docente por Cédula:</strong> Los profesores acceden con su documento oficial sin usuarios ambiguos.</span>
              </li>
              <li style="display: flex; gap: 0.45rem;">
                <span style="color: var(--primary); font-weight: 700;">✔</span>
                <span><strong>Claves Dinámicas de 1 Solo Uso:</strong> Al matricular o recuperar contraseña, el sistema obliga al usuario a actualizar su contraseña inmediatamente en su primer ingreso.</span>
              </li>
              <li style="display: flex; gap: 0.45rem;">
                <span style="color: var(--primary); font-weight: 700;">✔</span>
                <span><strong>Segregación de Funciones:</strong> Profesores no matriculan ni expiden boletines oficiales; Dirección gestiona currículo y amarre de materias.</span>
              </li>
              <li style="display: flex; gap: 0.45rem;">
                <span style="color: var(--primary); font-weight: 700;">✔</span>
                <span><strong>Protección ante Concurrencia:</strong> Rate limiting y debounce optimizados para soportar más de 1.000 solicitudes simultáneas sin degradación.</span>
              </li>
            </ul>
          </div>
        </div>
      }

      <!-- ======================================================================
           TAB 2: SOLICITUDES DE CLAVE (ORGANIZADA CON BUSCADOR Y SLIDER)
           ====================================================================== -->
      @if (tabActiva() === 'solicitudes') {
        <div class="card" style="padding: 1.25rem 1.4rem; margin-bottom: 1.25rem;">
          <div class="entre" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h2 style="font-size: 1.25rem; margin: 0;">Solicitudes de Recuperación de Contraseña</h2>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
                Cuando un estudiante, docente o acudiente olvida su clave, su solicitud llega aquí para que el Administrador le asigne una clave temporal.
              </p>
            </div>
            <button type="button" class="btn-secundario" (click)="cargarSolicitudes()">🔄 Refrescar Lista</button>
          </div>

          <!-- Barra de Filtros y Búsqueda -->
          <div class="entre" style="flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px dashed var(--border);">
            <div class="segmento-toggle">
              <button type="button" [class.activo]="filtroEstadoSolicitudes() === 'todas'" (click)="filtroEstadoSolicitudes.set('todas')">
                Todas ({{ solicitudes().length }})
              </button>
              <button type="button" [class.activo]="filtroEstadoSolicitudes() === 'Pendiente'" (click)="filtroEstadoSolicitudes.set('Pendiente')">
                Pendientes ({{ solicitudesPendientesCount() }})
              </button>
              <button type="button" [class.activo]="filtroEstadoSolicitudes() === 'Atendida'" (click)="filtroEstadoSolicitudes.set('Atendida')">
                Atendidas
              </button>
            </div>

            <div style="min-width: 15rem;">
              <input
                type="text"
                [(ngModel)]="busquedaSolicitudes"
                placeholder="🔍 Buscar por nombre o documento..."
                style="width: 100%;"
              />
            </div>
          </div>

          <!-- Tabla Organizada con Slider -->
          <div class="gradebook-wrapper">
            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>Fecha Radicado</th>
                    <th>Solicitante</th>
                    <th>Rol</th>
                    <th>Documento</th>
                    <th>Mensaje / Motivo</th>
                    <th>Estado</th>
                    <th style="text-align: right; padding-right: 1.5rem;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of solicitudesPaginadas(); track s.id) {
                    <tr>
                      <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">{{ s.creadaEn }}</td>
                      <td><strong>{{ s.nombre }}</strong></td>
                      <td><span class="chip-grupo">{{ s.rol }}</span></td>
                      <td style="font-family: monospace; font-weight: 600;">{{ s.documento }}</td>
                      <td style="font-size: 0.84rem; color: var(--text-secondary); max-width: 14rem;">{{ s.mensaje }}</td>
                      <td>
                        <span class="badge" [class]="s.estado === 'Pendiente' ? 'badge-amarillo' : 'badge-verde'">
                          {{ s.estado }}
                        </span>
                        @if (s.claveGenerada) {
                          <small style="display: block; font-family: monospace; color: var(--primary); font-weight: 700; margin-top: 0.2rem;">
                            {{ s.claveGenerada }}
                          </small>
                        }
                      </td>
                      <td style="text-align: right; padding-right: 1rem; white-space: nowrap;">
                        @if (s.estado === 'Pendiente') {
                          <button type="button" class="btn-principal" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;" (click)="atenderSolicitud(s.id)">
                            ⚡ Asignar Clave
                          </button>
                        } @else {
                          <span style="font-size: 0.78rem; color: var(--text-muted);">Atendida en {{ s.atendidaEn }}</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        No hay solicitudes de clave registradas en este filtro.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Slider de Paginación de Solicitudes -->
            @if (solicitudesFiltradas().length > 0) {
              <div class="paginacion-slider-control">
                <span class="pag-info-tag">Página {{ paginaSolicitudes() }} de {{ totalPaginasSolicitudes() }} ({{ solicitudesFiltradas().length }} solicitudes)</span>
                <div class="paginacion-slider-track">
                  <button type="button" class="btn-pag-nav" [disabled]="paginaSolicitudes() <= 1" (click)="paginaSolicitudes.set(paginaSolicitudes() - 1)">‹</button>
                  <input
                    type="range"
                    class="paginacion-slider-input"
                    min="1"
                    [max]="totalPaginasSolicitudes()"
                    [value]="paginaSolicitudes()"
                    (input)="onSliderSolicitudes($event)"
                  />
                  <button type="button" class="btn-pag-nav" [disabled]="paginaSolicitudes() >= totalPaginasSolicitudes()" (click)="paginaSolicitudes.set(paginaSolicitudes() + 1)">›</button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ======================================================================
           TAB 3: GESTIÓN DE ESTUDIANTES (BUSCADOR, FOTO Y SLIDER)
           ====================================================================== -->
      @if (tabActiva() === 'estudiantes') {
        <div class="entre" style="margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; margin: 0;">Matrículas y Directorio de Estudiantes</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
              Matricula alumnos asignándoles grado/curso. Los acudientes se amarran posteriormente al crear la familia.
            </p>
          </div>
          <button type="button" class="btn-principal" (click)="abrirFormularioEstudiante()">
            {{ mostrarFormEstudiante() ? 'Cerrar' : '+ Matricular Alumno' }}
          </button>
        </div>

        @if (mostrarFormEstudiante()) {
          <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--primary);">
            <div class="entre" style="margin-bottom: 0.5rem;">
              <h3 style="margin: 0;">Matricular Nuevo Estudiante</h3>
              <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.25rem 0.55rem;" (click)="mostrarModalNuevoGrupo.set(true)">
                + Crear Grado Escolar
              </button>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Ingresa los datos del alumno. El sistema generará su código QR y una clave dinámica provisional para su primer inicio de sesión.
            </p>

            <form (ngSubmit)="crearEstudiante()" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem;">
              <label>Nombre y Apellidos
                <input [(ngModel)]="estNombre" name="estNombre" required placeholder="Ej. Valentina Gómez" />
              </label>

              <label>Documento de Identidad (Numérico)
                <input [(ngModel)]="estDocumento" name="estDocumento" inputmode="numeric" required placeholder="Ej. 1098234123" />
              </label>

              <label>
                Grado / Grupo Escolar
                <div style="display: flex; gap: 0.35rem; margin-top: 0.25rem;">
                  <select [(ngModel)]="estGrupoId" name="estGrupoId" required style="flex: 1;">
                    <option [ngValue]="0">Selecciona grado...</option>
                    @for (g of grupos(); track g.id) {
                      <option [ngValue]="g.id">{{ g.nombre }}</option>
                    }
                  </select>
                  <button type="button" class="btn-secundario" (click)="mostrarModalNuevoGrupo.set(true)" title="Crear grado escolar" style="padding: 0 0.65rem;">
                    +
                  </button>
                </div>
              </label>

              <div style="grid-column: 1 / -1; display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button type="submit" class="btn-principal" [disabled]="guardandoEstudiante()">
                  {{ guardandoEstudiante() ? 'Guardando…' : '✔ Guardar Matrícula con Clave Dinámica' }}
                </button>
                <button type="button" class="btn-secundario" (click)="mostrarFormEstudiante.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        }

        <!-- Barra de Búsqueda y Filtro por Grupo -->
        <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1rem;">
          <div class="entre" style="gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Filtrar Grado:</label>
              <select [ngModel]="filtroGrupoEstudiantes()" (ngModelChange)="filtroGrupoEstudiantes.set($event)" style="font-size: 0.85rem; padding: 0.35rem 0.65rem;">
                <option [ngValue]="0">Todos los grados ({{ estudiantes().length }})</option>
                @for (g of grupos(); track g.id) {
                  <option [ngValue]="g.id">{{ g.nombre }}</option>
                }
              </select>
            </div>

            <div style="min-width: 16rem;">
              <input
                type="text"
                [(ngModel)]="busquedaEstudiantes"
                placeholder="🔍 Buscar por nombre o documento..."
                style="width: 100%;"
              />
            </div>
          </div>
        </div>

        <!-- Tabla de Estudiantes con Foto en Globo y Slider -->
        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Grupo</th>
                  <th>Documento</th>
                  <th>Acudiente Vinculado</th>
                  <th>Estado BD</th>
                  <th style="text-align: right; padding-right: 1.5rem;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (est of estudiantesPaginadosAdmin(); track est.id) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circulo" style="width: 32px; height: 32px; font-size: 0.82rem; overflow: hidden; flex-shrink: 0;">
                          @if (est.tieneFoto) {
                            <img [src]="'/api/estudiantes/' + est.id + '/foto'" alt="" style="width: 100%; height: 100%; object-fit: cover;" (error)="est.tieneFoto = false" />
                          } @else {
                            {{ est.nombre.charAt(0) }}
                          }
                        </div>
                        <div>
                          <strong>{{ est.nombre }}</strong>
                          @if (est.debeCambiarPassword) {
                            <span class="badge badge-amarillo" style="font-size: 0.65rem; margin-left: 0.35rem;">Clave Provisional</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td><span class="chip-grupo">{{ est.grupo }}</span></td>
                    <td style="font-family: monospace;">{{ est.documento }}</td>
                    <td>
                      <span [style.color]="est.acudiente ? 'var(--text-primary)' : 'var(--text-muted)'" style="font-size: 0.85rem;">
                        {{ est.acudiente || 'Sin vincular' }}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column; gap: 0.2rem; align-items: flex-start;">
                        <button
                          type="button"
                          class="badge"
                          [class]="est.activo ? 'badge-verde' : 'badge-rojo'"
                          (click)="abrirModalInactivar(est)"
                          style="cursor: pointer; border: none; font-size: 0.72rem;"
                          [title]="est.activo ? 'Clic para inactivar con motivo' : 'Clic para reactivar'"
                        >
                          {{ est.activo ? '🟢 Activo' : '🔴 Inactivo' }}
                        </button>
                        @if (!est.activo && est.motivoInactivacion) {
                          <small style="font-size: 0.7rem; color: #ef4444; max-width: 13rem; line-height: 1.2;">
                            {{ est.motivoInactivacion }}
                          </small>
                        }
                      </div>
                    </td>
                    <td style="text-align: right; padding-right: 1rem; white-space: nowrap;">
                      <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="abrirModalEditarEstudiante(est)" title="Editar estudiante">
                          ✏️ Editar
                        </button>
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="resetClaveEstudiante(est.id)" title="Clave dinámica">
                          🔑 Clave
                        </button>
                        <button type="button" class="btn-peligro" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="abrirModalEliminarEstudiante(est)" title="Eliminar estudiante">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron estudiantes para los filtros seleccionados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Slider de Paginación de Estudiantes -->
          @if (estudiantesFiltradosAdmin().length > 0) {
            <div class="paginacion-slider-control">
              <span class="pag-info-tag">Página {{ paginaEstudiantes() }} de {{ totalPaginasEstudiantes() }} ({{ estudiantesFiltradosAdmin().length }} estudiantes)</span>
              <div class="paginacion-slider-track">
                <button type="button" class="btn-pag-nav" [disabled]="paginaEstudiantes() <= 1" (click)="paginaEstudiantes.set(paginaEstudiantes() - 1)">‹</button>
                <input
                  type="range"
                  class="paginacion-slider-input"
                  min="1"
                  [max]="totalPaginasEstudiantes()"
                  [value]="paginaEstudiantes()"
                  (input)="onSliderEstudiantes($event)"
                />
                <button type="button" class="btn-pag-nav" [disabled]="paginaEstudiantes() >= totalPaginasEstudiantes()" (click)="paginaEstudiantes.set(paginaEstudiantes() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ======================================================================
           TAB 4: GESTIÓN DE DOCENTES (CREACIÓN POR CÉDULA Y SLIDER)
           ====================================================================== -->
      @if (tabActiva() === 'docentes') {
        <div class="entre" style="margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; margin: 0;">Planta Docente Institucional</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
              El Administrador da de alta a los profesores con su Cédula de Ciudadanía oficial y genera su clave de acceso.
            </p>
          </div>
          <button type="button" class="btn-principal" (click)="mostrarFormDocente.set(!mostrarFormDocente())">
            {{ mostrarFormDocente() ? 'Cerrar' : '+ Registrar Docente con Cédula' }}
          </button>
        </div>

        @if (mostrarFormDocente()) {
          <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--primary);">
            <h3>Registrar Nuevo Docente con Cédula</h3>
            <p class="lead">El ingreso del docente será por su número de cédula de ciudadanía.</p>

            <form (ngSubmit)="crearDocente()" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem; margin-top: 1rem;">
              <label>Nombre y Apellidos Completos
                <input [(ngModel)]="docNombre" name="docNombre" required placeholder="Ej. Lic. Fernando Vallejo" />
              </label>

              <label>Cédula de Ciudadanía (Usuario de Ingreso)
                <input [(ngModel)]="docUsuario" name="docUsuario" inputmode="numeric" required placeholder="Ej. 1075283910 (Solo números)" />
              </label>

              <div style="grid-column: 1 / -1; display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button type="submit" class="btn-principal">Crear Docente con Cédula y Clave Dinámica</button>
                <button type="button" class="btn-secundario" (click)="mostrarFormDocente.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        }

        <!-- Buscador de Docentes -->
        <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1rem;">
          <div class="entre" style="gap: 1rem; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Docentes Registrados ({{ profesores().length }})
            </span>
            <div style="min-width: 16rem;">
              <input
                type="text"
                [(ngModel)]="busquedaDocentes"
                placeholder="🔍 Buscar por nombre o cédula..."
                style="width: 100%;"
              />
            </div>
          </div>
        </div>

        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Cédula de Ciudadanía (Acceso)</th>
                  <th>Materias Asignadas</th>
                  <th>Estado BD</th>
                  <th style="text-align: right; padding-right: 1.5rem;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (prof of docentesPaginadosAdmin(); track prof.id) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circulo" style="width: 32px; height: 32px; font-size: 0.82rem; background: var(--accent-purple);">
                          {{ prof.nombre.charAt(0) }}
                        </div>
                        <strong>{{ prof.nombre }}</strong>
                      </div>
                    </td>
                    <td style="font-family: monospace; font-size: 0.92rem; font-weight: 600; color: var(--primary);">
                      {{ prof.cedula || prof.usuario }}
                    </td>
                    <td>{{ prof.materiasCount }} asignaturas a cargo</td>
                    <td>
                      <button
                        type="button"
                        class="badge"
                        [class]="prof.activo ? 'badge-verde' : 'badge-rojo'"
                        (click)="toggleEstadoProfesor(prof.id)"
                        style="cursor: pointer; border: none;"
                        title="Activar o suspender acceso"
                      >
                        {{ prof.activo ? '🟢 Activo' : '🔴 Inactivo' }}
                      </button>
                    </td>
                    <td style="text-align: right; padding-right: 1rem; white-space: nowrap;">
                      <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="abrirModalEditarProfesor(prof)" title="Editar docente">
                          ✏️ Editar
                        </button>
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="resetClaveProfesor(prof.id)" title="Nueva clave">
                          🔑 Clave
                        </button>
                        <button type="button" class="btn-peligro" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="abrirModalEliminarProfesor(prof)" title="Eliminar docente">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron docentes con ese criterio de búsqueda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Slider de Paginación de Docentes -->
          @if (docentesFiltradosAdmin().length > 0) {
            <div class="paginacion-slider-control">
              <span class="pag-info-tag">Página {{ paginaDocentes() }} de {{ totalPaginasDocentes() }} ({{ docentesFiltradosAdmin().length }} docentes)</span>
              <div class="paginacion-slider-track">
                <button type="button" class="btn-pag-nav" [disabled]="paginaDocentes() <= 1" (click)="paginaDocentes.set(paginaDocentes() - 1)">‹</button>
                <input
                  type="range"
                  class="paginacion-slider-input"
                  min="1"
                  [max]="totalPaginasDocentes()"
                  [value]="paginaDocentes()"
                  (input)="onSliderDocentes($event)"
                />
                <button type="button" class="btn-pag-nav" [disabled]="paginaDocentes() >= totalPaginasDocentes()" (click)="paginaDocentes.set(paginaDocentes() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ======================================================================
           TAB 5: GESTIÓN DE FAMILIAS (ACUDIENTES) Y AMARRE DE HIJOS (CON SLIDER)
           ====================================================================== -->
      @if (tabActiva() === 'acudientes') {
        <div class="entre" style="margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; margin: 0;">Familias y Acudientes Institucionales</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
              El Administrador crea a los acudientes y los amarra a sus respectivos hijos para que consulten su boletín y asistencia.
            </p>
          </div>
          <button type="button" class="btn-principal" (click)="mostrarFormAcudiente.set(!mostrarFormAcudiente())">
            {{ mostrarFormAcudiente() ? 'Cerrar' : '+ Crear Acudiente y Amarrar Hijos' }}
          </button>
        </div>

        @if (mostrarFormAcudiente()) {
          <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--primary);">
            <h3 style="margin-bottom: 0.35rem;">Crear Cuenta de Acudiente y Amarrar a sus Hijos</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Registra los datos de contacto del padre/madre y marca con check los estudiantes matriculados que están bajo su tutela.
            </p>

            <form (ngSubmit)="crearAcudiente()" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem;">
              <label>Nombre del Acudiente
                <input [(ngModel)]="acudNombre" name="acudNombre" required placeholder="Ej. Patricia Salazar" />
              </label>

              <label>Documento de Identidad
                <input [(ngModel)]="acudDocumento" name="acudDocumento" inputmode="numeric" required placeholder="Ej. 43908123" />
              </label>

              <label>Teléfono de Contacto
                <input [(ngModel)]="acudTelefono" name="acudTelefono" placeholder="Ej. 3154892211" />
              </label>

              <label>Correo Electrónico
                <input [(ngModel)]="acudCorreo" name="acudCorreo" type="email" placeholder="patricia@gmail.com" />
              </label>

              <div style="grid-column: 1 / -1; margin-top: 0.5rem;">
                <div class="entre" style="margin-bottom: 0.4rem;">
                  <label style="font-weight: 700; font-size: 0.88rem;">
                    Amarrar a Estudiante(s) (Hijos a cargo):
                    <span class="badge badge-verde" style="font-size: 0.72rem; margin-left: 0.35rem;">
                      {{ hijosSeleccionados.size }} hijo(s) seleccionado(s)
                    </span>
                  </label>
                  <input
                    [(ngModel)]="filtroBusquedaHijos"
                    name="filtroBusquedaHijos"
                    placeholder="🔍 Filtrar estudiante por nombre o grupo..."
                    style="font-size: 0.8rem; padding: 0.3rem 0.6rem; max-width: 17rem;"
                  />
                </div>

                <div style="max-height: 12rem; overflow-y: auto; background: var(--bg-hover); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.65rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.4rem;">
                  @for (est of hijosFiltrados(); track est.id) {
                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer; padding: 0.3rem; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                      <input
                        type="checkbox"
                        [checked]="hijosSeleccionados.has(est.id)"
                        (change)="toggleHijoSeleccionado(est.id)"
                      />
                      <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <strong>{{ est.nombre }}</strong> ({{ est.grupo || 'GIR' }})
                      </span>
                    </label>
                  } @empty {
                    <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.82rem;">
                      No se encontraron estudiantes para amarrar con ese filtro.
                    </div>
                  }
                </div>
              </div>

              <div style="grid-column: 1 / -1; display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button type="submit" class="btn-principal">Guardar Acudiente y Amarrar Hijos</button>
                <button type="button" class="btn-secundario" (click)="mostrarFormAcudiente.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        }

        <!-- Buscador de Acudientes -->
        <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1rem;">
          <div class="entre" style="gap: 1rem; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Acudientes Registrados ({{ acudientes().length }})
            </span>
            <div style="min-width: 16rem;">
              <input
                type="text"
                [(ngModel)]="busquedaAcudientes"
                placeholder="🔍 Buscar por nombre, documento o hijo..."
                style="width: 100%;"
              />
            </div>
          </div>
        </div>

        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Acudiente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Hijos Amarrados</th>
                  <th>Estado BD</th>
                  <th style="text-align: right; padding-right: 1.5rem;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (acud of acudientesPaginadosAdmin(); track acud.id) {
                  <tr>
                    <td><strong>{{ acud.nombre }}</strong></td>
                    <td style="font-family: monospace;">{{ acud.documento }}</td>
                    <td style="font-size: 0.82rem;">
                      <div>📞 {{ acud.telefono || 'Sin teléfono' }}</div>
                      <div>✉️ {{ acud.correo || 'Sin correo' }}</div>
                    </td>
                    <td>
                      @if (acud.estudiantes && acud.estudiantes.length > 0) {
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                          @for (hijo of acud.estudiantes; track hijo.id) {
                            <span class="badge badge-verde" style="font-size: 0.72rem; justify-content: flex-start;">
                              🎓 {{ hijo.nombre }} ({{ hijo.grupo || 'GIR' }})
                            </span>
                          }
                        </div>
                      } @else {
                        <span style="font-size: 0.82rem; color: var(--text-muted);">Sin hijos amarrados</span>
                      }
                    </td>
                    <td>
                      <button
                        type="button"
                        class="badge"
                        [class]="acud.activo ? 'badge-verde' : 'badge-rojo'"
                        (click)="toggleEstadoAcudiente(acud.id)"
                        style="cursor: pointer; border: none;"
                        title="Activar o desactivar cuenta"
                      >
                        {{ acud.activo ? '🟢 Activo' : '🔴 Inactivo' }}
                      </button>
                    </td>
                    <td style="text-align: right; padding-right: 1rem; white-space: nowrap;">
                      <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="abrirModalEditarAcudiente(acud)" title="Editar acudiente">
                          ✏️ Editar
                        </button>
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="resetClaveAcudiente(acud.id)" title="Generar clave">
                          🔑 Clave
                        </button>
                        <button type="button" class="btn-peligro" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="abrirModalEliminarAcudiente(acud)" title="Eliminar acudiente">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron acudientes con ese criterio de búsqueda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Slider de Paginación de Acudientes -->
          @if (acudientesFiltradosAdmin().length > 0) {
            <div class="paginacion-slider-control">
              <span class="pag-info-tag">Página {{ paginaAcudientes() }} de {{ totalPaginasAcudientes() }} ({{ acudientesFiltradosAdmin().length }} acudientes)</span>
              <div class="paginacion-slider-track">
                <button type="button" class="btn-pag-nav" [disabled]="paginaAcudientes() <= 1" (click)="paginaAcudientes.set(paginaAcudientes() - 1)">‹</button>
                <input
                  type="range"
                  class="paginacion-slider-input"
                  min="1"
                  [max]="totalPaginasAcudientes()"
                  [value]="paginaAcudientes()"
                  (input)="onSliderAcudientes($event)"
                />
                <button type="button" class="btn-pag-nav" [disabled]="paginaAcudientes() >= totalPaginasAcudientes()" (click)="paginaAcudientes.set(paginaAcudientes() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-width: 25rem;
      width: 90vw;
      pointer-events: none;
    }

    .toast-card {
      pointer-events: auto;
      background: var(--bg-surface-solid);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .toast-card.toast-exito {
      border-left: 5px solid #10b981;
    }

    .toast-card.toast-alerta {
      border-left: 5px solid #f59e0b;
    }

    .toast-card.toast-error {
      border-left: 5px solid #ef4444;
    }

    .toast-card.toast-info {
      border-left: 5px solid #3b82f6;
    }

    .toast-icono {
      font-size: 1.4rem;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .toast-titulo {
      display: block;
      font-size: 0.88rem;
      color: var(--text-primary);
      margin-bottom: 0.15rem;
    }

    .toast-mensaje {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.35;
    }

    .toast-cerrar {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0 0.2rem;
      line-height: 1;
    }

    .toast-cerrar:hover {
      color: var(--text-primary);
    }

    @keyframes toastSlideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);

  tabActiva = signal<'resumen' | 'solicitudes' | 'estudiantes' | 'docentes' | 'acudientes'>('resumen');
  modalClave = signal<{ nombre: string; clave: string } | null>(null);
  copiado = signal(false);

  // Pop-ups de Notificaciones (Toasts)
  toasts = signal<ToastNotif[]>([]);
  private toastCounter = 0;

  resumen = signal<ResumenAdmin | null>(null);
  solicitudes = signal<SolicitudClave[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  profesores = signal<any[]>([]);
  acudientes = signal<any[]>([]);
  grupos = signal<Grupo[]>([]);

  solicitudesPendientesCount = computed(() => {
    return this.solicitudes().filter(s => s.estado === 'Pendiente').length;
  });

  // Formularios
  mostrarFormEstudiante = signal(false);
  guardandoEstudiante = signal(false);
  estNombre = '';
  estDocumento = '';
  estGrupoId = 0;

  // Modal para crear grupo rápido
  mostrarModalNuevoGrupo = signal(false);
  nombreNuevoGrupo = '';

  // Modal de inactivación de estudiante con motivo
  estudianteParaInactivar = signal<Estudiante | null>(null);
  motivoInactivacionSeleccionado = 'Suspensión disciplinaria temporal';
  motivoInactivacionOtro = '';
  inactivando = signal(false);

  // Estados y señales para Edición y Eliminación (Estudiantes, Docentes, Acudientes)
  guardandoEdicion = signal(false);
  eliminando = signal(false);

  // Estudiante Edit & Delete
  estudianteParaEditar = signal<Estudiante | null>(null);
  estudianteParaEliminar = signal<Estudiante | null>(null);
  editEstNombre = '';
  editEstDocumento = '';
  editEstGrupoId = 0;
  editEstAcudienteId = 0;
  editEstPassword = '';

  // Docente Edit & Delete
  profesorParaEditar = signal<any | null>(null);
  profesorParaEliminar = signal<any | null>(null);
  editDocNombre = '';
  editDocUsuario = '';
  editDocPassword = '';

  // Acudiente Edit & Delete
  acudienteParaEditar = signal<any | null>(null);
  acudienteParaEliminar = signal<any | null>(null);
  editAcudNombre = '';
  editAcudDocumento = '';
  editAcudTelefono = '';
  editAcudCorreo = '';
  editAcudPassword = '';
  editHijosSeleccionados = new Set<number>();

  mostrarFormDocente = signal(false);
  docNombre = '';
  docUsuario = '';

  mostrarFormAcudiente = signal(false);
  acudNombre = '';
  acudDocumento = '';
  acudTelefono = '';
  acudCorreo = '';
  hijosSeleccionados = new Set<number>();
  filtroBusquedaHijos = '';

  hijosFiltrados = computed(() => {
    const q = this.filtroBusquedaHijos.trim().toLowerCase();
    const list = this.estudiantes();
    if (!q) return list;
    return list.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.documento.includes(q) ||
      (e.grupo && e.grupo.toLowerCase().includes(q))
    );
  });

  // =========================================================================
  // PAGINACIÓN Y BÚSQUEDA UNIVERSAL (ADMINISTRADOR)
  // =========================================================================
  elementosPorPaginaAdmin = signal(8);

  // Tab Solicitudes
  busquedaSolicitudes = '';
  filtroEstadoSolicitudes = signal<'todas' | 'Pendiente' | 'Atendida'>('todas');
  paginaSolicitudes = signal(1);

  solicitudesFiltradas = computed(() => {
    let list = this.solicitudes();
    const est = this.filtroEstadoSolicitudes();
    if (est !== 'todas') {
      list = list.filter(s => s.estado === est);
    }
    const q = this.busquedaSolicitudes.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.nombre.toLowerCase().includes(q) ||
        s.documento.includes(q) ||
        (s.mensaje && s.mensaje.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPaginasSolicitudes = computed(() => Math.max(1, Math.ceil(this.solicitudesFiltradas().length / this.elementosPorPaginaAdmin())));
  solicitudesPaginadas = computed(() => {
    const list = this.solicitudesFiltradas();
    const p = Math.min(this.paginaSolicitudes(), this.totalPaginasSolicitudes());
    const inicio = (p - 1) * this.elementosPorPaginaAdmin();
    return list.slice(inicio, inicio + this.elementosPorPaginaAdmin());
  });

  onSliderSolicitudes(e: Event): void {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) this.paginaSolicitudes.set(v);
  }

  // Tab Estudiantes
  busquedaEstudiantes = '';
  filtroGrupoEstudiantes = signal(0);
  paginaEstudiantes = signal(1);

  estudiantesFiltradosAdmin = computed(() => {
    let list = this.estudiantes();
    const gId = this.filtroGrupoEstudiantes();
    if (gId > 0) {
      list = list.filter(e => e.grupoId === gId);
    }
    const q = this.busquedaEstudiantes.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        e.documento.includes(q) ||
        (e.grupo && e.grupo.toLowerCase().includes(q)) ||
        (e.acudiente && e.acudiente.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPaginasEstudiantes = computed(() => Math.max(1, Math.ceil(this.estudiantesFiltradosAdmin().length / this.elementosPorPaginaAdmin())));
  estudiantesPaginadosAdmin = computed(() => {
    const list = this.estudiantesFiltradosAdmin();
    const p = Math.min(this.paginaEstudiantes(), this.totalPaginasEstudiantes());
    const inicio = (p - 1) * this.elementosPorPaginaAdmin();
    return list.slice(inicio, inicio + this.elementosPorPaginaAdmin());
  });

  onSliderEstudiantes(e: Event): void {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) this.paginaEstudiantes.set(v);
  }

  // Tab Docentes
  busquedaDocentes = '';
  paginaDocentes = signal(1);

  docentesFiltradosAdmin = computed(() => {
    let list = this.profesores();
    const q = this.busquedaDocentes.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.usuario && p.usuario.toLowerCase().includes(q)) ||
        (p.cedula && p.cedula.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPaginasDocentes = computed(() => Math.max(1, Math.ceil(this.docentesFiltradosAdmin().length / this.elementosPorPaginaAdmin())));
  docentesPaginadosAdmin = computed(() => {
    const list = this.docentesFiltradosAdmin();
    const p = Math.min(this.paginaDocentes(), this.totalPaginasDocentes());
    const inicio = (p - 1) * this.elementosPorPaginaAdmin();
    return list.slice(inicio, inicio + this.elementosPorPaginaAdmin());
  });

  onSliderDocentes(e: Event): void {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) this.paginaDocentes.set(v);
  }

  // Tab Acudientes
  busquedaAcudientes = '';
  paginaAcudientes = signal(1);

  acudientesFiltradosAdmin = computed(() => {
    let list = this.acudientes();
    const q = this.busquedaAcudientes.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        a.documento.includes(q) ||
        (a.telefono && a.telefono.includes(q)) ||
        (a.correo && a.correo.toLowerCase().includes(q)) ||
        (a.estudiantes && a.estudiantes.some((h: any) => h.nombre && h.nombre.toLowerCase().includes(q)))
      );
    }
    return list;
  });

  totalPaginasAcudientes = computed(() => Math.max(1, Math.ceil(this.acudientesFiltradosAdmin().length / this.elementosPorPaginaAdmin())));
  acudientesPaginadosAdmin = computed(() => {
    const list = this.acudientesFiltradosAdmin();
    const p = Math.min(this.paginaAcudientes(), this.totalPaginasAcudientes());
    const inicio = (p - 1) * this.elementosPorPaginaAdmin();
    return list.slice(inicio, inicio + this.elementosPorPaginaAdmin());
  });

  onSliderAcudientes(e: Event): void {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) this.paginaAcudientes.set(v);
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.api.adminResumen().subscribe({ next: r => this.resumen.set(r), error: () => {} });
    this.cargarSolicitudes();
    this.cargarEstudiantes();
    this.api.adminProfesores().subscribe({ next: p => this.profesores.set(p), error: () => {} });
    this.api.adminAcudientes().subscribe({ next: a => this.acudientes.set(a), error: () => {} });
    this.cargarGrupos();
  }

  cargarGrupos(): void {
    this.api.adminGrupos().subscribe({
      next: g => {
        this.grupos.set(g || []);
        if (this.estGrupoId === 0 && g && g.length > 0) {
          this.estGrupoId = g[0].id;
        }
      },
      error: () => {
        // Fallback al endpoint estándar si aplica
        this.api.grupos().subscribe({
          next: g => {
            this.grupos.set(g || []);
            if (this.estGrupoId === 0 && g && g.length > 0) {
              this.estGrupoId = g[0].id;
            }
          }
        });
      }
    });
  }

  cargarEstudiantes(): void {
    this.api.adminEstudiantes().subscribe({ next: e => this.estudiantes.set(e), error: () => {} });
  }

  cargarSolicitudes(): void {
    this.api.adminSolicitudesClave().subscribe({
      next: s => this.solicitudes.set(s),
      error: () => {}
    });
  }

  mostrarToast(tipo: 'exito' | 'error' | 'alerta' | 'info', titulo: string, mensaje: string): void {
    const id = ++this.toastCounter;
    let icono = 'ℹ️';
    if (tipo === 'exito') icono = '✅';
    if (tipo === 'error') icono = '❌';
    if (tipo === 'alerta') icono = '⚠️';

    const nuevoToast: ToastNotif = { id, tipo, titulo, mensaje, icono };
    this.toasts.update(list => [...list, nuevoToast]);

    setTimeout(() => {
      this.cerrarToast(id);
    }, 4500);
  }

  cerrarToast(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  abrirFormularioEstudiante(): void {
    const nuevo = !this.mostrarFormEstudiante();
    this.mostrarFormEstudiante.set(nuevo);
    if (nuevo) {
      this.cargarGrupos();
    }
  }

  guardarNuevoGrupo(): void {
    if (!this.nombreNuevoGrupo.trim()) {
      this.mostrarToast('alerta', 'Grado Requerido', 'Escribe el nombre del grado o grupo.');
      return;
    }

    this.api.adminCrearGrupo(this.nombreNuevoGrupo.trim()).subscribe({
      next: (creado) => {
        this.mostrarToast('exito', 'Grado Creado', `El grado "${creado.nombre}" fue registrado.`);
        this.nombreNuevoGrupo = '';
        this.mostrarModalNuevoGrupo.set(false);
        this.cargarGrupos();
        this.estGrupoId = creado.id;
      },
      error: (err) => {
        this.mostrarToast('error', 'Error al Crear Grado', mensajeError(err));
      }
    });
  }

  atenderSolicitud(id: number): void {
    this.api.adminAtenderSolicitud(id).subscribe({
      next: res => {
        this.modalClave.set({ nombre: res.nombre, clave: res.claveGenerada });
        this.mostrarToast('exito', 'Clave Asignada', `Se generó clave temporal para ${res.nombre}.`);
        this.cargarSolicitudes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => this.mostrarToast('error', 'Error', mensajeError(err))
    });
  }

  // Estudiantes
  crearEstudiante(): void {
    if (!this.estNombre.trim() || !this.estDocumento.trim()) {
      this.mostrarToast('alerta', 'Datos Incompletos', 'Nombre y documento son obligatorios.');
      return;
    }

    this.guardandoEstudiante.set(true);

    this.api.adminCrearEstudiante({
      nombre: this.estNombre.trim(),
      documento: this.estDocumento.trim(),
      grupoId: this.estGrupoId > 0 ? this.estGrupoId : (this.grupos()[0]?.id || 1)
    }).subscribe({
      next: creado => {
        this.guardandoEstudiante.set(false);
        this.modalClave.set({ nombre: creado.nombre, clave: creado.claveTemporal });
        this.mostrarToast(
          'exito',
          '¡Alumno Matriculado!',
          `Estudiante ${creado.nombre} matriculado exitosamente con clave temporal.`
        );
        this.estNombre = '';
        this.estDocumento = '';
        this.mostrarFormEstudiante.set(false);
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => {
        this.guardandoEstudiante.set(false);
        this.mostrarToast('error', 'Error al Matricular', mensajeError(err));
      }
    });
  }

  abrirModalInactivar(est: Estudiante): void {
    if (est.activo) {
      // Desea inactivar: abrir modal para solicitar el motivo
      this.estudianteParaInactivar.set(est);
      this.motivoInactivacionSeleccionado = 'Suspensión disciplinaria temporal';
      this.motivoInactivacionOtro = '';
    } else {
      // Desea reactivar: confirmación directa
      if (confirm(`¿Deseas reactivar al estudiante ${est.nombre} en la base de datos? Podrá volver a ingresar normalmente.`)) {
        this.api.adminCambiarEstadoEstudiante(est.id, undefined, true).subscribe({
          next: res => {
            this.mostrarToast('exito', 'Estudiante Reactivado', res.mensaje);
            this.cargarEstudiantes();
            this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
          },
          error: err => this.mostrarToast('error', 'Error', mensajeError(err))
        });
      }
    }
  }

  cerrarModalInactivacion(): void {
    this.estudianteParaInactivar.set(null);
  }

  confirmarInactivacionEstudiante(): void {
    const est = this.estudianteParaInactivar();
    if (!est) return;

    let motivo = this.motivoInactivacionSeleccionado;
    if (motivo === 'OTRO') {
      motivo = this.motivoInactivacionOtro.trim() || 'Inactivado por decisión administrativa.';
    }

    this.inactivando.set(true);

    this.api.adminCambiarEstadoEstudiante(est.id, motivo, false).subscribe({
      next: res => {
        this.inactivando.set(false);
        this.cerrarModalInactivacion();
        this.mostrarToast('alerta', 'Estudiante Inactivado', res.mensaje);
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => {
        this.inactivando.set(false);
        this.mostrarToast('error', 'Error', mensajeError(err));
      }
    });
  }

  resetClaveEstudiante(id: number): void {
    this.api.adminResetClaveEstudiante(id).subscribe({
      next: res => {
        this.modalClave.set({ nombre: res.nombre, clave: res.claveGenerada });
        this.mostrarToast('info', 'Clave Provisional', `Nueva clave asignada para ${res.nombre}.`);
        this.cargarEstudiantes();
      },
      error: err => this.mostrarToast('error', 'Error', mensajeError(err))
    });
  }

  // Docentes
  crearDocente(): void {
    const cedula = this.docUsuario.trim();
    if (!this.docNombre.trim() || !cedula) {
      this.mostrarToast('alerta', 'Datos Incompletos', 'Nombre y cédula de ciudadanía son obligatorios.');
      return;
    }

    this.api.adminCrearProfesor({
      nombre: this.docNombre.trim(),
      usuario: cedula,
      documento: cedula
    }).subscribe({
      next: creado => {
        this.modalClave.set({ nombre: creado.nombre, clave: creado.claveAsignada });
        this.mostrarToast('exito', 'Docente Creado', `Profesor ${creado.nombre} registrado con éxito con Cédula ${creado.usuario}.`);
        this.docNombre = '';
        this.docUsuario = '';
        this.mostrarFormDocente.set(false);
        this.api.adminProfesores().subscribe({ next: p => this.profesores.set(p) });
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => this.mostrarToast('error', 'Error al Crear Docente', mensajeError(err))
    });
  }

  toggleEstadoProfesor(id: number): void {
    this.api.adminCambiarEstadoProfesor(id).subscribe({
      next: res => {
        this.mostrarToast('info', 'Estado Actualizado', res.mensaje);
        this.api.adminProfesores().subscribe({ next: p => this.profesores.set(p) });
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => this.mostrarToast('error', 'Error', mensajeError(err))
    });
  }

  resetClaveProfesor(id: number): void {
    this.api.adminResetClaveProfesor(id).subscribe({
      next: res => {
        this.modalClave.set({ nombre: res.nombre, clave: res.claveGenerada });
        this.mostrarToast('info', 'Clave Provisional', `Nueva clave asignada para ${res.nombre}.`);
      },
      error: err => this.mostrarToast('error', 'Error', mensajeError(err))
    });
  }

  // Acudientes y amarre de hijos
  toggleHijoSeleccionado(estId: number): void {
    if (this.hijosSeleccionados.has(estId)) {
      this.hijosSeleccionados.delete(estId);
    } else {
      this.hijosSeleccionados.add(estId);
    }
  }

  crearAcudiente(): void {
    if (!this.acudNombre.trim() || !this.acudDocumento.trim()) {
      this.mostrarToast('alerta', 'Datos Incompletos', 'Nombre y documento del acudiente son obligatorios.');
      return;
    }

    const hijosArr = Array.from(this.hijosSeleccionados);

    this.api.adminCrearAcudiente({
      nombre: this.acudNombre.trim(),
      documento: this.acudDocumento.trim(),
      telefono: this.acudTelefono.trim(),
      correo: this.acudCorreo.trim(),
      estudianteIds: hijosArr
    }).subscribe({
      next: creado => {
        this.modalClave.set({ nombre: creado.nombre, clave: creado.claveAsignada });
        this.mostrarToast(
          'exito',
          '¡Familia Registrada!',
          `Acudiente ${creado.nombre} creado y amarrado a ${creado.hijosVinculados} estudiante(s).`
        );
        this.acudNombre = '';
        this.acudDocumento = '';
        this.acudTelefono = '';
        this.acudCorreo = '';
        this.hijosSeleccionados.clear();
        this.mostrarFormAcudiente.set(false);
        this.api.adminAcudientes().subscribe({ next: a => this.acudientes.set(a) });
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => this.mostrarToast('error', 'Error al Crear Acudiente', mensajeError(err))
    });
  }

  toggleEstadoAcudiente(id: number): void {
    this.api.adminCambiarEstadoAcudiente(id).subscribe({
      next: res => {
        this.mostrarToast('info', 'Estado Actualizado', res.mensaje);
        this.api.adminAcudientes().subscribe({ next: a => this.acudientes.set(a) });
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: err => this.mostrarToast('error', 'Error', mensajeError(err))
    });
  }

  resetClaveAcudiente(id: number): void {
    this.api.adminResetClaveAcudiente(id).subscribe({
      next: res => {
        this.modalClave.set({ nombre: res.nombre, clave: res.claveGenerada });
        this.mostrarToast('info', 'Clave Provisional', `Nueva clave asignada para ${res.nombre}.`);
      },
      error: err => this.mostrarToast('error', 'Error', mensajeError(err))
    });
  }

  // =========================================================================
  // MÉTODOS CRUD: EDICIÓN Y ELIMINACIÓN DE ESTUDIANTES
  // =========================================================================
  abrirModalEditarEstudiante(est: Estudiante): void {
    this.estudianteParaEditar.set(est);
    this.editEstNombre = est.nombre;
    this.editEstDocumento = est.documento;
    this.editEstGrupoId = est.grupoId || 0;
    this.editEstAcudienteId = est.acudienteId || 0;
    this.editEstPassword = '';
  }

  guardarEdicionEstudiante(): void {
    const est = this.estudianteParaEditar();
    if (!est) return;

    if (!this.editEstNombre.trim() || !this.editEstDocumento.trim()) {
      this.mostrarToast('alerta', 'Datos Incompletos', 'Nombre y documento son obligatorios.');
      return;
    }

    this.guardandoEdicion.set(true);

    this.api.adminActualizarEstudiante(est.id, {
      nombre: this.editEstNombre.trim(),
      documento: this.editEstDocumento.trim(),
      grupoId: this.editEstGrupoId > 0 ? this.editEstGrupoId : undefined,
      acudienteId: this.editEstAcudienteId > 0 ? this.editEstAcudienteId : undefined,
      password: this.editEstPassword.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.guardandoEdicion.set(false);
        this.estudianteParaEditar.set(null);
        this.mostrarToast('exito', 'Estudiante Actualizado', res.mensaje || 'Información actualizada exitosamente.');
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.mostrarToast('error', 'Error al Actualizar', mensajeError(err));
      }
    });
  }

  abrirModalEliminarEstudiante(est: Estudiante): void {
    this.estudianteParaEliminar.set(est);
  }

  confirmarEliminarEstudiante(): void {
    const est = this.estudianteParaEliminar();
    if (!est) return;

    this.eliminando.set(true);
    this.api.adminEliminarEstudiante(est.id).subscribe({
      next: (res) => {
        this.eliminando.set(false);
        this.estudianteParaEliminar.set(null);
        this.mostrarToast('exito', 'Estudiante Eliminado', res.mensaje);
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: (err) => {
        this.eliminando.set(false);
        this.mostrarToast('error', 'Error al Eliminar', mensajeError(err));
      }
    });
  }

  // =========================================================================
  // MÉTODOS CRUD: EDICIÓN Y ELIMINACIÓN DE DOCENTES
  // =========================================================================
  abrirModalEditarProfesor(prof: any): void {
    this.profesorParaEditar.set(prof);
    this.editDocNombre = prof.nombre;
    this.editDocUsuario = prof.usuario;
    this.editDocPassword = '';
  }

  guardarEdicionProfesor(): void {
    const prof = this.profesorParaEditar();
    if (!prof) return;

    if (!this.editDocNombre.trim() || !this.editDocUsuario.trim()) {
      this.mostrarToast('alerta', 'Datos Incompletos', 'Nombre y usuario son obligatorios.');
      return;
    }

    this.guardandoEdicion.set(true);
    this.api.adminActualizarProfesor(prof.id, {
      nombre: this.editDocNombre.trim(),
      usuario: this.editDocUsuario.trim(),
      password: this.editDocPassword.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.guardandoEdicion.set(false);
        this.profesorParaEditar.set(null);
        this.mostrarToast('exito', 'Docente Actualizado', res.mensaje || 'Información actualizada exitosamente.');
        this.api.adminProfesores().subscribe({ next: p => this.profesores.set(p) });
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.mostrarToast('error', 'Error al Actualizar', mensajeError(err));
      }
    });
  }

  abrirModalEliminarProfesor(prof: any): void {
    this.profesorParaEliminar.set(prof);
  }

  confirmarEliminarProfesor(): void {
    const prof = this.profesorParaEliminar();
    if (!prof) return;

    this.eliminando.set(true);
    this.api.adminEliminarProfesor(prof.id).subscribe({
      next: (res) => {
        this.eliminando.set(false);
        this.profesorParaEliminar.set(null);
        this.mostrarToast('exito', 'Docente Eliminado', res.mensaje);
        this.api.adminProfesores().subscribe({ next: p => this.profesores.set(p) });
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: (err) => {
        this.eliminando.set(false);
        this.mostrarToast('error', 'Error al Eliminar', mensajeError(err));
      }
    });
  }

  // =========================================================================
  // MÉTODOS CRUD: EDICIÓN Y ELIMINACIÓN DE ACUDIENTES
  // =========================================================================
  abrirModalEditarAcudiente(acud: any): void {
    this.acudienteParaEditar.set(acud);
    this.editAcudNombre = acud.nombre;
    this.editAcudDocumento = acud.documento;
    this.editAcudTelefono = acud.telefono || '';
    this.editAcudCorreo = acud.correo || '';
    this.editAcudPassword = '';
    this.editHijosSeleccionados.clear();
    if (acud.estudiantes) {
      for (const h of acud.estudiantes) {
        this.editHijosSeleccionados.add(h.id);
      }
    }
  }

  toggleEditHijo(estId: number): void {
    if (this.editHijosSeleccionados.has(estId)) {
      this.editHijosSeleccionados.delete(estId);
    } else {
      this.editHijosSeleccionados.add(estId);
    }
  }

  guardarEdicionAcudiente(): void {
    const acud = this.acudienteParaEditar();
    if (!acud) return;

    if (!this.editAcudNombre.trim() || !this.editAcudDocumento.trim()) {
      this.mostrarToast('alerta', 'Datos Incompletos', 'Nombre y documento son obligatorios.');
      return;
    }

    this.guardandoEdicion.set(true);
    const hijosArr = Array.from(this.editHijosSeleccionados);

    this.api.adminActualizarAcudiente(acud.id, {
      nombre: this.editAcudNombre.trim(),
      documento: this.editAcudDocumento.trim(),
      telefono: this.editAcudTelefono.trim(),
      correo: this.editAcudCorreo.trim(),
      password: this.editAcudPassword.trim() || undefined,
      estudianteIds: hijosArr
    }).subscribe({
      next: (res) => {
        this.guardandoEdicion.set(false);
        this.acudienteParaEditar.set(null);
        this.mostrarToast('exito', 'Acudiente Actualizado', res.mensaje || 'Información actualizada exitosamente.');
        this.api.adminAcudientes().subscribe({ next: a => this.acudientes.set(a) });
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.mostrarToast('error', 'Error al Actualizar', mensajeError(err));
      }
    });
  }

  abrirModalEliminarAcudiente(acud: any): void {
    this.acudienteParaEliminar.set(acud);
  }

  confirmarEliminarAcudiente(): void {
    const acud = this.acudienteParaEliminar();
    if (!acud) return;

    this.eliminando.set(true);
    this.api.adminEliminarAcudiente(acud.id).subscribe({
      next: (res) => {
        this.eliminando.set(false);
        this.acudienteParaEliminar.set(null);
        this.mostrarToast('exito', 'Acudiente Eliminado', res.mensaje);
        this.api.adminAcudientes().subscribe({ next: a => this.acudientes.set(a) });
        this.cargarEstudiantes();
        this.api.adminResumen().subscribe({ next: r => this.resumen.set(r) });
      },
      error: (err) => {
        this.eliminando.set(false);
        this.mostrarToast('error', 'Error al Eliminar', mensajeError(err));
      }
    });
  }

  copiarClave(clave: string): void {
    navigator.clipboard.writeText(clave).then(() => {
      this.copiado.set(true);
      this.mostrarToast('exito', '¡Copiado!', 'Contraseña copiada al portapapeles.');
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  cerrarModalClave(): void {
    this.modalClave.set(null);
    this.copiado.set(false);
  }
}
