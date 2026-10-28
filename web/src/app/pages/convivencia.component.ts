import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Estudiante, ObservacionConvivencia } from '../core/models';
import { mensajeError } from '../core/errores';

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
          <button type="button" class="btn-principal" (click)="mostrarFormulario.set(!mostrarFormulario())" style="font-size: 0.95rem; padding: 0.65rem 1.25rem;">
            {{ mostrarFormulario() ? '✕ Cerrar Formulario' : '➕ Registrar Anotación' }}
          </button>
        }
      </div>

      @if (error()) { <p class="aviso error">{{ error() }}</p> }
      @if (exito()) { <p class="aviso" style="background: var(--grade-superior-bg); color: var(--grade-superior); border-color: var(--grade-superior);">{{ exito() }}</p> }

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
              <label style="font-weight: 600; font-size: 0.88rem;">
                Estudiante Objeto de la Anotación:
                <select [(ngModel)]="nuevoEstudianteId" name="nuevoEstudianteId" required style="width: 100%; margin-top: 0.35rem;">
                  <option [ngValue]="0">Elige un estudiante de tu lista...</option>
                  @for (est of listaEstudiantes(); track est.id) {
                    <option [ngValue]="est.id">{{ est.nombre }} · (Grupo {{ est.grupo || 'Sin grupo' }} - Doc. {{ est.documento }})</option>
                  }
                </select>
              </label>

              <label style="font-weight: 600; font-size: 0.88rem;">
                Clasificación de Convivencia (Ley 1620):
                <select [(ngModel)]="nuevoTipo" name="nuevoTipo" required style="width: 100%; margin-top: 0.35rem;">
                  <option value="Felicitacion">🌟 Mérito / Reconocimiento Formativo</option>
                  <option value="Atencion">⚠️ Situación Tipo I · Llamado de Atención Leve</option>
                  <option value="FaltaLeve">🟠 Situación Tipo II · Falta Disciplinaria Grave</option>
                  <option value="FaltaGrave">🔴 Situación Tipo III · Falta Gravísima</option>
                </select>
              </label>

              <label style="font-weight: 600; font-size: 0.88rem;">
                Fecha del Suceso:
                <input type="date" [(ngModel)]="nuevaFecha" name="nuevaFecha" required style="width: 100%; margin-top: 0.35rem;" />
              </label>
            </div>

            <label style="font-weight: 600; font-size: 0.88rem;">
              Título o Asunto del Registro:
              <input [(ngModel)]="nuevoTitulo" name="nuevoTitulo" required placeholder="Ej: Participación distinguida en Feria de Ciencias / Desatención reiterada en clase" style="width: 100%; margin-top: 0.35rem;" />
            </label>

            <label style="font-weight: 600; font-size: 0.88rem;">
              Descripción Objetiva de los Hechos:
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
      }

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
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); font-size: 0.8rem;">
                    📅 {{ obs.fecha }}
                  </span>
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
    </section>
  `
})
export class ConvivenciaComponent implements OnInit {
  observaciones = signal<ObservacionConvivencia[]>([]);
  listaEstudiantes = signal<Estudiante[]>([]);
  mostrarFormulario = signal(false);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  exito = signal('');

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
  nuevoEstudianteId = 0;
  nuevoTipo = 'Atencion';
  nuevoTitulo = '';
  nuevaDescripcion = '';
  nuevoCompromiso = '';
  nuevaFecha = new Date().toISOString().substring(0, 10);

  esDocenteODirector = false;

  constructor(private api: ApiService, private auth: AuthService) {
    const rol = auth.rol();
    this.esDocenteODirector = rol === 'Profesor' || rol === 'Director' || rol === 'Admin';
  }

  ngOnInit(): void {
    this.cargar();
    if (this.esDocenteODirector) {
      this.api.estudiantes().subscribe({
        next: (res) => this.listaEstudiantes.set(res),
        error: () => {}
      });
    }
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

  guardar(): void {
    if (this.nuevoEstudianteId === 0) {
      this.error.set('Selecciona un estudiante.');
      return;
    }
    if (!this.nuevoTitulo.trim() || !this.nuevaDescripcion.trim()) {
      this.error.set('Escribe el título y la descripción.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.api.crearConvivencia({
      estudianteId: this.nuevoEstudianteId,
      tipo: this.nuevoTipo,
      titulo: this.nuevoTitulo,
      descripcion: this.nuevaDescripcion,
      compromiso: this.nuevoCompromiso,
      fecha: this.nuevaFecha
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set('Anotación registrada en el observador escolar con éxito.');
        this.mostrarFormulario.set(false);
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
