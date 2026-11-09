import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ObservacionConvivencia } from '../core/models';
import { mensajeError } from '../core/errores';

interface EstudianteSugerido {
  id: number;
  nombre: string;
  documento: string;
  grupoId: number;
  grupo: string;
  activo: boolean;
}

@Component({
  selector: 'app-convivencia',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <!-- Encabezado Institucional -->
      <div class="entre" style="margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.25rem;">
            <span style="font-size: 2rem;">⚖️</span>
            <h1 style="margin: 0; font-size: 1.85rem;">Observador de Convivencia Escolar</h1>
          </div>
          <p class="lead" style="margin: 0; max-width: 48rem;">
            Libro de vida y observador formativo institucional (Ley 1620 de Convivencia Escolar). Registro de reconocimientos al mérito, compromisos pedagógicos y situaciones Tipo I, II y III.
          </p>
        </div>

        @if (esDocenteODirector) {
          <button type="button" class="btn-principal" (click)="toggleFormulario()" style="font-size: 0.95rem; padding: 0.65rem 1.25rem;">
            {{ mostrarFormulario() ? '✕ Cerrar Formulario' : '➕ Registrar Anotación' }}
          </button>
        }
      </div>

      @if (error()) { <p class="aviso error">{{ error() }}</p> }
      @if (exito()) { <p class="aviso" style="background: var(--grade-superior-bg); color: var(--grade-superior); border-color: var(--grade-superior);">{{ exito() }}</p> }

      <!-- Formulario para agregar anotación (Docentes / Directores) -->
      @if (mostrarFormulario()) {
        <div class="card" style="margin-bottom: 1.75rem; border-top: 4px solid var(--accent-purple); box-shadow: var(--shadow-lg);">
          <div class="entre" style="margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.4rem;">✍️</span>
              <h2 style="margin: 0; font-size: 1.25rem;">Registrar Evento en el Observador</h2>
            </div>
            <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.25rem 0.55rem;" (click)="mostrarFormulario.set(false)">
              ✕ Cerrar
            </button>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Toda anotación queda consignada en el historial formativo del alumno y se refleja de inmediato en los paneles directivos y del acudiente.
          </p>

          <form (ngSubmit)="guardar()" style="display: grid; gap: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem;">
              <!-- Búsqueda Asíncrona con Autocompletado y Debounce (ERR-007) -->
              <div style="position: relative;">
                <label style="font-weight: 600; font-size: 0.88rem; display: block;">
                  Estudiante Objeto de la Anotación <span style="color: #ef4444;">*</span>
                </label>

                @if (estudianteSeleccionado()) {
                  <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-hover); border: 1.5px solid var(--primary); border-radius: var(--radius-md); padding: 0.55rem 0.85rem; margin-top: 0.35rem;">
                    <div>
                      <strong style="color: var(--text-primary); font-size: 0.9rem; display: block;">{{ estudianteSeleccionado()?.nombre }}</strong>
                      <small style="color: var(--text-muted); font-size: 0.78rem;">Grupo: {{ estudianteSeleccionado()?.grupo }} · Doc: {{ estudianteSeleccionado()?.documento }}</small>
                    </div>
                    <button type="button" class="btn-secundario" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" (click)="deseleccionarEstudiante()">
                      ✕ Cambiar
                    </button>
                  </div>
                } @else {
                  <div style="position: relative; margin-top: 0.35rem;">
                    <input
                      type="text"
                      [(ngModel)]="busquedaEstudianteTexto"
                      name="busquedaEstudianteTexto"
                      (input)="onBusquedaEstudianteInput($event)"
                      placeholder="🔍 Escribe nombre o documento..."
                      style="width: 100%; box-sizing: border-box;"
                    />
                    @if (buscandoEstudiantes()) {
                      <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-muted);">
                        Buscando…
                      </span>
                    }

                    @if (estudiantesSugeridos().length > 0) {
                      <div class="dropdown-resultados-async" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--bg-surface-solid); border: 1.5px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); max-height: 14rem; overflow-y: auto; margin-top: 0.25rem;">
                        @for (est of estudiantesSugeridos(); track est.id) {
                          <div
                            (click)="seleccionarEstudiante(est)"
                            style="padding: 0.6rem 0.85rem; cursor: pointer; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;"
                            class="dropdown-item-hover"
                          >
                            <div>
                              <strong style="display: block; font-size: 0.88rem; color: var(--text-primary);">{{ est.nombre }}</strong>
                              <small style="color: var(--text-secondary); font-size: 0.75rem;">Doc: {{ est.documento }}</small>
                            </div>
                            <span class="chip-grupo" style="font-size: 0.72rem;">{{ est.grupo }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <label style="font-weight: 600; font-size: 0.88rem;">
                Clasificación de Convivencia (Ley 1620) <span style="color: #ef4444;">*</span>:
                <select [(ngModel)]="nuevoTipo" name="nuevoTipo" required style="width: 100%; margin-top: 0.35rem;">
                  <option value="Felicitacion">🌟 Mérito / Reconocimiento Formativo</option>
                  <option value="Atencion">⚠️ Situación Tipo I · Llamado de Atención Leve</option>
                  <option value="FaltaLeve">🟠 Situación Tipo II · Falta Disciplinaria Grave</option>
                  <option value="FaltaGrave">🔴 Situación Tipo III · Falta Gravísima</option>
                </select>
              </label>

              <label style="font-weight: 600; font-size: 0.88rem;">
                Fecha del Suceso <span style="color: #ef4444;">*</span>:
                <input type="date" [(ngModel)]="nuevaFecha" name="nuevaFecha" required style="width: 100%; margin-top: 0.35rem;" />
              </label>
            </div>

            <label style="font-weight: 600; font-size: 0.88rem;">
              Título o Asunto del Registro <span style="color: #ef4444;">*</span>:
              <input [(ngModel)]="nuevoTitulo" name="nuevoTitulo" required placeholder="Ej: Participación distinguida en Feria de Ciencias / Desatención reiterada en clase" style="width: 100%; margin-top: 0.35rem;" />
            </label>

            <label style="font-weight: 600; font-size: 0.88rem;">
              Descripción Objetiva de los Hechos <span style="color: #ef4444;">*</span>:
              <textarea [(ngModel)]="nuevaDescripcion" name="nuevaDescripcion" rows="3" required placeholder="Redacta de manera clara, descriptiva y pedagógica lo sucedido en la jornada escolar..." style="width: 100%; margin-top: 0.35rem;"></textarea>
            </label>

            <label style="font-weight: 600; font-size: 0.88rem;">
              🤝 Compromiso Pedagógico Acordado con el Estudiante:
              <input [(ngModel)]="nuevoCompromiso" name="nuevoCompromiso" placeholder="Ej: Entregar actividades pendientes el lunes y mejorar disposición en el aula" style="width: 100%; margin-top: 0.35rem;" />
            </label>

            <div style="display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 0.5rem;">
              <button type="button" class="btn-secundario" (click)="mostrarFormulario.set(false)">Cancelar</button>
              <button type="submit" class="btn-principal" [disabled]="guardando()">
                {{ guardando() ? 'Guardando en Observador...' : '✔ Guardar en Observador y Notificar a Familia' }}
              </button>
            </div>
          </form>
        </div>
      } @else {
        <!-- ERR-006: Indicadores y Listado protegidos en condición opuesta para evitar superposición -->

        <!-- KPIs Resumen del Observador Escolar -->
        <div class="kpi-grid" style="margin-bottom: 1.5rem;">
          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--accent-purple-bg); color: var(--accent-purple);">📜</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Total Registros</span>
              <strong class="kpi-numero" style="color: var(--accent-purple);">{{ observaciones().length }}</strong>
              <span class="kpi-desc">Anotaciones registradas</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">🌟</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Méritos y Felicitaciones</span>
              <strong class="kpi-numero" style="color: var(--grade-superior);">{{ contarTipo('Felicitacion') }}</strong>
              <span class="kpi-desc">Reconocimiento pedagógico</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-basico-bg); color: var(--grade-basico);">⚠️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Tipo I (Formativo / Leve)</span>
              <strong class="kpi-numero" style="color: var(--grade-basico);">{{ contarTipo('Atencion') }}</strong>
              <span class="kpi-desc">Conflictos cotidianos</span>
            </div>
          </div>

          <div class="kpi-banner alerta">
            <div class="kpi-icono" style="background: var(--grade-bajo-bg); color: var(--grade-bajo);">🔴</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Tipo II y III (Graves)</span>
              <strong class="kpi-numero" style="color: var(--grade-bajo);">{{ contarTipo('FaltaLeve') + contarTipo('FaltaGrave') }}</strong>
              <span class="kpi-desc">Seguimiento disciplinario</span>
            </div>
          </div>
        </div>

        <!-- Barra de Filtros y Búsqueda -->
        <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
          <div class="entre" style="flex-wrap: wrap; gap: 1rem; align-items: center;">
            <!-- Píldoras de Filtro por Categoría -->
            <div class="ai-radar-filters" style="margin: 0;">
              <button type="button" class="ai-filter-btn" [class.activo]="filtroTipo() === 'todos'" (click)="filtroTipo.set('todos')">
                📋 Todos ({{ observaciones().length }})
              </button>
              <button type="button" class="ai-filter-btn" [class.activo]="filtroTipo() === 'Felicitacion'" (click)="filtroTipo.set('Felicitacion')">
                <span style="color: var(--grade-superior);">🌟</span> Méritos ({{ contarTipo('Felicitacion') }})
              </button>
              <button type="button" class="ai-filter-btn" [class.activo]="filtroTipo() === 'Atencion'" (click)="filtroTipo.set('Atencion')">
                <span style="color: var(--grade-basico);">⚠️</span> Tipo I ({{ contarTipo('Atencion') }})
              </button>
              <button type="button" class="ai-filter-btn" [class.activo]="filtroTipo() === 'FaltaLeve'" (click)="filtroTipo.set('FaltaLeve')">
                <span style="color: var(--grade-alto);">🟠</span> Tipo II ({{ contarTipo('FaltaLeve') }})
              </button>
              <button type="button" class="ai-filter-btn" [class.activo]="filtroTipo() === 'FaltaGrave'" (click)="filtroTipo.set('FaltaGrave')">
                <span style="color: var(--grade-bajo);">🔴</span> Tipo III ({{ contarTipo('FaltaGrave') }})
              </button>
            </div>

            <!-- Buscador por texto -->
            <div style="max-width: 18rem; width: 100%;">
              <input
                type="text"
                [ngModel]="busquedaTexto()"
                (ngModelChange)="busquedaTexto.set($event)"
                placeholder="🔍 Buscar por alumno, grupo o título..."
                style="width: 100%; box-sizing: border-box; padding: 0.45rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: var(--bg-surface-solid); color: var(--text-primary);"
              />
            </div>
          </div>
        </div>

        <!-- Timeline de Anotaciones Organizadas -->
        @if (cargando()) {
          <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
            <div class="pulsing-dot" style="margin: 0 auto 0.75rem; width: 14px; height: 14px;"></div>
            <p class="lead" style="margin: 0;">Cargando registros oficiales del observador escolar...</p>
          </div>
        } @else {
          <div style="display: grid; gap: 1rem;">
            @for (obs of observacionesPaginadas(); track obs.id) {
              <div class="card card-interactiva" style="border-left: 5px solid; padding: 1.25rem 1.5rem;" [style.border-left-color]="colorBorde(obs.tipo)">
                <!-- Encabezado de la Anotación -->
                <div class="entre" style="flex-wrap: wrap; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.65rem;">
                  <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <span class="badge" [class]="claseBadge(obs.tipo)" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                      {{ textoTipo(obs.tipo) }}
                    </span>
                    <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary);">{{ obs.titulo }}</h3>
                  </div>

                  <!-- Botones de Acción (ERR-005: Edición y Anulación) -->
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); font-size: 0.8rem;">
                      📅 {{ obs.fecha }}
                    </span>
                    @if (esDocenteODirector) {
                      <button type="button" class="btn-secundario" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;" (click)="abrirModalEditar(obs)" title="Editar observación">
                        ✏️ Editar
                      </button>
                      <button type="button" class="btn-secundario" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" (click)="abrirModalEliminar(obs)" title="Anular o eliminar observación">
                        🗑️ Anular
                      </button>
                    }
                  </div>
                </div>

                <!-- Metadatos del Estudiante y Docente -->
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.85rem; padding-bottom: 0.65rem; border-bottom: 1px dashed var(--border);">
                  <span>🎓 Alumno: <strong style="color: var(--text-primary);">{{ obs.estudianteNombre }}</strong></span>
                  <span>·</span>
                  <span>Grado/Grupo: <span class="chip-grupo">{{ obs.grupo }}</span></span>
                  <span>·</span>
                  <span>Documento: <strong style="font-family: monospace;">{{ obs.estudianteDocumento }}</strong></span>
                  <span>·</span>
                  <span>Registrado por: <em>{{ obs.profesorNombre }}</em></span>
                </div>

                <!-- Descripción de los Hechos -->
                <div style="background: var(--bg-hover); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 0.85rem;">
                  <span style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; font-weight: 600;">
                    Hechos Registrados:
                  </span>
                  <p style="margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">{{ obs.descripcion }}</p>
                </div>

                <!-- Compromiso Pedagógico Formativo -->
                @if (obs.compromiso) {
                  <div style="background: var(--grade-superior-bg); border: 1px solid var(--grade-superior); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem;">
                      <span style="color: var(--grade-superior); font-size: 1rem;">🤝</span>
                      <strong style="color: var(--grade-superior); font-size: 0.85rem;">Compromiso Pedagógico Formativo Acordado:</strong>
                    </div>
                    <span style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.4;">{{ obs.compromiso }}</span>
                  </div>
                }

                <!-- Estado de Notificación a Familia -->
                <div class="entre" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
                  <span style="display: flex; align-items: center; gap: 0.35rem; color: var(--grade-superior); font-weight: 550;">
                    <span>✉️</span> Notificado formalmente a familia / acudiente
                  </span>
                  <span style="font-size: 0.75rem;">ID de Registro: #{{ obs.id }}</span>
                </div>
              </div>
            } @empty {
              <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
                <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🕊️</span>
                <h3 style="margin: 0 0 0.35rem;">Sin registros en este filtro</h3>
                <p class="lead" style="margin: 0;">No se encontraron anotaciones de convivencia que coincidan con los criterios seleccionados.</p>
              </div>
            }

            <!-- Slider de Paginación del Observador -->
            @if (observacionesFiltradas().length > 0) {
              <div class="paginacion-slider-control">
                <span class="pag-info-tag">Página {{ pagina() }} de {{ totalPaginas() }} ({{ observacionesFiltradas().length }} registros)</span>
                <div class="paginacion-slider-track">
                  <button type="button" class="btn-pag-nav" [disabled]="pagina() <= 1" (click)="pagina.set(pagina() - 1)">‹</button>
                  <input
                    type="range"
                    class="paginacion-slider-input"
                    min="1"
                    [max]="totalPaginas()"
                    [value]="pagina()"
                    (input)="onSliderChange($event)"
                  />
                  <button type="button" class="btn-pag-nav" [disabled]="pagina() >= totalPaginas()" (click)="pagina.set(pagina() + 1)">›</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Modal Editar Anotación de Convivencia (ERR-005) -->
      @if (observacionParaEditar()) {
        <div class="modal-backdrop" (click)="cerrarModalEditar()">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 32rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h2 style="font-size: 1.25rem; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                <span>✏️</span> Editar Anotación #{{ observacionParaEditar()?.id }}
              </h2>
              <button type="button" class="btn-cerrar-drawer" style="width: 28px; height: 28px;" (click)="cerrarModalEditar()">✕</button>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Estudiante: <strong>{{ observacionParaEditar()?.estudianteNombre }}</strong> ({{ observacionParaEditar()?.grupo }})
            </p>

            <form (ngSubmit)="guardarEdicion()" style="display: grid; gap: 0.9rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <label style="font-size: 0.82rem; font-weight: 600;">
                  Clasificación <span style="color: #ef4444;">*</span>
                  <select [(ngModel)]="editTipo" name="editTipo" style="width: 100%; margin-top: 0.3rem;">
                    <option value="Felicitacion">🌟 Mérito / Reconocimiento</option>
                    <option value="Atencion">⚠️ Situación Tipo I</option>
                    <option value="FaltaLeve">🟠 Situación Tipo II</option>
                    <option value="FaltaGrave">🔴 Situación Tipo III</option>
                  </select>
                </label>

                <label style="font-size: 0.82rem; font-weight: 600;">
                  Fecha <span style="color: #ef4444;">*</span>
                  <input type="date" [(ngModel)]="editFecha" name="editFecha" required style="width: 100%; margin-top: 0.3rem;" />
                </label>
              </div>

              <label style="font-size: 0.82rem; font-weight: 600;">
                Título o Asunto <span style="color: #ef4444;">*</span>
                <input [(ngModel)]="editTitulo" name="editTitulo" required style="width: 100%; margin-top: 0.3rem;" />
              </label>

              <label style="font-size: 0.82rem; font-weight: 600;">
                Descripción de los Hechos <span style="color: #ef4444;">*</span>
                <textarea [(ngModel)]="editDescripcion" name="editDescripcion" rows="3" required style="width: 100%; margin-top: 0.3rem;"></textarea>
              </label>

              <label style="font-size: 0.82rem; font-weight: 600;">
                Compromiso Pedagógico Formativo
                <input [(ngModel)]="editCompromiso" name="editCompromiso" placeholder="Compromiso acordado..." style="width: 100%; margin-top: 0.3rem;" />
              </label>

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" class="btn-secundario" (click)="cerrarModalEditar()">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardandoEdicion()">
                  {{ guardandoEdicion() ? 'Guardando…' : 'Guardar Cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Confirmar Anulación / Eliminación (ERR-005) -->
      @if (observacionParaEliminar()) {
        <div class="modal-backdrop" (click)="observacionParaEliminar.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 27rem; width: 92%; margin: 0 auto; box-shadow: var(--shadow-lg); border-top: 4px solid #ef4444; text-align: center;">
            <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🗑️</span>
            <h2 style="font-size: 1.25rem; margin-bottom: 0.35rem; color: #ef4444;">¿Anular Anotación de Convivencia?</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Estás a punto de anular la observación <strong>"{{ observacionParaEliminar()?.titulo }}"</strong> registrada para el estudiante <strong>{{ observacionParaEliminar()?.estudianteNombre }}</strong>.
            </p>
            <div style="display: flex; gap: 0.6rem; justify-content: center;">
              <button type="button" class="btn-secundario" (click)="observacionParaEliminar.set(null)">Cancelar</button>
              <button type="button" class="btn-principal" style="background: #ef4444; border-color: #ef4444;" [disabled]="eliminando()" (click)="confirmarEliminar()">
                {{ eliminando() ? 'Anulando…' : 'Confirmar Anulación' }}
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `
})
export class ConvivenciaComponent implements OnInit {
  observaciones = signal<ObservacionConvivencia[]>([]);
  mostrarFormulario = signal(false);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  exito = signal('');

  // Búsqueda Asíncrona de Estudiantes con Debounce (ERR-007)
  busquedaEstudianteTexto = '';
  estudianteSeleccionado = signal<EstudianteSugerido | null>(null);
  estudiantesSugeridos = signal<EstudianteSugerido[]>([]);
  buscandoEstudiantes = signal(false);
  private timerDebounceBusqueda: any = null;

  // Filtros interactivos
  filtroTipo = signal<'todos' | 'Felicitacion' | 'Atencion' | 'FaltaLeve' | 'FaltaGrave'>('todos');
  busquedaTexto = signal('');

  observacionesFiltradas = computed(() => {
    const list = this.observaciones();
    const tipo = this.filtroTipo();
    const q = this.busquedaTexto().trim().toLowerCase();

    return list.filter(item => {
      const coincideTipo = tipo === 'todos' || item.tipo === tipo;
      const coincideTexto = !q ||
        item.estudianteNombre.toLowerCase().includes(q) ||
        item.grupo.toLowerCase().includes(q) ||
        item.estudianteDocumento.toLowerCase().includes(q) ||
        item.titulo.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q);
      return coincideTipo && coincideTexto;
    });
  });

  // Paginación con slider
  pagina = signal(1);
  elementosPorPagina = signal(6);
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.observacionesFiltradas().length / this.elementosPorPagina())));
  observacionesPaginadas = computed(() => {
    const list = this.observacionesFiltradas();
    const p = Math.min(this.pagina(), this.totalPaginas());
    const inicio = (p - 1) * this.elementosPorPagina();
    return list.slice(inicio, inicio + this.elementosPorPagina());
  });

  onSliderChange(e: Event): void {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) this.pagina.set(v);
  }

  // Campos formulario
  nuevoTipo = 'Atencion';
  nuevoTitulo = '';
  nuevaDescripcion = '';
  nuevoCompromiso = '';
  nuevaFecha = new Date().toISOString().substring(0, 10);

  // Estados Edición (ERR-005)
  observacionParaEditar = signal<ObservacionConvivencia | null>(null);
  editTipo = 'Atencion';
  editTitulo = '';
  editDescripcion = '';
  editCompromiso = '';
  editFecha = '';
  guardandoEdicion = signal(false);

  // Estados Eliminación (ERR-005)
  observacionParaEliminar = signal<ObservacionConvivencia | null>(null);
  eliminando = signal(false);

  esDocenteODirector = false;

  constructor(private api: ApiService, private auth: AuthService) {
    const rol = auth.rol();
    this.esDocenteODirector = rol === 'Profesor' || rol === 'Director' || rol === 'Admin';
  }

  ngOnInit(): void {
    this.cargar();
  }

  toggleFormulario(): void {
    this.mostrarFormulario.set(!this.mostrarFormulario());
    this.error.set('');
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.convivencia().subscribe({
      next: (res) => {
        this.observaciones.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  onBusquedaEstudianteInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    clearTimeout(this.timerDebounceBusqueda);

    if (!q || q.trim().length < 2) {
      this.estudiantesSugeridos.set([]);
      this.buscandoEstudiantes.set(false);
      return;
    }

    this.buscandoEstudiantes.set(true);
    this.timerDebounceBusqueda = setTimeout(() => {
      this.api.buscarEstudiantes(q.trim(), 10).subscribe({
        next: (res) => {
          this.estudiantesSugeridos.set(res || []);
          this.buscandoEstudiantes.set(false);
        },
        error: () => {
          this.estudiantesSugeridos.set([]);
          this.buscandoEstudiantes.set(false);
        }
      });
    }, 280);
  }

  seleccionarEstudiante(est: EstudianteSugerido): void {
    this.estudianteSeleccionado.set(est);
    this.estudiantesSugeridos.set([]);
    this.busquedaEstudianteTexto = '';
  }

  deseleccionarEstudiante(): void {
    this.estudianteSeleccionado.set(null);
    this.busquedaEstudianteTexto = '';
  }

  guardar(): void {
    const alumno = this.estudianteSeleccionado();
    if (!alumno) {
      this.error.set('Por favor busca y selecciona un estudiante.');
      return;
    }
    if (!this.nuevoTitulo.trim() || !this.nuevaDescripcion.trim()) {
      this.error.set('Escribe el título y la descripción objetiva de los hechos.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.api.crearConvivencia({
      estudianteId: alumno.id,
      tipo: this.nuevoTipo,
      titulo: this.nuevoTitulo,
      descripcion: this.nuevaDescripcion,
      compromiso: this.nuevoCompromiso,
      fecha: this.nuevaFecha
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set('Anotación registrada en el observador escolar y notificada con éxito.');
        this.mostrarFormulario.set(false);
        this.deseleccionarEstudiante();
        this.nuevoTitulo = '';
        this.nuevaDescripcion = '';
        this.nuevoCompromiso = '';
        this.cargar();
        setTimeout(() => this.exito.set(''), 4000);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  // Métodos CRUD Edición (ERR-005)
  abrirModalEditar(obs: ObservacionConvivencia): void {
    this.observacionParaEditar.set(obs);
    this.editTipo = obs.tipo;
    this.editTitulo = obs.titulo;
    this.editDescripcion = obs.descripcion;
    this.editCompromiso = obs.compromiso || '';
    this.editFecha = obs.fecha;
  }

  cerrarModalEditar(): void {
    this.observacionParaEditar.set(null);
  }

  guardarEdicion(): void {
    const obs = this.observacionParaEditar();
    if (!obs) return;

    if (!this.editTitulo.trim() || !this.editDescripcion.trim()) {
      this.error.set('El título y la descripción son obligatorios.');
      return;
    }

    this.guardandoEdicion.set(true);
    this.api.actualizarConvivencia(obs.id, {
      tipo: this.editTipo,
      titulo: this.editTitulo.trim(),
      descripcion: this.editDescripcion.trim(),
      compromiso: this.editCompromiso.trim() || undefined,
      fecha: this.editFecha
    }).subscribe({
      next: () => {
        this.guardandoEdicion.set(false);
        this.cerrarModalEditar();
        this.exito.set('Anotación del observador escolar actualizada exitosamente.');
        this.cargar();
        setTimeout(() => this.exito.set(''), 4000);
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  // Métodos CRUD Eliminación / Anulación (ERR-005)
  abrirModalEliminar(obs: ObservacionConvivencia): void {
    this.observacionParaEliminar.set(obs);
  }

  confirmarEliminar(): void {
    const obs = this.observacionParaEliminar();
    if (!obs) return;

    this.eliminando.set(true);
    this.api.eliminarConvivencia(obs.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.observacionParaEliminar.set(null);
        this.exito.set('Anotación de convivencia anulada / eliminada con éxito.');
        this.cargar();
        setTimeout(() => this.exito.set(''), 4000);
      },
      error: (err) => {
        this.eliminando.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  contarTipo(tipo: string): number {
    return this.observaciones().filter(o => o.tipo === tipo).length;
  }

  colorBorde(tipo: string): string {
    if (tipo === 'Felicitacion') return 'var(--grade-superior)';
    if (tipo === 'Atencion') return 'var(--grade-basico)';
    if (tipo === 'FaltaLeve') return 'var(--grade-alto)';
    return 'var(--grade-bajo)';
  }

  claseBadge(tipo: string): string {
    if (tipo === 'Felicitacion') return 'badge-verde';
    if (tipo === 'Atencion') return 'badge-amarillo';
    if (tipo === 'FaltaLeve') return 'badge-azul';
    return 'badge-rojo';
  }

  textoTipo(tipo: string): string {
    if (tipo === 'Felicitacion') return '🌟 Mérito / Reconocimiento';
    if (tipo === 'Atencion') return '⚠️ Situación Tipo I · Falta Leve';
    if (tipo === 'FaltaLeve') return '🟠 Situación Tipo II · Falta Disciplinaria';
    return '🔴 Situación Tipo III · Falta Gravísima';
  }
}
