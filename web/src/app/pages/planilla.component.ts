import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Grupo, Materia, PlanillaAsistencia, PlanillaNotas } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-planilla',
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <section class="pagina">
      <!-- Hero Banner Institucional -->
      <div class="hero-banner-institucional no-print">
        <div class="hero-tag">
          <span class="pulsing-dot"></span>
          <span>Libro Digital de Calificaciones y Asistencia · MEN Dec. 1290</span>
        </div>
        <div class="entre" style="align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 1.85rem; margin-bottom: 0.35rem;">Planilla de Control Docente</h1>
            <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 44rem; margin: 0;">
              Registro cuantitativo y cualitativo en escala nacional (0.0 a 5.0). Los promedios, desempeños y alertas tempranas de deserción se calculan en tiempo real.
            </p>
          </div>

          <!-- Segmento Switcher: Notas vs Asistencia -->
          <div class="segmento-toggle">
            <button type="button" [class.activo]="vista() === 'notas'" (click)="vista.set('notas')">
              <span>📝</span> Calificaciones
            </button>
            <button type="button" [class.activo]="vista() === 'asistencia'" (click)="vista.set('asistencia')">
              <span>📅</span> Asistencia
            </button>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros y Selección de Asignatura / Grupo -->
      <div class="card no-print" style="padding: 1.15rem 1.4rem; margin-bottom: 1.25rem;">
        <form class="entre" (ngSubmit)="cargar()" style="gap: 1.25rem; flex-wrap: wrap;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; flex: 1;">
            <label style="min-width: 15rem; font-weight: 600; font-size: 0.88rem;">
              Asignatura Curricular
              <select [(ngModel)]="materiaId" name="materiaId" (ngModelChange)="onMateriaChange()" style="width: 100%; margin-top: 0.35rem;">
                <option [ngValue]="0">Selecciona una materia...</option>
                @for (materia of materias(); track materia.id) {
                  <option [ngValue]="materia.id">{{ materia.nombre }}</option>
                }
              </select>
            </label>

            <label style="min-width: 13rem; font-weight: 600; font-size: 0.88rem;">
              Grupo Escolar
              <select [(ngModel)]="grupoId" name="grupoId" (ngModelChange)="cargar()" style="width: 100%; margin-top: 0.35rem;">
                <option [ngValue]="0">Selecciona un grupo...</option>
                @for (grupo of gruposDeLaMateria(); track grupo.id) {
                  <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
                }
              </select>
            </label>

            <button class="btn-principal" type="submit" [disabled]="!materiaId || !grupoId">
              <span>📂</span> Cargar Planilla
            </button>
          </div>

          <!-- Búsqueda rápida por nombre o documento -->
          @if (hayDatosCargados()) {
            <div style="min-width: 15rem; display: flex; align-items: flex-end;">
              <input [(ngModel)]="busqueda" name="busqueda" placeholder="🔍 Buscar estudiante o ID..." style="width: 100%;" />
            </div>
          }
        </form>
      </div>

      @if (error()) { <p class="aviso error no-print">{{ error() }}</p> }

      <!-- Toast Feedback Flotante -->
      @if (toastMensaje()) {
        <div style="position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; background: var(--text-primary); color: var(--bg-surface-solid); padding: 0.75rem 1.25rem; border-radius: var(--radius-pill); box-shadow: var(--shadow-lg); font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; animation: pulse-green 0.3s ease;">
          <span>{{ toastMensaje() }}</span>
        </div>
      }

      <!-- VISTA 1: CALIFICACIONES (GRADEBOOK) -->
      @if (vista() === 'notas' && notas()) {
        <!-- KPIs y Métricas del Curso -->
        <div class="kpi-grid" style="margin-bottom: 1.25rem;">
          <div class="kpi-banner">
            <div class="kpi-icono">👥</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Total Alumnos</span>
              <strong class="kpi-numero">{{ notas()!.estudiantes.length }}</strong>
              <span class="kpi-desc">Matriculados en {{ nombreGrupo() }}</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">📈</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Promedio del Aula</span>
              <strong class="kpi-numero" [style.color]="promedioCurso() >= 3.0 ? 'var(--grade-superior)' : 'var(--grade-bajo)'">
                {{ promedioCurso() }}
              </strong>
              <span class="kpi-desc">{{ promedioCurso() >= 4.0 ? 'Desempeño Alto/Superior' : (promedioCurso() >= 3.0 ? 'Desempeño Básico Aceptable' : 'Riesgo Académico') }}</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-alto-bg); color: var(--grade-alto);">🏆</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Tasa de Aprobación</span>
              <strong class="kpi-numero" style="color: var(--grade-superior);">{{ tasaAprobacion() }}%</strong>
              <span class="kpi-desc">{{ estudiantesAprobando() }} de {{ notas()!.estudiantes.length }} estudiantes aprobando</span>
            </div>
          </div>

          <div class="kpi-banner alerta">
            <div class="kpi-icono" style="background: var(--grade-bajo-bg); color: var(--grade-bajo);">⚠️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">En Riesgo (< 3.0)</span>
              <strong class="kpi-numero" style="color: var(--grade-bajo);">{{ estudiantesEnRiesgo() }}</strong>
              <span class="kpi-desc">Requieren plan de mejoramiento</span>
            </div>
          </div>
        </div>

        <!-- Barra Visual de Distribución de Desempeño (Mini Chart Interactivo) -->
        <div class="distribucion-container no-print">
          <div class="distribucion-header">
            <strong>📊 Balance de Desempeño del Grupo (Decreto 1290)</strong>
            <span style="color: var(--text-muted); font-size: 0.8rem;">Distribución porcentual en tiempo real</span>
          </div>

          <div class="distribucion-barra">
            <div class="segmento-superior" [style.width.%]="porcentajeSuperior()" title="Superior (4.6 - 5.0): {{ porcentajeSuperior() }}%"></div>
            <div class="segmento-alto" [style.width.%]="porcentajeAlto()" title="Alto (4.0 - 4.5): {{ porcentajeAlto() }}%"></div>
            <div class="segmento-basico" [style.width.%]="porcentajeBasico()" title="Básico (3.0 - 3.9): {{ porcentajeBasico() }}%"></div>
            <div class="segmento-bajo" [style.width.%]="porcentajeBajo()" title="Bajo (1.0 - 2.9): {{ porcentajeBajo() }}%"></div>
          </div>

          <div class="distribucion-leyenda">
            <div class="leyenda-item">
              <span class="leyenda-dot" style="background: var(--grade-superior);"></span>
              <span>Superior (4.6 - 5.0): <strong>{{ conteoSuperior() }} ({{ porcentajeSuperior() }}%)</strong></span>
            </div>
            <div class="leyenda-item">
              <span class="leyenda-dot" style="background: var(--grade-alto);"></span>
              <span>Alto (4.0 - 4.5): <strong>{{ conteoAlto() }} ({{ porcentajeAlto() }}%)</strong></span>
            </div>
            <div class="leyenda-item">
              <span class="leyenda-dot" style="background: var(--grade-basico);"></span>
              <span>Básico (3.0 - 3.9): <strong>{{ conteoBasico() }} ({{ porcentajeBasico() }}%)</strong></span>
            </div>
            <div class="leyenda-item">
              <span class="leyenda-dot" style="background: var(--grade-bajo);"></span>
              <span>Bajo (1.0 - 2.9): <strong>{{ conteoBajo() }} ({{ porcentajeBajo() }}%)</strong></span>
            </div>
          </div>
        </div>

        <!-- Filtros Rápidos (Chips) y Botones de Exportación -->
        <div class="entre no-print" style="margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
          <!-- Chips de Filtro -->
          <div class="filtros-chips">
            <button type="button" class="filtro-chip" [class.activo]="filtroDesempeno() === 'todos'" (click)="filtroDesempeno.set('todos')">
              Todos <span class="filtro-count">{{ notas()!.estudiantes.length }}</span>
            </button>
            <button type="button" class="filtro-chip" [class.activo]="filtroDesempeno() === 'superior-alto'" (click)="filtroDesempeno.set('superior-alto')">
              🌟 Superior & Alto <span class="filtro-count">{{ conteoSuperior() + conteoAlto() }}</span>
            </button>
            <button type="button" class="filtro-chip" [class.activo]="filtroDesempeno() === 'basico'" (click)="filtroDesempeno.set('basico')">
              🟡 Básico <span class="filtro-count">{{ conteoBasico() }}</span>
            </button>
            <button type="button" class="filtro-chip" [class.activo]="filtroDesempeno() === 'riesgo'" (click)="filtroDesempeno.set('riesgo')">
              ⚠️ En Riesgo (< 3.0) <span class="filtro-count">{{ conteoBajo() }}</span>
            </button>
          </div>

          <!-- Botones de Acción de Planilla -->
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" class="btn-secundario" (click)="exportarCsv()" title="Descargar como archivo compatible con Excel">
              <span>📥</span> Exportar a Excel (CSV)
            </button>
            <button type="button" class="btn-secundario" (click)="imprimir()" title="Imprimir formato físico oficial">
              <span>🖨️</span> Imprimir Planilla
            </button>
          </div>
        </div>

        <!-- Formulario para agregar nueva columna de nota -->
        <div class="card no-print" style="padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; background: var(--bg-surface);">
          <form class="fila" (ngSubmit)="agregarColumna()" style="justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; flex-wrap: wrap;">
              <strong style="font-size: 0.88rem;">Nueva Evaluación:</strong>
              <input [(ngModel)]="columnaNueva" name="columnaNueva" placeholder="Ej: Taller 1, Quiz 2, Examen Parcial, Actitudinal..." style="max-width: 22rem; flex: 1;" required />
              <button class="btn-principal" type="submit" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                <span>+</span> Crear Columna
              </button>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Califica de 0.0 a 5.0 · Guarda automáticamente al salir de la celda</span>
          </form>
        </div>

        <!-- Indicador de desplazamiento en celulares -->
        <div class="scroll-hint-mobile">👉 Desliza horizontalmente con tu dedo para calificar y ver todas las notas</div>

        <!-- Tabla Interactiva de Calificaciones (Gradebook Matrix) -->
        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th class="col-estudiante">Estudiante / Documento</th>
                  @for (columna of notas()!.columnas; track columna.id) {
                    <th style="min-width: 6.5rem;">{{ columna.nombre }}</th>
                  }
                  <th style="background: var(--primary-light); color: var(--primary); min-width: 6.5rem;">Definitiva</th>
                  <th style="min-width: 7.5rem;">Desempeño</th>
                  <th class="no-print" style="min-width: 8rem;">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody>
                @for (estudiante of estudiantesPaginadosNotas(); track estudiante.id) {
                  <tr>
                    <!-- Estudiante Info con Avatar -->
                    <td class="col-estudiante">
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circulo" style="width: 32px; height: 32px; font-size: 0.85rem; flex-shrink: 0;">
                          {{ estudiante.nombre.charAt(0) }}
                        </div>
                        <div>
                          <strong style="display: block; font-size: 0.88rem;">{{ estudiante.nombre }}</strong>
                          <span style="font-size: 0.75rem; color: var(--text-muted);">Doc. {{ estudiante.documento }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Celdas de Notas Parciales -->
                    @for (columna of notas()!.columnas; track columna.id) {
                      <td>
                        <input class="nota-input" type="number" min="0" max="5" step="0.1"
                          [value]="valor(columna, estudiante.id)"
                          [style.color]="colorDeNota(valor(columna, estudiante.id))"
                          [style.font-weight]="valor(columna, estudiante.id) !== '' ? '800' : 'normal'"
                          (change)="guardarNota(columna.id, estudiante.id, $event)"
                          placeholder="—" />
                      </td>
                    }

                    <!-- Columna Promedio Definitivo en Tiempo Real -->
                    <td style="font-weight: 800; font-size: 1.1rem; background: var(--bg-hover);"
                      [style.color]="promedioEstudiante(estudiante.id) >= 3.0 ? 'var(--grade-superior)' : 'var(--grade-bajo)'">
                      {{ promedioEstudiante(estudiante.id) }}
                    </td>

                    <!-- Escala Cualitativa MEN -->
                    <td>
                      <span class="badge-nota" [class]="claseEscala(escalaEstudiante(estudiante.id))" style="font-size: 0.78rem;">
                        {{ escalaEstudiante(estudiante.id) }}
                      </span>
                    </td>

                    <!-- Acciones Rápidas (Observador Escolar) -->
                    <td class="no-print">
                      <div style="display: flex; gap: 0.35rem; justify-content: center;">
                        <a [routerLink]="['/profesor/convivencia']" [queryParams]="{ estudianteId: estudiante.id }" class="btn-accion-sm" title="Registrar anotación en el observador">
                          <span>⚖️</span> Observador
                        </a>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="notas()!.columnas.length + 4" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                      No se encontraron estudiantes para los filtros seleccionados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación con Slider para Calificaciones -->
          @if (estudiantesFiltradosNotas().length > 0) {
            <div class="paginacion-slider-control no-print">
              <span class="pag-info-tag">Página {{ paginaNotas() }} de {{ totalPaginasNotas() }} ({{ estudiantesFiltradosNotas().length }} estudiantes)</span>
              <div class="paginacion-slider-track">
                <button type="button" class="btn-pag-nav" [disabled]="paginaNotas() <= 1" (click)="paginaNotas.set(paginaNotas() - 1)">‹</button>
                <input
                  type="range"
                  class="paginacion-slider-input"
                  min="1"
                  [max]="totalPaginasNotas()"
                  [value]="paginaNotas()"
                  (input)="onSliderNotas($event)"
                />
                <button type="button" class="btn-pag-nav" [disabled]="paginaNotas() >= totalPaginasNotas()" (click)="paginaNotas.set(paginaNotas() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- VISTA 2: ASISTENCIA -->
      @if (vista() === 'asistencia' && asistencia()) {
        <!-- KPIs de Asistencia -->
        <div class="kpi-grid" style="margin-bottom: 1.25rem;">
          <div class="kpi-banner">
            <div class="kpi-icono">📅</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Sesiones Registradas</span>
              <strong class="kpi-numero">{{ asistencia()!.fechas.length }}</strong>
              <span class="kpi-desc">Clases impartidas en este periodo</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">✅</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Promedio Asistencia</span>
              <strong class="kpi-numero" style="color: var(--grade-superior);">{{ promedioAsistenciaCurso() }}%</strong>
              <span class="kpi-desc">Presencia promedio del grupo</span>
            </div>
          </div>

          <div class="kpi-banner alerta">
            <div class="kpi-icono" style="background: var(--grade-bajo-bg); color: var(--grade-bajo);">⚠️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Alumnos con > 2 Fallas</span>
              <strong class="kpi-numero" style="color: var(--grade-bajo);">{{ estudiantesConFallasCriticas() }}</strong>
              <span class="kpi-desc">En riesgo de pérdida por inasistencia</span>
            </div>
          </div>
        </div>

        <!-- Formulario para agregar fecha de clase -->
        <div class="card no-print" style="padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; background: var(--bg-surface);">
          <form class="fila" (ngSubmit)="agregarFecha()" style="justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; flex-wrap: wrap;">
              <strong style="font-size: 0.88rem;">Agregar Fecha de Sesión:</strong>
              <input [(ngModel)]="fechaNueva" name="fechaNueva" type="date" required style="max-width: 14rem;" />
              <button class="btn-principal" type="submit" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                <span>+</span> Registrar Fecha
              </button>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Haz clic en el botón de cada celda para alternar Presente / Ausente</span>
          </form>
        </div>

        <!-- Indicador de desplazamiento en celulares -->
        <div class="scroll-hint-mobile">👉 Desliza horizontalmente con tu dedo para ver todas las fechas de clase</div>

        <!-- Tabla Interactiva de Asistencia -->
        <div class="gradebook-wrapper">
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th class="col-estudiante">Estudiante / Documento</th>
                  @for (fecha of asistencia()!.fechas; track fecha.fecha) {
                    <th style="min-width: 5.5rem;">{{ fecha.fecha | slice:5:10 }}</th>
                  }
                  <th style="min-width: 6.5rem; background: var(--primary-light); color: var(--primary);">% Asistencia</th>
                  <th style="min-width: 5rem;">Fallas</th>
                  <th class="no-print" style="min-width: 6rem;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (estudiante of estudiantesPaginadosAsistencia(); track estudiante.id) {
                  <tr>
                    <td class="col-estudiante">
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circulo" style="width: 30px; height: 30px; font-size: 0.82rem; flex-shrink: 0;">
                          {{ estudiante.nombre.charAt(0) }}
                        </div>
                        <div>
                          <strong style="display: block; font-size: 0.88rem;">{{ estudiante.nombre }}</strong>
                          <span style="font-size: 0.75rem; color: var(--text-muted);">Doc. {{ estudiante.documento }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Celdas de Fecha con Toggle Interactivo -->
                    @for (fecha of asistencia()!.fechas; track fecha.fecha) {
                      <td>
                        <button type="button" class="btn-asistencia-pill"
                          [attr.data-presente]="presente(fecha, estudiante.id)"
                          (click)="alternar(fecha, estudiante.id)">
                          {{ presente(fecha, estudiante.id) ? '✔ Presente' : '✖ Ausente' }}
                        </button>
                      </td>
                    }

                    <!-- Porcentaje de Asistencia del Estudiante -->
                    <td style="font-weight: 800; background: var(--bg-hover);">
                      <strong style="color: var(--primary);">{{ porcentajeAsistencia(estudiante.id) }}%</strong>
                    </td>

                    <!-- Fallas Acumuladas -->
                    <td>
                      <span class="badge" [class]="fallasEstudiante(estudiante.id) > 2 ? 'badge-rojo' : 'badge-verde'">
                        {{ fallasEstudiante(estudiante.id) }}
                      </span>
                    </td>

                    <!-- Acciones -->
                    <td class="no-print">
                      <a [routerLink]="['/profesor/convivencia']" [queryParams]="{ estudianteId: estudiante.id }" class="btn-accion-sm">
                        <span>⚖️</span> Anotar
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="asistencia()!.fechas.length + 4" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                      No se encontraron estudiantes en este grupo.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación con Slider para Asistencia -->
          @if (estudiantesFiltradosAsistencia().length > 0) {
            <div class="paginacion-slider-control no-print">
              <span class="pag-info-tag">Página {{ paginaAsistencia() }} de {{ totalPaginasAsistencia() }} ({{ estudiantesFiltradosAsistencia().length }} estudiantes)</span>
              <div class="paginacion-slider-track">
                <button type="button" class="btn-pag-nav" [disabled]="paginaAsistencia() <= 1" (click)="paginaAsistencia.set(paginaAsistencia() - 1)">‹</button>
                <input
                  type="range"
                  class="paginacion-slider-input"
                  min="1"
                  [max]="totalPaginasAsistencia()"
                  [value]="paginaAsistencia()"
                  (input)="onSliderAsistencia($event)"
                />
                <button type="button" class="btn-pag-nav" [disabled]="paginaAsistencia() >= totalPaginasAsistencia()" (click)="paginaAsistencia.set(paginaAsistencia() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }
    </section>
  `
})
export class PlanillaComponent implements OnInit {
  materiaId = 0;
  grupoId = 0;
  vista = signal<'notas' | 'asistencia'>('notas');
  filtroDesempeno = signal<'todos' | 'superior-alto' | 'basico' | 'riesgo'>('todos');
  materias = signal<Materia[]>([]);
  grupos = signal<Grupo[]>([]);
  asistencia = signal<PlanillaAsistencia | null>(null);
  notas = signal<PlanillaNotas | null>(null);
  error = signal('');
  toastMensaje = signal('');
  fechaNueva = new Date().toISOString().substring(0, 10);
  columnaNueva = '';
  busqueda = '';

  paginaNotas = signal(1);
  paginaAsistencia = signal(1);
  elementosPorPagina = signal(10);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.materias().subscribe((m) => {
      this.materias.set(m);
      if (m.length > 0) {
        this.materiaId = m[0].id;
        this.cargarGrupos();
      }
    });
  }

  mostrarToast(mensaje: string): void {
    this.toastMensaje.set(mensaje);
    setTimeout(() => this.toastMensaje.set(''), 2500);
  }

  cargarGrupos(): void {
    this.api.grupos().subscribe((g) => {
      this.grupos.set(g);
      const filtrados = this.gruposDeLaMateria();
      if (filtrados.length > 0) {
        this.grupoId = filtrados[0].id;
        this.cargar();
      }
    });
  }

  onMateriaChange(): void {
    const filtrados = this.gruposDeLaMateria();
    this.grupoId = filtrados.length > 0 ? filtrados[0].id : 0;
    if (this.grupoId > 0) this.cargar();
  }

  gruposDeLaMateria(): Grupo[] {
    const materia = this.materias().find((m) => m.id === this.materiaId);
    if (!materia) return [];
    return this.grupos().filter((g) => materia.grupos.includes(g.nombre));
  }

  nombreGrupo(): string {
    const g = this.grupos().find(x => x.id === this.grupoId);
    return g ? g.nombre : '';
  }

  hayDatosCargados(): boolean {
    return (this.vista() === 'notas' && !!this.notas()) || (this.vista() === 'asistencia' && !!this.asistencia());
  }

  cargar(): void {
    if (!this.materiaId || !this.grupoId) return;
    this.error.set('');
    this.api.planillaAsistencia(this.materiaId, this.grupoId).subscribe({
      next: (res) => this.asistencia.set(res),
      error: (e) => this.error.set(mensajeError(e))
    });
    this.api.planillaNotas(this.materiaId, this.grupoId).subscribe({
      next: (res) => this.notas.set(res),
      error: (e) => this.error.set(mensajeError(e))
    });
  }

  estudiantesFiltradosNotas() {
    let ests = this.notas()?.estudiantes ?? [];
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      ests = ests.filter(e => e.nombre.toLowerCase().includes(q) || e.documento.includes(q));
    }

    const filtro = this.filtroDesempeno();
    if (filtro === 'superior-alto') {
      ests = ests.filter(e => this.promedioEstudiante(e.id) >= 4.0);
    } else if (filtro === 'basico') {
      ests = ests.filter(e => {
        const p = this.promedioEstudiante(e.id);
        return p >= 3.0 && p < 4.0;
      });
    } else if (filtro === 'riesgo') {
      ests = ests.filter(e => this.promedioEstudiante(e.id) < 3.0);
    }

    return ests;
  }

  estudiantesFiltradosAsistencia() {
    let ests = this.asistencia()?.estudiantes ?? [];
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      ests = ests.filter(e => e.nombre.toLowerCase().includes(q) || e.documento.includes(q));
    }
    return ests;
  }

  totalPaginasNotas = computed(() => {
    const total = this.estudiantesFiltradosNotas().length;
    return Math.max(1, Math.ceil(total / this.elementosPorPagina()));
  });

  estudiantesPaginadosNotas = computed(() => {
    const lista = this.estudiantesFiltradosNotas();
    const p = Math.min(this.paginaNotas(), this.totalPaginasNotas());
    const inicio = (p - 1) * this.elementosPorPagina();
    return lista.slice(inicio, inicio + this.elementosPorPagina());
  });

  totalPaginasAsistencia = computed(() => {
    const total = this.estudiantesFiltradosAsistencia().length;
    return Math.max(1, Math.ceil(total / this.elementosPorPagina()));
  });

  estudiantesPaginadosAsistencia = computed(() => {
    const lista = this.estudiantesFiltradosAsistencia();
    const p = Math.min(this.paginaAsistencia(), this.totalPaginasAsistencia());
    const inicio = (p - 1) * this.elementosPorPagina();
    return lista.slice(inicio, inicio + this.elementosPorPagina());
  });

  onSliderNotas(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.paginaNotas.set(val);
  }

  onSliderAsistencia(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.paginaAsistencia.set(val);
  }

  valor(columna: { notas: Array<{ estudianteId: number; valor: number }> }, estudianteId: number): number | '' {
    const nota = columna.notas.find((n) => n.estudianteId === estudianteId);
    return nota ? nota.valor : '';
  }

  colorDeNota(val: number | ''): string {
    if (val === '') return 'var(--text-muted)';
    if (val >= 4.0) return 'var(--grade-superior)';
    if (val >= 3.0) return 'var(--grade-basico)';
    return 'var(--grade-bajo)';
  }

  promedioEstudiante(estudianteId: number): number {
    const cols = this.notas()?.columnas ?? [];
    const notasEst: number[] = [];
    cols.forEach(c => {
      const n = c.notas.find(x => x.estudianteId === estudianteId);
      if (n && n.valor !== null && n.valor !== undefined) notasEst.push(n.valor);
    });
    if (notasEst.length === 0) return 0;
    return Math.round((notasEst.reduce((a, b) => a + b, 0) / notasEst.length) * 10) / 10;
  }

  escalaEstudiante(estudianteId: number): string {
    const p = this.promedioEstudiante(estudianteId);
    if (p >= 4.6) return 'SUPERIOR';
    if (p >= 4.0) return 'ALTO';
    if (p >= 3.0) return 'BÁSICO';
    return 'BAJO';
  }

  claseEscala(escala: string): string {
    if (escala === 'SUPERIOR') return 'nota-superior';
    if (escala === 'ALTO') return 'nota-alto';
    if (escala === 'BÁSICO') return 'nota-basico';
    return 'nota-bajo';
  }

  promedioCurso(): number {
    const ests = this.notas()?.estudiantes ?? [];
    if (ests.length === 0) return 0;
    const proms = ests.map(e => this.promedioEstudiante(e.id)).filter(p => p > 0);
    if (proms.length === 0) return 3.5;
    return Math.round((proms.reduce((a, b) => a + b, 0) / proms.length) * 10) / 10;
  }

  estudiantesAprobando(): number {
    const ests = this.notas()?.estudiantes ?? [];
    return ests.filter(e => this.promedioEstudiante(e.id) >= 3.0).length;
  }

  estudiantesEnRiesgo(): number {
    const ests = this.notas()?.estudiantes ?? [];
    return ests.filter(e => this.promedioEstudiante(e.id) < 3.0).length;
  }

  tasaAprobacion(): number {
    const ests = this.notas()?.estudiantes ?? [];
    if (ests.length === 0) return 100;
    return Math.round((this.estudiantesAprobando() / ests.length) * 100);
  }

  conteoSuperior(): number {
    const ests = this.notas()?.estudiantes ?? [];
    return ests.filter(e => this.promedioEstudiante(e.id) >= 4.6).length;
  }

  conteoAlto(): number {
    const ests = this.notas()?.estudiantes ?? [];
    return ests.filter(e => {
      const p = this.promedioEstudiante(e.id);
      return p >= 4.0 && p < 4.6;
    }).length;
  }

  conteoBasico(): number {
    const ests = this.notas()?.estudiantes ?? [];
    return ests.filter(e => {
      const p = this.promedioEstudiante(e.id);
      return p >= 3.0 && p < 4.0;
    }).length;
  }

  conteoBajo(): number {
    const ests = this.notas()?.estudiantes ?? [];
    return ests.filter(e => this.promedioEstudiante(e.id) < 3.0).length;
  }

  porcentajeSuperior(): number {
    const total = this.notas()?.estudiantes.length || 1;
    return Math.round((this.conteoSuperior() / total) * 100);
  }

  porcentajeAlto(): number {
    const total = this.notas()?.estudiantes.length || 1;
    return Math.round((this.conteoAlto() / total) * 100);
  }

  porcentajeBasico(): number {
    const total = this.notas()?.estudiantes.length || 1;
    return Math.round((this.conteoBasico() / total) * 100);
  }

  porcentajeBajo(): number {
    const total = this.notas()?.estudiantes.length || 1;
    return Math.round((this.conteoBajo() / total) * 100);
  }

  presente(fecha: { presentes: number[] }, estudianteId: number): boolean {
    return fecha.presentes.includes(estudianteId);
  }

  porcentajeAsistencia(estudianteId: number): number {
    const fechas = this.asistencia()?.fechas ?? [];
    if (fechas.length === 0) return 100;
    const asistidas = fechas.filter(f => f.presentes.includes(estudianteId)).length;
    return Math.round((asistidas / fechas.length) * 100);
  }

  promedioAsistenciaCurso(): number {
    const ests = this.asistencia()?.estudiantes ?? [];
    if (ests.length === 0) return 100;
    const sum = ests.map(e => this.porcentajeAsistencia(e.id)).reduce((a, b) => a + b, 0);
    return Math.round(sum / ests.length);
  }

  estudiantesConFallasCriticas(): number {
    const ests = this.asistencia()?.estudiantes ?? [];
    return ests.filter(e => this.fallasEstudiante(e.id) > 2).length;
  }

  fallasEstudiante(estudianteId: number): number {
    const fechas = this.asistencia()?.fechas ?? [];
    const asistidas = fechas.filter(f => f.presentes.includes(estudianteId)).length;
    return Math.max(0, fechas.length - asistidas);
  }

  alternar(fecha: { id: number; fecha: string; presentes: number[] }, estudianteId: number): void {
    const esPresente = this.presente(fecha, estudianteId);
    this.api.celdaAsistencia({
      materiaId: this.materiaId,
      grupoId: this.grupoId,
      fecha: fecha.fecha,
      estudianteId,
      presente: !esPresente
    }).subscribe(() => {
      if (esPresente) {
        fecha.presentes = fecha.presentes.filter((id) => id !== estudianteId);
      } else {
        fecha.presentes.push(estudianteId);
      }
      this.mostrarToast(esPresente ? '✖ Inasistencia registrada' : '✔ Asistencia confirmada');
    });
  }

  guardarNota(columnaId: number, estudianteId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value === '' ? null : parseFloat(input.value);
    this.api.guardarNota(columnaId, estudianteId, valor).subscribe({
      next: () => {
        const col = this.notas()?.columnas.find((c) => c.id === columnaId);
        if (col) {
          col.notas = col.notas.filter((n) => n.estudianteId !== estudianteId);
          if (valor !== null) col.notas.push({ estudianteId, valor });
        }
        this.mostrarToast(`💾 Nota ${valor ?? 'borrada'} guardada`);
      },
      error: (e) => this.error.set(mensajeError(e))
    });
  }

  agregarColumna(): void {
    if (!this.columnaNueva.trim()) return;
    this.api.crearColumna(this.materiaId, this.grupoId, this.columnaNueva.trim()).subscribe(() => {
      this.mostrarToast(`✅ Evaluación "${this.columnaNueva.trim()}" agregada`);
      this.columnaNueva = '';
      this.cargar();
    });
  }

  agregarFecha(): void {
    if (!this.fechaNueva) return;
    const primerEst = this.asistencia()?.estudiantes[0];
    if (!primerEst) return;
    this.api.celdaAsistencia({
      materiaId: this.materiaId,
      grupoId: this.grupoId,
      fecha: this.fechaNueva,
      estudianteId: primerEst.id,
      presente: false
    }).subscribe(() => {
      this.mostrarToast(`📅 Fecha ${this.fechaNueva} habilitada`);
      this.cargar();
    });
  }

  imprimir(): void {
    window.print();
  }

  exportarCsv(): void {
    const n = this.notas();
    if (!n) return;
    const materia = this.materias().find(m => m.id === this.materiaId)?.nombre || 'Asignatura';
    const grupo = this.nombreGrupo() || 'Grupo';

    const headers = ['Estudiante', 'Documento', ...n.columnas.map(c => c.nombre), 'Definitiva', 'Desempeño'];
    const rows = n.estudiantes.map(e => {
      const notasCols = n.columnas.map(c => {
        const val = this.valor(c, e.id);
        return val === '' ? '' : val.toString();
      });
      return [
        `"${e.nombre}"`,
        `"${e.documento}"`,
        ...notasCols,
        this.promedioEstudiante(e.id).toString(),
        `"${this.escalaEstudiante(e.id)}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Planilla_${materia}_${grupo}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.mostrarToast('📥 Planilla exportada a CSV exitosamente');
  }
}
