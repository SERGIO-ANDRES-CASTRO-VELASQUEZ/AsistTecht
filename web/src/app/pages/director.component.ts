import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-director',
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
            Supervisión de la planta docente creada por Administración, creación y amarre curricular de asignaturas por docente y grado escolar, y matrícula oficial de estudiantes.
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
                  <th>Cédula de Ciudadanía (Acceso)</th>
                  <th>Estado</th>
                  <th>Asignaturas Asignadas</th>
                  <th style="text-align: right; padding-right: 1.5rem;">Carga Académica</th>
                </tr>
              </thead>
              <tbody>
                @for (d of docentesPaginados(); track d.id) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circulo" style="width: 34px; height: 34px; font-size: 0.85rem; background: var(--accent-purple);">
                          {{ d.nombre.charAt(0) }}
                        </div>
                        <div>
                          <strong>{{ d.nombre }}</strong>
                          <span style="display: block; font-size: 0.72rem; color: var(--text-muted);">Docente Titular GIR</span>
                        </div>
                      </div>
                    </td>

                    <td style="font-family: monospace; font-size: 0.92rem; font-weight: 600; color: var(--primary);">
                      {{ d.cedula || d.usuario }}
                    </td>

                    <td>
                      <span class="badge" [class]="d.activo ? 'badge-verde' : 'badge-rojo'">
                        {{ d.activo ? '🟢 Activo' : '🔴 Inactivo' }}
                      </span>
                    </td>

                    <td>
                      @if (d.materias && d.materias.length > 0) {
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                          @for (m of d.materias; track m.id) {
                            <span class="chip-grupo" style="font-size: 0.75rem;">
                              📚 {{ m.nombre }}
                              @if (m.grupos && m.grupos.length > 0) {
                                ({{ m.grupos.join(', ') }})
                              }
                            </span>
                          }
                        </div>
                      } @else {
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Sin materias amarradas aún</span>
                      }
                    </td>

                    <td style="text-align: right; padding-right: 1.5rem; font-size: 0.85rem;">
                      <strong>{{ d.totalMaterias || d.materias.length }}</strong> materias
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
           TAB 2: GESTIÓN DE ASIGNATURAS Y CURSOS (CREAR Y AMARRAR)
           ====================================================================== -->
      @if (tabActiva() === 'asignaturas') {
        <div class="entre" style="margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; margin: 0;">Malla Curricular y Amarre de Asignaturas</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0;">
              Crea las asignaturas institucionales y amárralas al docente titular y al grado escolar correspondiente.
            </p>
          </div>

          <button type="button" class="btn-principal" (click)="mostrarFormAsignatura.set(!mostrarFormAsignatura())">
            {{ mostrarFormAsignatura() ? 'Cerrar Formulario' : '+ Crear y Amarrar Asignatura' }}
          </button>
        </div>

        <!-- Formulario Crear y Amarrar Asignatura -->
        @if (mostrarFormAsignatura()) {
          <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--primary); box-shadow: var(--shadow-md);">
            <h3>Nueva Asignatura / Amarre a Curso</h3>
            <p class="lead">Selecciona el nombre de la materia, el docente que la impartirá y el grado escolar.</p>

            <form (ngSubmit)="guardarAsignatura()" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem; margin-top: 1rem;">
              <label>
                Nombre de la Asignatura
                <input [(ngModel)]="nuevaAsignaturaNombre" name="nuevaAsignaturaNombre" required placeholder="Ej. Matemáticas, Biología, Inglés..." list="materiasSugeridasList" />
                <datalist id="materiasSugeridasList">
                  @for (m of catalogoMaterias(); track m) {
                    <option [value]="m"></option>
                  }
                </datalist>
              </label>

              <label>
                Docente Titular (Profesor)
                <select [(ngModel)]="nuevoProfesorId" name="nuevoProfesorId" required>
                  <option [ngValue]="0">Elige un docente titular...</option>
                  @for (p of docentes(); track p.id) {
                    <option [ngValue]="p.id">{{ p.nombre }} (C.C. {{ p.cedula || p.usuario }})</option>
                  }
                </select>
              </label>

              <label>
                Grado / Curso Escolar
                <select [(ngModel)]="nuevoGrupoId" name="nuevoGrupoId" required>
                  <option [ngValue]="0">Elige un grado o grupo...</option>
                  @for (g of catalogoGrupos(); track g.id) {
                    <option [ngValue]="g.id">{{ g.nombre }} ({{ g.estudiantesCount }} alumnos)</option>
                  }
                </select>
              </label>

              <div style="grid-column: 1 / -1; display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button type="submit" class="btn-principal" [disabled]="guardandoAsignatura()">
                  {{ guardandoAsignatura() ? 'Vinculando…' : '✔ Crear y Amarrar al Docente y Curso' }}
                </button>
                <button type="button" class="btn-secundario" (click)="mostrarFormAsignatura.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        }

        <!-- Buscador de Asignaturas -->
        <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1rem;">
          <div class="entre" style="gap: 1rem; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Asignaturas Curriculares Activas
            </span>
            <div style="min-width: 16rem;">
              <input
                type="text"
                [(ngModel)]="busquedaAsignaturas"
                placeholder="🔍 Buscar asignatura, docente o grado..."
                style="width: 100%;"
              />
            </div>
          </div>
        </div>

        <!-- Tabla de Asignaturas con Slider -->
        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>Docente Titular</th>
                  <th>Cédula Docente</th>
                  <th>Cursos / Grados Vinculados</th>
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
    </section>
  `
})
export class DirectorComponent implements OnInit {
  tabActiva = signal<'docentes' | 'asignaturas' | 'matricula'>('docentes');

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
        this.catalogoGrupos.set(data.grupos || []);
        this.catalogoMaterias.set(data.materiasSugeridas || []);
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

  copiarClave(clave: string): void {
    if (!clave) return;
    navigator.clipboard.writeText(clave).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }
}
