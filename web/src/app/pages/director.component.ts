import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { HorarioClaseItem } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <section class="pagina">
      <!-- Encabezado Directivo -->
      <div class="entre" style="margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
            <span style="font-size: 2rem;">🏛️</span>
            <h1 style="margin: 0;">Dirección Institucional & Currículo</h1>
          </div>
          <p class="lead" style="margin: 0; max-width: 52rem;">
            Supervisión de la planta docente creada por Administración, creación y amarre curricular de asignaturas por docente y grado escolar, programación oficial del horario de clases y matrícula de estudiantes.
          </p>
        </div>
      </div>

      <!-- Alertas de Estado -->
      @if (aviso()) {
        <div class="aviso exito" style="margin-bottom: 1.25rem;">{{ aviso() }}</div>
      }
      @if (error()) {
        <div class="aviso error" style="margin-bottom: 1.25rem;">{{ error() }}</div>
      }

      <!-- Modal de Notificación de Clave Generada para Estudiante Matriculado -->
      @if (modalClave()) {
        <div class="modal-backdrop" (click)="modalClave.set(null)">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 28rem; width: 92%; margin: 0 auto; text-align: center; border-top: 4px solid var(--primary); box-shadow: var(--shadow-lg);">
            <span style="font-size: 2.75rem; display: block; margin-bottom: 0.5rem;">🎓</span>
            <h2 style="font-size: 1.35rem; margin-bottom: 0.25rem;">Estudiante Matriculado</h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
              Estudiante: <strong>{{ modalClave()?.nombre }}</strong> · Doc: {{ modalClave()?.documento }} · Grado: {{ modalClave()?.grupo }}
            </p>

            <div style="background: var(--bg-hover); border: 2px dashed var(--primary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                Clave Dinámica Inicial de Ingreso:
              </span>
              <strong style="font-size: 1.4rem; font-family: monospace; letter-spacing: 0.08em; color: var(--primary);">
                {{ modalClave()?.clave }}
              </strong>
            </div>

            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
              El alumno ingresará con su documento de identidad y esta clave temporal, y el sistema le solicitará cambiarla obligatoriamente en su primer ingreso.
            </p>

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button type="button" class="btn-principal" (click)="copiarClave(modalClave()?.clave || '')">
                📋 {{ copiado() ? '¡Copiada!' : 'Copiar Clave' }}
              </button>
              <button type="button" class="btn-secundario" (click)="modalClave.set(null)">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Navegación por Tabs Directivas -->
      <div class="segmento-toggle" style="margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button type="button" [class.activo]="tabActiva() === 'docentes'" (click)="tabActiva.set('docentes')">
          👨‍🏫 Planta Docente ({{ docentes().length }})
        </button>
        <button type="button" [class.activo]="tabActiva() === 'asignaturas'" (click)="tabActiva.set('asignaturas')">
          📚 Asignaturas & Cursos ({{ asignaturas().length }})
        </button>
        <button type="button" [class.activo]="tabActiva() === 'horarios'" (click)="tabActiva.set('horarios')">
          📅 Horarios de Clases ({{ horarios().length }})
        </button>
        <button type="button" [class.activo]="tabActiva() === 'matricula'" (click)="tabActiva.set('matricula')">
          🎓 Matrícula Escolar
        </button>
      </div>

      <!-- ======================================================================
           TAB 1: REVISIÓN DE PLANTA DOCENTE CREADA POR ADMIN
           ====================================================================== -->
      @if (tabActiva() === 'docentes') {
        <div class="card" style="margin-bottom: 1.25rem; background: var(--bg-surface); border-left: 4px solid var(--accent-purple); padding: 1rem 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.4rem;">ℹ️</span>
            <div>
              <strong style="font-size: 0.95rem; color: var(--text-primary);">Competencia Directiva: Supervisión y Carga Curricular</strong>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
                Los usuarios docentes son dados de alta por el Administrador con su Cédula de Ciudadanía. Desde Dirección se verifica su estado activo y se le vinculan las materias y cursos.
              </p>
            </div>
          </div>
        </div>

        <!-- Barra de Búsqueda de Docentes -->
        <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1rem;">
          <div class="entre" style="gap: 1rem; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Docentes Registrados por Administración
            </span>
            <div style="min-width: 16rem;">
              <input
                type="text"
                [(ngModel)]="busquedaDocentes"
                placeholder="🔍 Buscar docente por nombre o cédula..."
                style="width: 100%;"
              />
            </div>
          </div>
        </div>

        <!-- Tabla de Docentes con Slider -->
        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Cédula de Ciudadanía</th>
                  <th>Estado</th>
                  <th>Carga Asignada (Materias)</th>
                  <th>Grupos Titulares</th>
                </tr>
              </thead>
              <tbody>
                @for (doc of docentesPaginados(); track doc.id) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">👨‍🏫</span>
                        <strong>{{ doc.nombre }}</strong>
                      </div>
                    </td>

                    <td style="font-family: monospace; font-size: 0.9rem; font-weight: 600; color: var(--primary);">
                      {{ doc.cedula || doc.usuario }}
                    </td>

                    <td>
                      <span class="badge" [class.badge-verde]="doc.activo" [class.badge-rojo]="!doc.activo">
                        {{ doc.activo ? '● Activo' : '○ Inactivo' }}
                      </span>
                    </td>

                    <td>
                      @if (doc.materias && doc.materias.length > 0) {
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                          @for (m of doc.materias; track m.id) {
                            <span class="chip-materia">{{ m.nombre }}</span>
                          }
                        </div>
                      } @else {
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Sin asignaturas vinculadas</span>
                      }
                    </td>

                    <td>
                      @if (doc.grupos && doc.grupos.length > 0) {
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                          @for (g of doc.grupos; track g.id) {
                            <span class="chip-grupo">{{ g.nombre }}</span>
                          }
                        </div>
                      } @else {
                        <span style="font-size: 0.8rem; color: var(--text-muted);">—</span>
                      }
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
          @if (docentesFiltrados().length > 0) {
            <div class="paginacion-slider-control">
              <span class="pag-info-tag">Página {{ paginaDocentes() }} de {{ totalPaginasDocentes() }} ({{ docentesFiltrados().length }} docentes)</span>
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
           TAB 2: GESTIÓN DE ASIGNATURAS Y CURSOS (AMARRE CURRICULAR)
           ====================================================================== -->
      @if (tabActiva() === 'asignaturas') {
        <div class="card" style="margin-bottom: 1.25rem; background: var(--bg-surface); border-left: 4px solid var(--accent-blue); padding: 1rem 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.4rem;">📚</span>
            <div>
              <strong style="font-size: 0.95rem; color: var(--text-primary);">Competencia Directiva: Creación y Amarre Curricular</strong>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
                El Director crea las materias institucionales y las amarra simultáneamente al docente titular y al grado escolar correspondiente. El profesor no gestiona asignaturas.
              </p>
            </div>
          </div>
        </div>

        <!-- Botón y Formulario de Nueva Asignatura -->
        <div class="entre" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
          <button type="button" class="btn-principal" (click)="mostrarFormAsignatura.set(!mostrarFormAsignatura())">
            {{ mostrarFormAsignatura() ? '✕ Cancelar Creación' : '➕ Crear y Amarrar Asignatura' }}
          </button>

          <div style="min-width: 16rem;">
            <input
              type="text"
              [(ngModel)]="busquedaAsignaturas"
              placeholder="🔍 Buscar asignatura, docente o curso..."
              style="width: 100%;"
            />
          </div>
        </div>

        @if (mostrarFormAsignatura()) {
          <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--accent-blue); padding: 1.5rem;">
            <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.15rem;">➕ Crear Asignatura y Amarrar a Docente y Grado</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Selecciona o escribe el nombre de la materia, asigna el profesor responsable e indica el curso escolar.
            </p>

            <form (ngSubmit)="guardarAsignatura()">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <label style="font-weight: 600; font-size: 0.88rem;">
                  Nombre de la Asignatura
                  <input
                    type="text"
                    [(ngModel)]="nuevaAsignaturaNombre"
                    name="nuevaAsignaturaNombre"
                    list="materiasSugeridasList"
                    required
                    placeholder="Ej. Matemáticas, Robótica, Ciencias..."
                    style="width: 100%; margin-top: 0.35rem;"
                  />
                  <datalist id="materiasSugeridasList">
                    @for (m of catalogoMaterias(); track m) {
                      <option [value]="m"></option>
                    }
                  </datalist>
                </label>

                <label style="font-weight: 600; font-size: 0.88rem;">
                  Docente Titular Asignado
                  <select [(ngModel)]="nuevoProfesorId" name="nuevoProfesorId" required style="width: 100%; margin-top: 0.35rem;">
                    <option [ngValue]="0">Selecciona docente...</option>
                    @for (p of docentes(); track p.id) {
                      <option [ngValue]="p.id">{{ p.nombre }} (C.C. {{ p.cedula || p.usuario }})</option>
                    }
                  </select>
                </label>

                <label style="font-weight: 600; font-size: 0.88rem;">
                  Grado / Curso Escolar (Amarre)
                  <select [(ngModel)]="nuevoGrupoId" name="nuevoGrupoId" required style="width: 100%; margin-top: 0.35rem;">
                    <option [ngValue]="0">Selecciona grado...</option>
                    @for (g of catalogoGrupos(); track g.id) {
                      <option [ngValue]="g.id">{{ g.nombre }} ({{ g.estudiantesCount }} alumnos)</option>
                    }
                  </select>
                </label>
              </div>

              <div style="display: flex; gap: 0.65rem; justify-content: flex-end;">
                <button type="button" class="btn-secundario" (click)="mostrarFormAsignatura.set(false)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardandoAsignatura()">
                  {{ guardandoAsignatura() ? 'Amarrando materia…' : '✔ Guardar y Amarrar Curso' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Tabla de Asignaturas Creadas y Amarradas -->
        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>Docente Responsable</th>
                  <th>Cédula Docente</th>
                  <th>Cursos Vinculados</th>
                </tr>
              </thead>
              <tbody>
                @for (asig of asignaturasPaginadas(); track asig.id) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.15rem;">📚</span>
                        <strong style="font-size: 0.95rem;">{{ asig.nombre }}</strong>
                      </div>
                    </td>

                    <td>
                      <strong>{{ asig.profesorNombre }}</strong>
                    </td>

                    <td style="font-family: monospace; font-size: 0.88rem; color: var(--text-secondary);">
                      {{ asig.profesorCedula || '—' }}
                    </td>

                    <td>
                      @if (asig.grupos && asig.grupos.length > 0) {
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                          @for (g of asig.grupos; track g.grupoId) {
                            <span class="chip-grupo">{{ g.grupoNombre }}</span>
                          }
                        </div>
                      } @else {
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Sin grupo asignado</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No se encontraron asignaturas con ese criterio de búsqueda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Slider de Paginación de Asignaturas -->
          @if (asignaturasFiltradas().length > 0) {
            <div class="paginacion-slider-control">
              <span class="pag-info-tag">Página {{ paginaAsignaturas() }} de {{ totalPaginasAsignaturas() }} ({{ asignaturasFiltradas().length }} asignaturas)</span>
              <div class="paginacion-slider-track">
                <button type="button" class="btn-pag-nav" [disabled]="paginaAsignaturas() <= 1" (click)="paginaAsignaturas.set(paginaAsignaturas() - 1)">‹</button>
                <input
                  type="range"
                  class="paginacion-slider-input"
                  min="1"
                  [max]="totalPaginasAsignaturas()"
                  [value]="paginaAsignaturas()"
                  (input)="onSliderAsignaturas($event)"
                />
                <button type="button" class="btn-pag-nav" [disabled]="paginaAsignaturas() >= totalPaginasAsignaturas()" (click)="paginaAsignaturas.set(paginaAsignaturas() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ======================================================================
           TAB 3: MATRÍCULA ESCOLAR DESDE DIRECCIÓN
           ====================================================================== -->
      @if (tabActiva() === 'matricula') {
        <div class="card" style="max-width: 44rem; margin: 0 auto; border-top: 4px solid var(--primary); box-shadow: var(--shadow-md);">
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem;">
            <span style="font-size: 2rem;">🎓</span>
            <div>
              <h2 style="font-size: 1.35rem; margin: 0;">Matricular Estudiante en Dirección</h2>
              <small style="color: var(--text-muted);">Asigna el grado escolar oficial, genera el token QR y la clave dinámica</small>
            </div>
          </div>

          <form (ngSubmit)="matricularEstudiante()" style="display: grid; gap: 1rem; margin-top: 1rem;">
            <label style="font-weight: 600; font-size: 0.88rem;">
              Nombre y Apellidos Completos
              <input [(ngModel)]="matrNombre" name="matrNombre" required placeholder="Ej. Valentina Morales Gómez" style="width: 100%; margin-top: 0.35rem;" />
            </label>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <label style="font-weight: 600; font-size: 0.88rem;">
                Documento de Identidad (Numérico)
                <input [(ngModel)]="matrDocumento" name="matrDocumento" inputmode="numeric" required placeholder="Ej. 1098452310" style="width: 100%; margin-top: 0.35rem;" />
              </label>

              <label style="font-weight: 600; font-size: 0.88rem;">
                Grado Escolar Asignado
                <select [(ngModel)]="matrGrupoId" name="matrGrupoId" required style="width: 100%; margin-top: 0.35rem;">
                  <option [ngValue]="0">Selecciona el grado...</option>
                  @for (g of catalogoGrupos(); track g.id) {
                    <option [ngValue]="g.id">{{ g.nombre }}</option>
                  }
                </select>
              </label>
            </div>

            <label style="font-weight: 600; font-size: 0.88rem;">
              Clave Provisional (Opcional)
              <input [(ngModel)]="matrPassword" name="matrPassword" placeholder="Dejar en blanco para generar clave dinámica automática" style="width: 100%; margin-top: 0.35rem;" />
              <small style="font-weight: normal; color: var(--text-muted); display: block; margin-top: 0.25rem;">
                Si se deja vacía, el sistema genera automáticamente una clave segura para su primer inicio de sesión.
              </small>
            </label>

            <div style="display: flex; gap: 0.65rem; justify-content: flex-end; margin-top: 0.75rem;">
              <button type="submit" class="btn-principal" [disabled]="matriculando()" style="padding: 0.75rem 1.5rem;">
                {{ matriculando() ? 'Matriculando…' : '✔ Matricular y Generar Credenciales' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- ======================================================================
           TAB 4: GESTIÓN DE HORARIOS DE CLASES POR GRADO Y MATERIA
           ====================================================================== -->
      @if (tabActiva() === 'horarios') {
        <div class="card" style="margin-bottom: 1.25rem; background: var(--bg-surface); border-left: 4px solid var(--primary); padding: 1rem 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.4rem;">📅</span>
            <div>
              <strong style="font-size: 0.95rem; color: var(--text-primary);">Competencia Directiva: Planificación y Programación Horaria</strong>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
                Teniendo en cuenta los cursos y las materias que se ven, Dirección programa las franjas horarias semanales con validación inteligente de choques entre docentes y grados.
              </p>
            </div>
          </div>
        </div>

        <!-- Barra de Selección de Curso para el Horario -->
        <div class="card card-glass" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem; border: 1px solid var(--border);">
          <div class="entre" style="gap: 1rem; flex-wrap: wrap; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
              <span style="font-size: 1.25rem;">🏫</span>
              <strong style="font-size: 0.92rem; color: var(--text-primary);">Seleccionar Grado Escolar:</strong>
              <select [(ngModel)]="horarioGrupoId" (ngModelChange)="cambiarGrupoHorario($event)" style="padding: 0.4rem 0.85rem; border-radius: var(--radius-pill); font-weight: 700; border: 1px solid var(--border); max-width: 100%;">
                @for (g of catalogoGrupos(); track g.id) {
                  <option [ngValue]="g.id">Grado {{ g.nombre }}</option>
                }
              </select>
              <span class="badge badge-azul" style="font-size: 0.78rem;">
                {{ materiasDelCurso().length }} materias vinculadas al curso
              </span>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn-principal btn-sm" (click)="mostrarFormHorario.set(!mostrarFormHorario())">
                {{ mostrarFormHorario() ? '✕ Cancelar' : '➕ Programar Clase en Horario' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Formulario para Crear / Programar Bloque de Horario -->
        @if (mostrarFormHorario()) {
          <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--primary); padding: 1.5rem;">
            <h3 style="margin-top: 0; margin-bottom: 0.35rem; font-size: 1.15rem;">
              ➕ Programar Nuevo Bloque de Horario para Grado {{ nombreGrupoSeleccionado() }}
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Las materias disponibles corresponden a las asignadas curricularmente a este curso con su respectivo docente titular.
            </p>

            <form (ngSubmit)="guardarHorario()">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Materia que se ve en el Curso *
                  <select [(ngModel)]="nuevoHorarioMateriaId" name="nuevoHorarioMateriaId" required style="width: 100%; margin-top: 0.35rem; max-width: 100%; text-overflow: ellipsis;" (ngModelChange)="alSeleccionarMateria($event)">
                    <option [ngValue]="0">Selecciona materia del curso...</option>
                    @for (m of materiasDelCurso(); track m.materiaId) {
                      <option [ngValue]="m.materiaId">{{ m.materiaNombre }} (Prof: {{ m.profesorNombre }})</option>
                    }
                  </select>
                </label>

                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Día de la Semana *
                  <select [(ngModel)]="nuevoHorarioDia" name="nuevoHorarioDia" required style="width: 100%; margin-top: 0.35rem; max-width: 100%;">
                    <option [ngValue]="1">Lunes</option>
                    <option [ngValue]="2">Martes</option>
                    <option [ngValue]="3">Miércoles</option>
                    <option [ngValue]="4">Jueves</option>
                    <option [ngValue]="5">Viernes</option>
                    <option [ngValue]="6">Sábado</option>
                  </select>
                </label>

                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Franja Horaria Sugerida
                  <select [(ngModel)]="franjaPredefinida" name="franjaPredefinida" (ngModelChange)="aplicarFranja($event)" style="width: 100%; margin-top: 0.35rem; max-width: 100%;">
                    <option value="">Personalizada...</option>
                    <option value="07:00-08:30">Bloque 1: 07:00 - 08:30</option>
                    <option value="08:30-10:00">Bloque 2: 08:30 - 10:00</option>
                    <option value="10:30-12:00">Bloque 3: 10:30 - 12:00</option>
                    <option value="12:30-14:00">Bloque 4: 12:30 - 14:00</option>
                    <option value="14:00-15:30">Bloque 5: 14:00 - 15:30</option>
                  </select>
                </label>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Hora de Inicio (HH:mm) *
                  <input type="time" [(ngModel)]="nuevoHorarioHoraInicio" name="nuevoHorarioHoraInicio" required style="width: 100%; margin-top: 0.35rem; max-width: 100%;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Hora de Fin (HH:mm) *
                  <input type="time" [(ngModel)]="nuevoHorarioHoraFin" name="nuevoHorarioHoraFin" required style="width: 100%; margin-top: 0.35rem; max-width: 100%;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Aula / Salón / Espacio
                  <input type="text" [(ngModel)]="nuevoHorarioAula" name="nuevoHorarioAula" placeholder="Ej. Aula 101, Lab Química" style="width: 100%; margin-top: 0.35rem; max-width: 100%;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem; min-width: 0;">
                  Notas / Observación
                  <input type="text" [(ngModel)]="nuevoHorarioNotas" name="nuevoHorarioNotas" placeholder="Ej. Traer bata blanca" style="width: 100%; margin-top: 0.35rem; max-width: 100%;" />
                </label>
              </div>

              <div style="display: flex; gap: 0.65rem; justify-content: flex-end; flex-wrap: wrap;">
                <button type="button" class="btn-secundario" (click)="mostrarFormHorario.set(false)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardandoHorario()">
                  {{ guardandoHorario() ? 'Guardando…' : '✔ Guardar Bloque en Horario' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Grilla Semanal Visual del Horario en Dirección -->
        <div class="card card-glass" style="padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border);">
          <div class="entre" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 1.2rem;">🗓️</span>
              <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">
                Distribución Semanal: Grado {{ nombreGrupoSeleccionado() }}
              </h3>
              <span class="badge badge-azul" style="font-size: 0.78rem;">{{ horarios().length }} bloques activos</span>
            </div>
            <span class="badge badge-verde" style="font-size: 0.82rem; font-weight: 700;">{{ totalHorasCurso() }} Horas Académicas</span>
          </div>

          <!-- Matriz Semanal con Scroll Horizontal Protegido -->
          <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 0.5rem;">
            <div style="display: grid; grid-template-columns: repeat(5, minmax(210px, 1fr)); gap: 0.85rem; align-items: start; min-width: 1050px;">
              @for (dia of diasSemana; track dia.num) {
                <div style="background: var(--bg-surface-solid); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; min-width: 0; box-shadow: var(--shadow-sm);">
                  <div style="background: var(--bg-surface); padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 0.9rem; color: var(--text-primary);">{{ dia.nombre }}</strong>
                    <span class="badge badge-azul" style="font-size: 0.7rem; font-weight: 700;">{{ clasesDiaDirector(dia.num).length }}</span>
                  </div>

                  <div style="padding: 0.65rem; display: flex; flex-direction: column; gap: 0.6rem;">
                    @for (c of clasesDiaDirector(dia.num); track c.id) {
                      <div
                        style="background: var(--bg-surface); border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: var(--radius-sm); padding: 0.65rem; min-width: 0; overflow: hidden;"
                        [style.border-left-color]="colorMateria(c.materiaNombre)"
                      >
                        <div class="entre" style="margin-bottom: 0.25rem; font-size: 0.75rem; font-family: monospace; gap: 0.35rem; align-items: center;">
                          <span class="badge" style="font-size: 0.72rem; padding: 0.15rem 0.4rem; white-space: nowrap;">🕒 {{ c.horaInicio }} - {{ c.horaFin }}</span>
                          <button
                            type="button"
                            (click)="eliminarHorario(c.id)"
                            style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); cursor: pointer; color: var(--grade-bajo); font-size: 0.72rem; font-weight: bold; padding: 0.15rem 0.4rem; line-height: 1;"
                            title="Eliminar este bloque del horario"
                          >
                            ✕ Borrar
                          </button>
                        </div>
                        <strong style="display: block; font-size: 0.88rem; color: var(--text-primary); margin: 0.2rem 0; word-break: break-word; overflow-wrap: break-word; line-height: 1.35;">{{ c.materiaNombre }}</strong>
                        <span style="font-size: 0.78rem; color: var(--text-secondary); display: block; word-break: break-word; overflow-wrap: break-word; line-height: 1.3;">👨‍🏫 {{ c.profesorNombre }}</span>
                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.3rem;">
                          <span style="font-size: 0.7rem; color: var(--text-primary); background: var(--bg-hover); padding: 0.1rem 0.4rem; border-radius: var(--radius-sm); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis;">🏫 {{ c.aula || 'Aula 101' }}</span>
                          @if (c.notas) {
                            <span style="font-size: 0.7rem; color: var(--text-muted); font-style: italic; word-break: break-word;" [title]="c.notas">📌 {{ c.notas }}</span>
                          }
                        </div>
                      </div>
                    } @empty {
                      <span style="font-size: 0.75rem; color: var(--text-muted); text-align: center; display: block; padding: 1.5rem 0;">Sin clases programadas</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `
})
export class DirectorComponent implements OnInit {
  tabActiva = signal<'docentes' | 'asignaturas' | 'matricula' | 'horarios'>('docentes');

  aviso = signal('');
  error = signal('');

  // Planta Docente
  docentes = signal<Array<{
    id: number;
    nombre: string;
    usuario: string;
    cedula: string;
    activo: boolean;
    materias: Array<{ id: number; nombre: string; grupos: string[] }>;
    grupos: Array<{ id: number; nombre: string }>;
    totalMaterias: number;
    totalGrupos: number;
  }>>([]);
  busquedaDocentes = '';
  paginaDocentes = signal(1);
  elementosPorPagina = signal(8);

  // Asignaturas & Cursos
  asignaturas = signal<Array<{
    id: number;
    nombre: string;
    profesorId: number;
    profesorNombre: string;
    profesorCedula: string;
    grupos: Array<{ grupoId: number; grupoNombre: string }>;
  }>>([]);
  busquedaAsignaturas = '';
  paginaAsignaturas = signal(1);
  mostrarFormAsignatura = signal(false);
  guardandoAsignatura = signal(false);
  nuevaAsignaturaNombre = '';
  nuevoProfesorId = 0;
  nuevoGrupoId = 0;

  // Catálogos
  catalogoGrupos = signal<Array<{ id: number; nombre: string; estudiantesCount: number }>>([]);
  catalogoMaterias = signal<string[]>([]);

  // Matrícula de Estudiante
  matrNombre = '';
  matrDocumento = '';
  matrGrupoId = 0;
  matrPassword = '';
  matriculando = signal(false);

  // Modal Clave Dinámica
  modalClave = signal<{ nombre: string; documento: string; grupo: string; clave: string } | null>(null);
  copiado = signal(false);

  // Horarios de Clases
  horarios = signal<HorarioClaseItem[]>([]);
  horarioGrupoId = 0;
  materiasDelCurso = signal<Array<{
    materiaId: number;
    materiaNombre: string;
    profesorId: number;
    profesorNombre: string;
    profesorCedula: string;
  }>>([]);
  mostrarFormHorario = signal(false);
  guardandoHorario = signal(false);

  // Campos Formulario Horario
  nuevoHorarioMateriaId = 0;
  nuevoHorarioProfesorId = 0;
  nuevoHorarioDia = 1;
  nuevoHorarioHoraInicio = '07:00';
  nuevoHorarioHoraFin = '08:30';
  nuevoHorarioAula = 'Aula 101';
  nuevoHorarioNotas = '';
  franjaPredefinida = '07:00-08:30';

  diasSemana = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miércoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarDocentes();
    this.cargarAsignaturas();
    this.cargarCatalogo();
  }

  cargarDocentes(): void {
    this.api.directorDocentes().subscribe({
      next: (data) => this.docentes.set(data),
      error: (e) => this.error.set(mensajeError(e))
    });
  }

  cargarAsignaturas(): void {
    this.api.directorAsignaturas().subscribe({
      next: (data) => this.asignaturas.set(data),
      error: (e) => this.error.set(mensajeError(e))
    });
  }

  cargarCatalogo(): void {
    this.api.catalogoAcademicoDirector().subscribe({
      next: (data) => {
        const grps = data.grupos || [];
        this.catalogoGrupos.set(grps);
        this.catalogoMaterias.set(data.materiasSugeridas || []);
        if (grps.length > 0 && !this.horarioGrupoId) {
          this.horarioGrupoId = grps[0].id;
          this.cambiarGrupoHorario(this.horarioGrupoId);
        }
      },
      error: () => {}
    });
  }

  // Filtrado y paginación docentes
  docentesFiltrados = computed(() => {
    let list = this.docentes();
    const q = this.busquedaDocentes.trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.nombre.toLowerCase().includes(q) ||
        (d.cedula && d.cedula.toLowerCase().includes(q)) ||
        (d.usuario && d.usuario.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPaginasDocentes = computed(() => {
    return Math.max(1, Math.ceil(this.docentesFiltrados().length / this.elementosPorPagina()));
  });

  docentesPaginados = computed(() => {
    const list = this.docentesFiltrados();
    const p = Math.min(this.paginaDocentes(), this.totalPaginasDocentes());
    const inicio = (p - 1) * this.elementosPorPagina();
    return list.slice(inicio, inicio + this.elementosPorPagina());
  });

  onSliderDocentes(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.paginaDocentes.set(val);
  }

  // Filtrado y paginación asignaturas
  asignaturasFiltradas = computed(() => {
    let list = this.asignaturas();
    const q = this.busquedaAsignaturas.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        (a.profesorNombre && a.profesorNombre.toLowerCase().includes(q)) ||
        (a.profesorCedula && a.profesorCedula.toLowerCase().includes(q)) ||
        a.grupos.some(g => g.grupoNombre.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPaginasAsignaturas = computed(() => {
    return Math.max(1, Math.ceil(this.asignaturasFiltradas().length / this.elementosPorPagina()));
  });

  asignaturasPaginadas = computed(() => {
    const list = this.asignaturasFiltradas();
    const p = Math.min(this.paginaAsignaturas(), this.totalPaginasAsignaturas());
    const inicio = (p - 1) * this.elementosPorPagina();
    return list.slice(inicio, inicio + this.elementosPorPagina());
  });

  onSliderAsignaturas(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.paginaAsignaturas.set(val);
  }

  // Guardar y Amarrar Asignatura
  guardarAsignatura(): void {
    this.aviso.set('');
    this.error.set('');
    if (!this.nuevaAsignaturaNombre.trim() || !this.nuevoProfesorId || !this.nuevoGrupoId) {
      this.error.set('Completa el nombre de la materia, docente titular y grado escolar.');
      return;
    }

    this.guardandoAsignatura.set(true);
    this.api.crearYAmarrarAsignatura({
      nombre: this.nuevaAsignaturaNombre.trim(),
      profesorId: this.nuevoProfesorId,
      grupoId: this.nuevoGrupoId
    }).subscribe({
      next: (res) => {
        this.guardandoAsignatura.set(false);
        this.mostrarFormAsignatura.set(false);
        this.nuevaAsignaturaNombre = '';
        this.nuevoProfesorId = 0;
        this.nuevoGrupoId = 0;
        this.aviso.set(res.mensaje);
        this.cargarAsignaturas();
        this.cargarDocentes();
        setTimeout(() => this.aviso.set(''), 5000);
      },
      error: (e) => {
        this.guardandoAsignatura.set(false);
        this.error.set(mensajeError(e));
      }
    });
  }

  // Matricular Estudiante
  matricularEstudiante(): void {
    this.aviso.set('');
    this.error.set('');
    if (!this.matrNombre.trim() || !this.matrDocumento.trim() || !this.matrGrupoId) {
      this.error.set('Por favor completa el nombre, documento y grado escolar del estudiante.');
      return;
    }

    this.matriculando.set(true);
    this.api.matricularEstudianteDirector({
      nombre: this.matrNombre.trim(),
      documento: this.matrDocumento.trim(),
      grupoId: this.matrGrupoId,
      password: this.matrPassword.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.matriculando.set(false);
        this.matrNombre = '';
        this.matrDocumento = '';
        this.matrGrupoId = 0;
        this.matrPassword = '';
        this.aviso.set(res.mensaje);
        this.modalClave.set({
          nombre: res.nombre,
          documento: res.documento,
          grupo: res.grupo,
          clave: res.claveAsignada
        });
        this.cargarCatalogo();
      },
      error: (e) => {
        this.matriculando.set(false);
        this.error.set(mensajeError(e));
      }
    });
  }

  // =========================================================================
  // GESTIÓN DE HORARIOS DE CLASES
  // =========================================================================
  nombreGrupoSeleccionado = computed(() => {
    const g = this.catalogoGrupos().find(x => x.id === this.horarioGrupoId);
    return g ? g.nombre : '';
  });

  totalHorasCurso = computed(() => {
    return this.horarios().length * 1.5; // Estimado promedio en bloques
  });

  cambiarGrupoHorario(grupoId: number): void {
    this.horarioGrupoId = grupoId;
    this.cargarMateriasDelCurso(grupoId);
    this.cargarHorariosDelCurso(grupoId);
  }

  cargarMateriasDelCurso(grupoId: number): void {
    this.api.directorMateriasPorCurso(grupoId).subscribe({
      next: (res) => this.materiasDelCurso.set(res.materias || []),
      error: () => {}
    });
  }

  cargarHorariosDelCurso(grupoId: number): void {
    this.api.directorListarHorarios(grupoId).subscribe({
      next: (res) => this.horarios.set(res),
      error: (err) => this.error.set(mensajeError(err))
    });
  }

  clasesDiaDirector(diaNum: number): HorarioClaseItem[] {
    return this.horarios().filter(c => c.diaSemana === diaNum);
  }

  alSeleccionarMateria(materiaId: number): void {
    const m = this.materiasDelCurso().find(x => x.materiaId === materiaId);
    if (m) {
      this.nuevoHorarioProfesorId = m.profesorId;
    }
  }

  aplicarFranja(franja: string): void {
    if (!franja) return;
    const parts = franja.split('-');
    if (parts.length === 2) {
      this.nuevoHorarioHoraInicio = parts[0];
      this.nuevoHorarioHoraFin = parts[1];
    }
  }

  guardarHorario(): void {
    this.aviso.set('');
    this.error.set('');

    if (!this.horarioGrupoId || !this.nuevoHorarioMateriaId) {
      this.error.set('Selecciona la materia que se dicta en este grado.');
      return;
    }

    if (!this.nuevoHorarioHoraInicio || !this.nuevoHorarioHoraFin) {
      this.error.set('Indica la hora de inicio y fin.');
      return;
    }

    this.guardandoHorario.set(true);
    this.api.directorCrearHorario({
      grupoId: this.horarioGrupoId,
      materiaId: this.nuevoHorarioMateriaId,
      profesorId: this.nuevoHorarioProfesorId,
      diaSemana: this.nuevoHorarioDia,
      horaInicio: this.nuevoHorarioHoraInicio,
      horaFin: this.nuevoHorarioHoraFin,
      aula: this.nuevoHorarioAula.trim() || undefined,
      notas: this.nuevoHorarioNotas.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.guardandoHorario.set(false);
        this.mostrarFormHorario.set(false);
        this.aviso.set(res.mensaje);
        this.nuevoHorarioNotas = '';
        this.cargarHorariosDelCurso(this.horarioGrupoId);
        setTimeout(() => this.aviso.set(''), 5000);
      },
      error: (err) => {
        this.guardandoHorario.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  eliminarHorario(id: number): void {
    if (!confirm('¿Seguro que deseas eliminar esta clase del horario?')) return;
    this.api.directorEliminarHorario(id).subscribe({
      next: (res) => {
        this.aviso.set(res.mensaje);
        this.cargarHorariosDelCurso(this.horarioGrupoId);
        setTimeout(() => this.aviso.set(''), 4000);
      },
      error: (err) => this.error.set(mensajeError(err))
    });
  }

  copiarClave(clave: string): void {
    if (!clave) return;
    navigator.clipboard.writeText(clave).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  colorMateria(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    if (n.includes('mate') || n.includes('álgebra') || n.includes('geom') || n.includes('cálculo')) return '#2563eb';
    if (n.includes('física')) return '#0284c7';
    if (n.includes('química') || n.includes('biol') || n.includes('cien') || n.includes('natur')) return '#059669';
    if (n.includes('leng') || n.includes('castell') || n.includes('espa') || n.includes('liter')) return '#7c3aed';
    if (n.includes('inglés') || n.includes('idioma') || n.includes('biling')) return '#0891b2';
    if (n.includes('tecno') || n.includes('infor') || n.includes('sist') || n.includes('robót')) return '#4f46e5';
    if (n.includes('socia') || n.includes('histo') || n.includes('geogr') || n.includes('democr')) return '#d97706';
    if (n.includes('filo') || n.includes('ética') || n.includes('relig') || n.includes('convi')) return '#0d9488';
    if (n.includes('ed') && (n.includes('fís') || n.includes('depor'))) return '#e11d48';
    if (n.includes('art') || n.includes('músic') || n.includes('danz') || n.includes('teatr')) return '#c026d3';
    return '#0d9488';
  }
}
