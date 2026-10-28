import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { HorarioClaseItem, CrearHorarioRequest } from '../core/models';
import { mensajeError } from '../core/errores';

interface DiaItem {
  num: number;
  nombre: string;
  corto: string;
  emoji: string;
}

interface MateriaDocenteItem {
  materiaId: number;
  materiaNombre: string;
  profesorId: number;
  profesorNombre: string;
  profesorCedula: string;
}

@Component({
  selector: 'app-horario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina animate-fade-in horario-pagina">
      <!-- Encabezado Principal del Horario -->
      <header class="horario-header card card-glass">
        <div class="horario-header-info">
          <div class="horario-header-titulo-row">
            <span class="horario-header-icono">📅</span>
            <div>
              <h1 class="horario-header-titulo">{{ tituloVista() }}</h1>
              <span class="badge badge-azul" style="font-size: 0.75rem; font-weight: 600;">
                {{ rolUsuario() || auth.rol() }} · Período Académico 2026
              </span>
            </div>
          </div>
          <p class="horario-header-desc">
            {{ descripcionVista() }}
          </p>
        </div>

        <div class="horario-header-acciones no-print">
          @if (esDirector()) {
            <button type="button" class="btn-principal btn-sm" (click)="abrirModalCrear()" title="Crear nueva clase en este grado">
              <span>➕</span> Programar Clase
            </button>
          }
          <button type="button" class="btn-secundario btn-sm" (click)="imprimirHorario()" title="Imprimir horario oficial">
            <span>🖨️</span> Imprimir
          </button>
          <button type="button" class="btn-secundario btn-sm" (click)="cargarHorario()" title="Recargar programación">
            <span>🔄</span> Actualizar
          </button>
        </div>
      </header>

      <!-- Mensajes de Estado / Avisos de Éxito o Error -->
      @if (aviso()) {
        <div class="aviso exito animate-fade-in" style="margin-bottom: 1.25rem;">
          <span>✔</span> {{ aviso() }}
        </div>
      }
      @if (error()) {
        <div class="aviso error animate-fade-in" style="margin-bottom: 1.25rem;">
          <span>⚠️</span> {{ error() }}
        </div>
      }

      <!-- Tarjetas Métricas KPI (Diseño Horizontal con estilos institucionales) -->
      <div class="kpi-grid" style="margin: 0.75rem 0 1.5rem;">
        <div class="kpi-banner">
          <div class="kpi-icono">📅</div>
          <div class="kpi-info">
            <span class="kpi-titulo">Bloques Semanales</span>
            <strong class="kpi-numero">{{ clases().length }}</strong>
            <span class="kpi-desc">Clases activas en la semana</span>
          </div>
        </div>

        <div class="kpi-banner">
          <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">📚</div>
          <div class="kpi-info">
            <span class="kpi-titulo">Asignaturas</span>
            <strong class="kpi-numero">{{ totalMaterias() }}</strong>
            <span class="kpi-desc">Materias en la programación</span>
          </div>
        </div>

        <div class="kpi-banner">
          <div class="kpi-icono" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed;">⏱️</div>
          <div class="kpi-info">
            <span class="kpi-titulo">Horas Pedagógicas</span>
            <strong class="kpi-numero">{{ totalHorasSemanales() }} h</strong>
            <span class="kpi-desc">Intensidad horaria estimada</span>
          </div>
        </div>

        <div class="kpi-banner">
          <div class="kpi-icono" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">🏛️</div>
          <div class="kpi-info" style="min-width: 0; overflow: hidden;">
            <span class="kpi-titulo">{{ esDocente() ? 'Docente Titular' : 'Curso / Grado' }}</span>
            <strong class="kpi-numero" style="font-size: 1.35rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="usuarioNombre()">
              {{ usuarioNombre() || 'Institucional' }}
            </strong>
            <span class="kpi-desc" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="grupoNombre()">
              {{ esDocente() ? 'Agenda Académica' : ('Grado ' + (grupoNombre() || '10A')) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Selector de Curso (Para Director o Profesor con múltiples cursos) -->
      @if (esDirector() || listaCursos().length > 1) {
        <div class="card card-selector-curso no-print">
          <div class="entre" style="gap: 0.75rem; flex-wrap: wrap; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 1.15rem;">🏛️</span>
              <strong style="font-size: 0.9rem; color: var(--text-primary);">
                {{ esDirector() ? 'Gestionar Horario del Grado:' : 'Consultar Horario de otro Grado:' }}
              </strong>
            </div>

            <div class="cursos-pills-scroll">
              @for (c of listaCursos(); track c.id) {
                <button
                  type="button"
                  class="btn-curso-pill"
                  [class.activo]="cursoSeleccionadoId() === c.id"
                  (click)="seleccionarCurso(c.id)"
                >
                  <span>Grado {{ c.nombre }}</span>
                  <span class="badge-mini">{{ c.totalClases }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Barra de Control de Vistas, Días y Reloj -->
      <div class="horario-toolbar card card-glass no-print">
        <div class="horario-toolbar-left">
          <div class="dias-scroll-wrapper">
            <button
              type="button"
              class="dia-pill-btn"
              [class.activo]="diaFiltro() === 0"
              (click)="diaFiltro.set(0)"
            >
              <span>🗓️</span>
              <span class="dia-pill-label">Semana Completa</span>
              <span class="dia-pill-count">{{ clases().length }}</span>
            </button>

            @for (dia of diasVisibles(); track dia.num) {
              <button
                type="button"
                class="dia-pill-btn"
                [class.activo]="diaFiltro() === dia.num"
                [class.es-hoy]="diaHoy() === dia.num"
                (click)="diaFiltro.set(dia.num)"
              >
                <span>{{ dia.emoji }}</span>
                <span class="dia-pill-label">{{ dia.nombre }}</span>
                @if (diaHoy() === dia.num) {
                  <span class="badge-hoy-dot" title="Día actual">HOY</span>
                }
                <span class="dia-pill-count">{{ clasesPorDia(dia.num).length }}</span>
              </button>
            }
          </div>
        </div>

        <div class="horario-toolbar-right">
          <!-- Reloj Institucional en Vivo -->
          <div class="reloj-badge" title="Hora del sistema">
            <span class="reloj-icono">🕒</span>
            <span class="reloj-texto">
              <strong>{{ horaActualStr() || '08:00' }}</strong>
              <small>· {{ nombreDiaHoy() }}</small>
            </span>
          </div>

          <!-- Selector de Modo Grilla / Agenda -->
          <div class="modo-vista-toggle">
            <button
              type="button"
              class="modo-btn"
              [class.activo]="modoVista() === 'grilla'"
              (click)="modoVista.set('grilla')"
              title="Vista Matriz Semanal"
            >
              🗓️ Grilla
            </button>
            <button
              type="button"
              class="modo-btn"
              [class.activo]="modoVista() === 'agenda'"
              (click)="modoVista.set('agenda')"
              title="Vista Agenda Diaria por Tarjetas"
            >
              📋 Agenda
            </button>
          </div>
        </div>
      </div>

      <!-- Estado: Cargando -->
      @if (cargando()) {
        <div class="card card-estado-vacio">
          <div class="pulsing-dot" style="margin: 0 auto 1rem; width: 16px; height: 16px;"></div>
          <h3 style="margin: 0 0 0.35rem; font-size: 1.15rem;">Cargando programación escolar...</h3>
          <p class="lead" style="margin: 0; font-size: 0.88rem;">Sincronizando asignaturas, docentes y salones institucionales.</p>
        </div>
      } @else if (clases().length === 0) {
        <div class="card card-estado-vacio">
          <span style="font-size: 3.2rem; display: block; margin-bottom: 0.75rem;">📭</span>
          <h3 style="margin: 0 0 0.5rem; font-size: 1.25rem;">No hay clases programadas para este grupo</h3>
          <p class="lead" style="margin: 0 auto 1.25rem; max-width: 34rem; font-size: 0.9rem;">
            @if (esDirector()) {
              Aún no has configurado las franjas horarias para el grado {{ grupoNombre() }}. Puedes agregar la primera clase ahora mismo.
            } @else {
              La Dirección Institucional aún no ha configurado las franjas horarias de este curso. Las asignaturas aparecerán aquí en cuanto sean programadas.
            }
          </p>
          @if (esDirector()) {
            <button type="button" class="btn-principal" (click)="abrirModalCrear()">
              <span>➕</span> Programar Primera Clase
            </button>
          }
        </div>
      } @else {
        <!-- ====================================================================
             VISTA 1: MATRIZ SEMANAL (GRILLA MULTICOLUMNA RESPONSIVE)
             ==================================================================== -->
        @if (modoVista() === 'grilla' && diaFiltro() === 0) {
          <div class="horario-matriz-container">
            <div class="horario-matriz-grid" [style.--cols-count]="diasVisibles().length">
              @for (dia of diasVisibles(); track dia.num) {
                <div class="horario-dia-columna" [class.es-hoy]="diaHoy() === dia.num">
                  <!-- Cabecera del Día -->
                  <div class="horario-dia-col-header">
                    <div>
                      <h3 class="dia-col-titulo">{{ dia.nombre }}</h3>
                      <span class="dia-col-sub">{{ clasesPorDia(dia.num).length }} asignaturas</span>
                    </div>
                    @if (diaHoy() === dia.num) {
                      <span class="badge badge-verde badge-dia-hoy">HOY</span>
                    }
                  </div>

                  <!-- Lista de Clases del Día -->
                  <div class="horario-dia-col-clases">
                    @for (c of clasesPorDia(dia.num); track c.id) {
                      <article
                        class="clase-card"
                        [class.clase-en-curso]="esClaseEnCurso(dia.num, c.horaInicio, c.horaFin)"
                        [style.border-left-color]="colorMateria(c.materiaNombre)"
                      >
                        <!-- Top: Hora y Acciones (Editar/Borrar si es Director) -->
                        <div class="clase-card-top">
                          <span class="clase-hora-badge">
                            🕒 {{ c.horaInicio }} - {{ c.horaFin }}
                          </span>

                          <div class="clase-top-badges">
                            @if (esClaseEnCurso(dia.num, c.horaInicio, c.horaFin)) {
                              <span class="badge-en-curso">
                                <span class="dot-en-curso"></span> EN CURSO
                              </span>
                            }

                            <!-- Acciones de Dirección (Editar / Eliminar) -->
                            @if (esDirector()) {
                              <div class="clase-acciones-director no-print">
                                <button type="button" class="btn-accion-icono btn-editar" (click)="abrirModalEditar(c)" title="Editar horario de esta clase">
                                  ✏️
                                </button>
                                <button type="button" class="btn-accion-icono btn-borrar" (click)="confirmarEliminar(c)" title="Eliminar clase del horario">
                                  🗑️
                                </button>
                              </div>
                            }
                          </div>
                        </div>

                        <!-- Asignatura -->
                        <h4 class="clase-materia-titulo" [title]="c.materiaNombre">
                          {{ c.materiaNombre }}
                        </h4>

                        <!-- Docente o Grupo -->
                        <div class="clase-docente-row">
                          <span class="clase-docente-icono">{{ esDocente() ? '👥' : '👨‍🏫' }}</span>
                          <span class="clase-docente-nombre" [title]="esDocente() ? ('Curso: ' + c.grupoNombre) : c.profesorNombre">
                            {{ esDocente() ? ('Grado ' + c.grupoNombre) : c.profesorNombre }}
                          </span>
                        </div>

                        <!-- Aula & Nota -->
                        <div class="clase-chips-row">
                          <span class="chip-aula" [title]="'Espacio: ' + (c.aula || 'Aula Regular')">
                            🏫 {{ c.aula || 'Aula 101' }}
                          </span>
                          @if (c.notas) {
                            <span class="chip-nota" [title]="c.notas">
                              📌 {{ c.notas }}
                            </span>
                          }
                        </div>
                      </article>
                    } @empty {
                      <div class="columna-dia-vacio">
                        <span style="font-size: 1.8rem; opacity: 0.6;">☕</span>
                        <p style="margin: 0.35rem 0 0; font-size: 0.78rem;">Sin clases programadas</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- ====================================================================
               VISTA 2: AGENDA DETALLADA POR DÍA (MOBILE-FIRST)
               ==================================================================== -->
          <div class="horario-agenda-container card card-glass">
            <div class="agenda-dia-header">
              <div class="agenda-dia-info">
                <h3 class="agenda-dia-titulo">
                  <span>📅</span> {{ diaFiltro() === 0 ? 'Cronograma Semanal Consolidado' : nombreDia(diaFiltro()) }}
                  @if (diaHoy() === diaFiltro()) {
                    <span class="badge badge-verde">Día de hoy</span>
                  }
                </h3>
                <p class="agenda-dia-desc">
                  {{ diaFiltro() === 0 ? 'Todas las asignaturas ordenadas por día y hora' : ('Jornada académica para el día ' + nombreDia(diaFiltro())) }}
                </p>
              </div>

              <span class="badge badge-azul agenda-count-badge">
                {{ clasesMostradas().length }} sesiones de clase
              </span>
            </div>

            <!-- Lista de Tarjetas de la Agenda -->
            <div class="agenda-cards-lista">
              @for (c of clasesMostradas(); track c.id) {
                <div
                  class="agenda-card card"
                  [class.clase-en-curso]="esClaseEnCurso(c.diaSemana, c.horaInicio, c.horaFin)"
                  [style.border-left-color]="colorMateria(c.materiaNombre)"
                >
                  <div class="agenda-card-grid">
                    <!-- Columna 1: Hora y Día -->
                    <div class="agenda-hora-col">
                      <div class="agenda-hora-pill">
                        🕒 {{ c.horaInicio }} - {{ c.horaFin }}
                      </div>
                      <span class="agenda-dia-tag">{{ c.diaNombre }}</span>
                      @if (esClaseEnCurso(c.diaSemana, c.horaInicio, c.horaFin)) {
                        <span class="badge-en-curso" style="margin-top: 0.35rem;">
                          <span class="dot-en-curso"></span> EN CURSO AHORA
                        </span>
                      }
                    </div>

                    <!-- Columna 2: Detalle de Materia, Docente y Aula -->
                    <div class="agenda-info-col">
                      <div class="agenda-titulo-row">
                        <h4 class="agenda-materia-titulo">{{ c.materiaNombre }}</h4>
                        <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;">
                          <span class="chip-aula-lg">🏫 {{ c.aula || 'Aula Principal' }}</span>

                          @if (esDirector()) {
                            <div class="agenda-botones-director no-print">
                              <button type="button" class="btn-secundario btn-sm" (click)="abrirModalEditar(c)">
                                <span>✏️</span> Editar
                              </button>
                              <button type="button" class="btn-secundario btn-sm btn-borrar-agenda" (click)="confirmarEliminar(c)">
                                <span>🗑️</span> Borrar
                              </button>
                            </div>
                          }
                        </div>
                      </div>

                      <div class="agenda-meta-row">
                        <div class="agenda-meta-item">
                          <span class="meta-label">👨‍🏫 Docente Titular:</span>
                          <strong class="meta-valor">{{ c.profesorNombre }}</strong>
                          @if (c.profesorCedula) {
                            <small class="meta-cedula">({{ c.profesorCedula }})</small>
                          }
                        </div>

                        <div class="agenda-meta-item">
                          <span class="meta-label">👥 Curso / Grado:</span>
                          <strong class="meta-valor">Grado {{ c.grupoNombre }}</strong>
                        </div>
                      </div>

                      @if (c.notas) {
                        <div class="agenda-nota-box">
                          <span class="nota-icono">📌</span>
                          <span class="nota-texto"><strong>Indicación de Dirección:</strong> {{ c.notas }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="agenda-vacia-box">
                  <span style="font-size: 2.6rem;">☕</span>
                  <h4 style="margin: 0.5rem 0 0.25rem;">No hay clases programadas</h4>
                  <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">
                    No hay asignaturas configuradas para esta selección.
                  </p>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- ======================================================================
           MODAL 1: PROGRAMAR NUEVA CLASE EN HORARIO (DIRECCIÓN / ADMIN)
           ====================================================================== -->
      @if (mostrarModalCrear()) {
        <div class="modal-backdrop no-print" (click)="cerrarModalCrear($event)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <button type="button" class="modal-cerrar" (click)="mostrarModalCrear.set(false)" title="Cerrar ventana">✕</button>

            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.8rem;">➕</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0; color: var(--text-primary);">Programar Nueva Clase</h2>
                <small style="color: var(--text-secondary);">Grado Escolar: <strong>{{ grupoNombre() || 'Curso Seleccionado' }}</strong></small>
              </div>
            </div>

            @if (modalError()) {
              <div class="aviso error animate-fade-in" style="margin: 0.85rem 0;">
                <span>⚠️</span> {{ modalError() }}
              </div>
            }

            <form (ngSubmit)="guardarNuevoHorario()" style="display: grid; gap: 1rem; margin-top: 1rem;">
              <label style="font-weight: 600; font-size: 0.85rem;">
                Asignatura del Curso *
                <select [(ngModel)]="formMateriaId" name="formMateriaId" required style="width: 100%; margin-top: 0.35rem;" (ngModelChange)="alSeleccionarMateriaCrear($event)">
                  <option [ngValue]="0">Selecciona la materia que se ve en este grado...</option>
                  @for (m of materiasDelCurso(); track m.materiaId) {
                    <option [ngValue]="m.materiaId">{{ m.materiaNombre }} (Docente: {{ m.profesorNombre }})</option>
                  }
                </select>
                <small style="display: block; font-weight: normal; color: var(--text-muted); margin-top: 0.2rem;">
                  Docente titular asignado: <strong>{{ formProfesorNombre() || 'Se asigna automáticamente' }}</strong>
                </small>
              </label>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.85rem;">
                <label style="font-weight: 600; font-size: 0.85rem;">
                  Día de la Semana *
                  <select [(ngModel)]="formDiaSemana" name="formDiaSemana" required style="width: 100%; margin-top: 0.35rem;">
                    <option [ngValue]="1">Lunes</option>
                    <option [ngValue]="2">Martes</option>
                    <option [ngValue]="3">Miércoles</option>
                    <option [ngValue]="4">Jueves</option>
                    <option [ngValue]="5">Viernes</option>
                    <option [ngValue]="6">Sábado</option>
                  </select>
                </label>

                <label style="font-weight: 600; font-size: 0.85rem;">
                  Franja Horaria Sugerida
                  <select [(ngModel)]="formFranjaPredefinida" name="formFranjaPredefinida" (ngModelChange)="aplicarFranjaCrear($event)" style="width: 100%; margin-top: 0.35rem;">
                    <option value="">Personalizada...</option>
                    <option value="07:00-08:30">07:00 - 08:30 (Bloque 1)</option>
                    <option value="08:30-10:00">08:30 - 10:00 (Bloque 2)</option>
                    <option value="10:30-12:00">10:30 - 12:00 (Bloque 3)</option>
                    <option value="12:30-14:00">12:30 - 14:00 (Bloque 4)</option>
                    <option value="14:00-15:30">14:00 - 15:30 (Bloque 5)</option>
                  </select>
                </label>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                <label style="font-weight: 600; font-size: 0.85rem;">
                  Hora Inicio (HH:mm) *
                  <input type="time" [(ngModel)]="formHoraInicio" name="formHoraInicio" required style="width: 100%; margin-top: 0.35rem;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem;">
                  Hora Fin (HH:mm) *
                  <input type="time" [(ngModel)]="formHoraFin" name="formHoraFin" required style="width: 100%; margin-top: 0.35rem;" />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.85rem;">
                <label style="font-weight: 600; font-size: 0.85rem;">
                  Aula / Salón / Laboratorio
                  <input type="text" [(ngModel)]="formAula" name="formAula" placeholder="Ej. Aula 101, Lab Química" style="width: 100%; margin-top: 0.35rem;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem;">
                  Indicaciones / Notas (Opcional)
                  <input type="text" [(ngModel)]="formNotas" name="formNotas" placeholder="Ej. Traer material didáctico" style="width: 100%; margin-top: 0.35rem;" />
                </label>
              </div>

              <div style="display: flex; gap: 0.65rem; justify-content: flex-end; margin-top: 0.75rem;">
                <button type="button" class="btn-secundario" (click)="mostrarModalCrear.set(false)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="guardando()">
                  {{ guardando() ? 'Guardando...' : '✔ Guardar en Horario' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ======================================================================
           MODAL 2: EDITAR CLASE EN HORARIO (DIRECCIÓN / ADMIN)
           ====================================================================== -->
      @if (mostrarModalEditar()) {
        <div class="modal-backdrop no-print" (click)="cerrarModalEditar($event)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <button type="button" class="modal-cerrar" (click)="mostrarModalEditar.set(false)" title="Cerrar ventana">✕</button>

            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.8rem;">✏️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0; color: var(--text-primary);">Editar Clase del Horario</h2>
                <small style="color: var(--text-secondary);">Grado: <strong>{{ editGrupoNombre }}</strong> (ID Bloque #{{ editClaseId }})</small>
              </div>
            </div>

            @if (modalError()) {
              <div class="aviso error animate-fade-in" style="margin: 0.85rem 0;">
                <span>⚠️</span> {{ modalError() }}
              </div>
            }

            <form (ngSubmit)="guardarEdicionHorario()" style="display: grid; gap: 1rem; margin-top: 1rem;">
              <label style="font-weight: 600; font-size: 0.85rem;">
                Asignatura *
                <select [(ngModel)]="editMateriaId" name="editMateriaId" required style="width: 100%; margin-top: 0.35rem;" (ngModelChange)="alSeleccionarMateriaEditar($event)">
                  @for (m of materiasDelCurso(); track m.materiaId) {
                    <option [ngValue]="m.materiaId">{{ m.materiaNombre }} (Docente: {{ m.profesorNombre }})</option>
                  }
                </select>
                <small style="display: block; font-weight: normal; color: var(--text-muted); margin-top: 0.2rem;">
                  Docente titular: <strong>{{ editProfesorNombre }}</strong>
                </small>
              </label>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.85rem;">
                <label style="font-weight: 600; font-size: 0.85rem;">
                  Día de la Semana *
                  <select [(ngModel)]="editDiaSemana" name="editDiaSemana" required style="width: 100%; margin-top: 0.35rem;">
                    <option [ngValue]="1">Lunes</option>
                    <option [ngValue]="2">Martes</option>
                    <option [ngValue]="3">Miércoles</option>
                    <option [ngValue]="4">Jueves</option>
                    <option [ngValue]="5">Viernes</option>
                    <option [ngValue]="6">Sábado</option>
                  </select>
                </label>

                <label style="font-weight: 600; font-size: 0.85rem;">
                  Franja Horaria Rápida
                  <select (change)="aplicarFranjaEditar($event)" style="width: 100%; margin-top: 0.35rem;">
                    <option value="">Mantener horas actuales...</option>
                    <option value="07:00-08:30">07:00 - 08:30 (Bloque 1)</option>
                    <option value="08:30-10:00">08:30 - 10:00 (Bloque 2)</option>
                    <option value="10:30-12:00">10:30 - 12:00 (Bloque 3)</option>
                    <option value="12:30-14:00">12:30 - 14:00 (Bloque 4)</option>
                    <option value="14:00-15:30">14:00 - 15:30 (Bloque 5)</option>
                  </select>
                </label>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                <label style="font-weight: 600; font-size: 0.85rem;">
                  Hora Inicio (HH:mm) *
                  <input type="time" [(ngModel)]="editHoraInicio" name="editHoraInicio" required style="width: 100%; margin-top: 0.35rem;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem;">
                  Hora Fin (HH:mm) *
                  <input type="time" [(ngModel)]="editHoraFin" name="editHoraFin" required style="width: 100%; margin-top: 0.35rem;" />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.85rem;">
                <label style="font-weight: 600; font-size: 0.85rem;">
                  Aula / Salón / Laboratorio
                  <input type="text" [(ngModel)]="editAula" name="editAula" placeholder="Ej. Aula 101" style="width: 100%; margin-top: 0.35rem;" />
                </label>

                <label style="font-weight: 600; font-size: 0.85rem;">
                  Indicaciones / Notas
                  <input type="text" [(ngModel)]="editNotas" name="editNotas" placeholder="Ej. Clase teórica" style="width: 100%; margin-top: 0.35rem;" />
                </label>
              </div>

              <div style="display: flex; gap: 0.65rem; justify-content: flex-end; margin-top: 0.75rem;">
                <button type="button" class="btn-secundario" (click)="mostrarModalEditar.set(false)">Cancelar</button>
                <button type="submit" class="btn-principal" [disabled]="editando()">
                  {{ editando() ? 'Actualizando...' : '✔ Guardar Cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .horario-pagina {
      padding-bottom: 2.5rem;
    }

    /* Header del Horario */
    .horario-header {
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
      flex-wrap: wrap;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }

    .horario-header-info {
      flex: 1 1 320px;
      min-width: 0;
    }

    .horario-header-titulo-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.4rem;
      flex-wrap: wrap;
    }

    .horario-header-icono {
      font-size: 2.1rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .horario-header-titulo {
      margin: 0;
      font-size: clamp(1.35rem, 2.8vw, 1.85rem);
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1.25;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .horario-header-desc {
      margin: 0.35rem 0 0;
      color: var(--text-secondary);
      font-size: clamp(0.82rem, 1.8vw, 0.92rem);
      line-height: 1.45;
      max-width: 54rem;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .horario-header-acciones {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-self: center;
    }

    /* Selector de Cursos */
    .card-selector-curso {
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.25rem;
      background: var(--bg-surface-solid);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .cursos-pills-scroll {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn-curso-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 0.35rem 0.8rem;
      border-radius: var(--radius-pill);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-curso-pill:hover {
      background: var(--bg-hover);
      border-color: var(--primary);
    }

    .btn-curso-pill.activo {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .badge-mini {
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-pill);
      background: rgba(0, 0, 0, 0.12);
    }

    .btn-curso-pill.activo .badge-mini {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    /* Toolbar de Vistas y Días */
    .horario-toolbar {
      padding: 0.85rem 1.15rem;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }

    .horario-toolbar-left {
      flex: 1 1 300px;
      min-width: 0;
    }

    .dias-scroll-wrapper {
      display: flex;
      gap: 0.45rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .dias-scroll-wrapper::-webkit-scrollbar {
      display: none;
    }

    .dia-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      border-radius: var(--radius-pill);
      background: var(--bg-hover);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      user-select: none;
      flex-shrink: 0;
    }

    .dia-pill-btn:hover {
      background: var(--bg-surface);
      color: var(--text-primary);
      border-color: var(--border-hover, var(--border));
    }

    .dia-pill-btn.activo {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .dia-pill-count {
      font-size: 0.7rem;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-pill);
      background: rgba(0, 0, 0, 0.08);
      font-weight: 700;
    }

    .dia-pill-btn.activo .dia-pill-count {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    .badge-hoy-dot {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.1rem 0.35rem;
      border-radius: var(--radius-sm);
      background: var(--grade-superior);
      color: #ffffff;
    }

    .horario-toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .reloj-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.38rem 0.75rem;
      border-radius: var(--radius-pill);
      background: var(--bg-surface-solid);
      border: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .reloj-texto strong {
      color: var(--primary);
      font-family: monospace;
      font-size: 0.88rem;
    }

    .modo-vista-toggle {
      display: inline-flex;
      background: var(--bg-hover);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 0.2rem;
      gap: 0.15rem;
    }

    .modo-btn {
      border: none;
      background: transparent;
      padding: 0.3rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: var(--radius-pill);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .modo-btn.activo {
      background: var(--bg-surface-solid);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
      font-weight: 700;
    }

    /* ==========================================================================
       VISTA MATRIZ SEMANAL
       ========================================================================== */
    .horario-matriz-container {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 1rem;
      border-radius: var(--radius-lg);
    }

    .horario-matriz-grid {
      display: grid;
      grid-template-columns: repeat(var(--cols-count, 5), minmax(215px, 1fr));
      gap: 0.85rem;
      align-items: start;
      min-width: calc(var(--cols-count, 5) * 215px);
    }

    @media (min-width: 1300px) {
      .horario-matriz-grid {
        min-width: 100%;
      }
    }

    .horario-dia-columna {
      background: var(--bg-surface-solid);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-sm);
      min-width: 0;
    }

    .horario-dia-columna.es-hoy {
      border: 2px solid var(--primary);
      box-shadow: 0 4px 18px rgba(13, 148, 136, 0.18);
    }

    .horario-dia-col-header {
      background: var(--bg-surface);
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .horario-dia-columna.es-hoy .horario-dia-col-header {
      background: rgba(13, 148, 136, 0.09);
      border-bottom-color: rgba(13, 148, 136, 0.25);
    }

    .dia-col-titulo {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .dia-col-sub {
      font-size: 0.72rem;
      color: var(--text-muted);
      display: block;
      margin-top: 0.1rem;
    }

    .badge-dia-hoy {
      font-size: 0.68rem;
      padding: 0.15rem 0.45rem;
      font-weight: 800;
    }

    .horario-dia-col-clases {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Tarjeta de Clase */
    .clase-card {
      padding: 0.85rem;
      margin: 0;
      border-left: 4px solid var(--primary);
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
      overflow: hidden;
    }

    .clase-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .clase-card.clase-en-curso {
      background: rgba(16, 185, 129, 0.08);
      border-left: 5px solid var(--grade-superior);
      border-color: rgba(16, 185, 129, 0.35);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.15);
    }

    .clase-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .clase-top-badges {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .clase-hora-badge {
      font-family: monospace;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--text-primary);
      background: var(--bg-hover);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      white-space: nowrap;
    }

    .badge-en-curso {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.12rem 0.4rem;
      border-radius: var(--radius-pill);
      background: rgba(16, 185, 129, 0.18);
      color: var(--grade-superior);
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .dot-en-curso {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--grade-superior);
      animation: pulseDot 1.4s infinite;
    }

    @keyframes pulseDot {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.35); }
      100% { opacity: 1; transform: scale(1); }
    }

    .clase-acciones-director {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }

    .btn-accion-icono {
      background: var(--bg-hover);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.15rem 0.35rem;
      font-size: 0.75rem;
      cursor: pointer;
      line-height: 1;
      transition: all 0.15s ease;
    }

    .btn-accion-icono:hover {
      background: var(--bg-surface-solid);
    }

    .btn-editar:hover {
      border-color: var(--primary);
    }

    .btn-borrar:hover {
      background: var(--grade-bajo-bg);
      border-color: var(--grade-bajo);
    }

    .clase-materia-titulo {
      margin: 0.15rem 0;
      font-size: 0.92rem;
      font-weight: 750;
      color: var(--text-primary);
      line-height: 1.35;
      word-break: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .clase-docente-row {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.3;
      min-width: 0;
    }

    .clase-docente-icono {
      flex-shrink: 0;
      font-size: 0.85rem;
    }

    .clase-docente-nombre {
      word-break: break-word;
      overflow-wrap: break-word;
      font-weight: 550;
    }

    .clase-chips-row {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 0.2rem;
      padding-top: 0.35rem;
      border-top: 1px dashed var(--border);
    }

    .chip-aula {
      font-size: 0.72rem;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      background: var(--bg-hover);
      color: var(--text-primary);
      font-weight: 600;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-nota {
      font-size: 0.7rem;
      color: var(--text-muted);
      cursor: help;
      word-break: break-word;
      overflow-wrap: break-word;
      font-style: italic;
    }

    .columna-dia-vacio {
      padding: 2.25rem 0.75rem;
      text-align: center;
      color: var(--text-muted);
    }

    /* ==========================================================================
       VISTA AGENDA DIARIA
       ========================================================================== */
    .horario-agenda-container {
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }

    .agenda-dia-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--border);
    }

    .agenda-dia-info {
      flex: 1 1 240px;
      min-width: 0;
    }

    .agenda-dia-titulo {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .agenda-dia-desc {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
      word-break: break-word;
    }

    .agenda-count-badge {
      font-size: 0.82rem;
      padding: 0.3rem 0.7rem;
      font-weight: 600;
    }

    .agenda-cards-lista {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .agenda-card {
      border-left: 5px solid var(--primary);
      padding: 1.25rem 1.4rem;
      margin: 0;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .agenda-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .agenda-card.clase-en-curso {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
    }

    .agenda-card-grid {
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .agenda-hora-col {
      flex: 0 0 160px;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    @media (max-width: 640px) {
      .agenda-hora-col {
        flex: 1 1 100%;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    }

    .agenda-hora-pill {
      font-family: monospace;
      font-size: 0.92rem;
      font-weight: 750;
      color: var(--primary);
      background: var(--bg-hover);
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-sm);
      display: inline-block;
      white-space: nowrap;
    }

    .agenda-dia-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .agenda-info-col {
      flex: 1 1 280px;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .agenda-titulo-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .agenda-materia-titulo {
      margin: 0;
      font-size: 1.18rem;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
      flex: 1 1 200px;
    }

    .chip-aula-lg {
      font-size: 0.8rem;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-pill);
      background: var(--bg-hover);
      border: 1px solid var(--border);
      color: var(--text-primary);
      font-weight: 600;
      white-space: nowrap;
    }

    .agenda-botones-director {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-borrar-agenda:hover {
      background: var(--grade-bajo-bg) !important;
      color: var(--grade-bajo) !important;
      border-color: var(--grade-bajo) !important;
    }

    .agenda-meta-row {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .agenda-meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
      word-break: break-word;
    }

    .meta-label {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .meta-valor {
      color: var(--text-primary);
      font-weight: 600;
    }

    .meta-cedula {
      font-family: monospace;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .agenda-nota-box {
      margin-top: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-hover);
      border: 1px dashed var(--border);
      font-size: 0.82rem;
      color: var(--text-secondary);
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .nota-icono {
      flex-shrink: 0;
    }

    .agenda-vacia-box {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--text-muted);
    }

    .card-estado-vacio {
      text-align: center;
      padding: 3.5rem 1.5rem;
      border-radius: var(--radius-lg);
    }

    /* Print Styles */
    @media print {
      .no-print, .shell > header, .shell-footer, .user-controls, .modal-backdrop {
        display: none !important;
      }

      .horario-pagina {
        padding: 0 !important;
      }

      .horario-matriz-container {
        overflow: visible !important;
      }

      .horario-matriz-grid {
        grid-template-columns: repeat(5, 1fr) !important;
        min-width: 100% !important;
        gap: 0.35rem !important;
      }

      .clase-card {
        box-shadow: none !important;
        border: 1px solid #ccc !important;
        page-break-inside: avoid;
        padding: 0.45rem !important;
      }
    }
  `]
})
export class HorarioComponent implements OnInit {
  cargando = signal(true);
  error = signal('');
  aviso = signal('');
  clases = signal<HorarioClaseItem[]>([]);
  usuarioNombre = signal('');
  grupoNombre = signal('');
  rolUsuario = signal('');
  diaFiltro = signal(0); // 0 = Todos / Semana, 1 = Lun, 2 = Mar, etc.
  modoVista = signal<'grilla' | 'agenda'>('grilla');

  diaHoy = signal(1); // 1 = Lunes .. 6 = Sábado
  horaActualStr = signal('');

  listaCursos = signal<Array<{ id: number; nombre: string; totalClases: number }>>([]);
  cursoSeleccionadoId = signal<number | null>(null);

  // Catálogo de materias del curso para Director
  materiasDelCurso = signal<MateriaDocenteItem[]>([]);

  // Modales de Dirección
  mostrarModalCrear = signal(false);
  mostrarModalEditar = signal(false);
  modalError = signal('');
  guardando = signal(false);
  editando = signal(false);

  // Formulario Crear
  formMateriaId = 0;
  formProfesorId = 0;
  formProfesorNombre = signal('');
  formDiaSemana = 1;
  formFranjaPredefinida = '07:00-08:30';
  formHoraInicio = '07:00';
  formHoraFin = '08:30';
  formAula = '';
  formNotas = '';

  // Formulario Editar
  editClaseId = 0;
  editGrupoId = 0;
  editGrupoNombre = '';
  editMateriaId = 0;
  editProfesorId = 0;
  editProfesorNombre = '';
  editDiaSemana = 1;
  editHoraInicio = '';
  editHoraFin = '';
  editAula = '';
  editNotas = '';

  readonly diasBase: DiaItem[] = [
    { num: 1, nombre: 'Lunes', corto: 'Lun', emoji: '📘' },
    { num: 2, nombre: 'Martes', corto: 'Mar', emoji: '📗' },
    { num: 3, nombre: 'Miércoles', corto: 'Mié', emoji: '📙' },
    { num: 4, nombre: 'Jueves', corto: 'Jue', emoji: '📕' },
    { num: 5, nombre: 'Viernes', corto: 'Vie', emoji: '📓' },
    { num: 6, nombre: 'Sábado', corto: 'Sáb', emoji: '📒' }
  ];

  diasVisibles = computed<DiaItem[]>(() => {
    const haySabado = this.clases().some(c => c.diaSemana === 6);
    return haySabado ? this.diasBase : this.diasBase.slice(0, 5);
  });

  clasesMostradas = computed(() => {
    const f = this.diaFiltro();
    if (f === 0) return this.clases();
    return this.clases().filter(c => c.diaSemana === f);
  });

  totalMaterias = computed(() => {
    const nombres = new Set(this.clases().map(c => c.materiaNombre.trim().toLowerCase()));
    return nombres.size;
  });

  totalHorasSemanales = computed(() => {
    return (this.clases().length * 1.5).toFixed(1);
  });

  tituloVista = computed(() => {
    const rol = this.auth.rol();
    if (rol === 'Estudiante') return 'Mi Horario Escolar de Clases';
    if (rol === 'Profesor') return 'Mi Horario y Agenda Docente';
    if (rol === 'Acudiente') return 'Horario de Clases de la Familia';
    return 'Programación Oficial del Horario de Clases';
  });

  descripcionVista = computed(() => {
    const rol = this.auth.rol();
    if (rol === 'Estudiante')
      return `Distribución semanal de asignaturas para el grado ${this.grupoNombre() || ''}. Consulta tus salones de clase y docentes titulares con alerta en tiempo real.`;
    if (rol === 'Profesor')
      return `Agenda consolidada de asignación docente. Consulta los grados, materias y aulas asignadas para tu jornada de clase semanal.`;
    if (rol === 'Acudiente')
      return `Horario escolar oficial de las asignaturas matriculadas para acompañamiento y seguimiento formativo familiar.`;
    return 'Supervisión y control institucional del cronograma de materias dictadas por grado escolar.';
  });

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.modoVista.set('agenda');
    }

    this.calcularDiaYHoraActual();
    this.cargarCursosSiAplica();
    this.cargarHorario();

    setInterval(() => this.calcularDiaYHoraActual(), 30000);
  }

  esDocente(): boolean {
    return this.auth.rol() === 'Profesor';
  }

  esDirector(): boolean {
    return this.auth.rol() === 'Director' || this.auth.rol() === 'Admin';
  }

  calcularDiaYHoraActual(): void {
    const ahora = new Date();
    const day = ahora.getDay();
    this.diaHoy.set(day === 0 ? 1 : day);

    const hh = ahora.getHours().toString().padStart(2, '0');
    const mm = ahora.getMinutes().toString().padStart(2, '0');
    this.horaActualStr.set(`${hh}:${mm}`);
  }

  nombreDiaHoy(): string {
    const d = this.diasBase.find(x => x.num === this.diaHoy());
    return d ? d.nombre : 'Hoy';
  }

  cargarCursosSiAplica(): void {
    if (this.esDirector() || this.esDocente()) {
      this.api.listarCursosHorario().subscribe({
        next: (res) => {
          this.listaCursos.set(res || []);
          if (this.esDirector() && res.length > 0 && !this.cursoSeleccionadoId()) {
            this.cursoSeleccionadoId.set(res[0].id);
            this.cargarMateriasDelCurso(res[0].id);
          }
        },
        error: () => {}
      });
    }
  }

  cargarMateriasDelCurso(grupoId: number): void {
    if (!this.esDirector()) return;
    this.api.directorMateriasPorCurso(grupoId).subscribe({
      next: (res) => {
        this.materiasDelCurso.set(res.materias || []);
      },
      error: () => {}
    });
  }

  cargarHorario(): void {
    this.cargando.set(true);
    this.error.set('');

    const gId = this.cursoSeleccionadoId();
    if (gId) {
      this.cargarMateriasDelCurso(gId);
      this.api.obtenerHorarioCurso(gId).subscribe({
        next: (res) => {
          this.clases.set(res.clases || []);
          this.usuarioNombre.set(res.grupoNombre ? `Grado ${res.grupoNombre}` : 'Dirección Institucional');
          this.grupoNombre.set(res.grupoNombre || '');
          this.rolUsuario.set(this.auth.rol() || 'Director');
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(mensajeError(err));
          this.cargando.set(false);
        }
      });
      return;
    }

    this.api.obtenerMiHorario().subscribe({
      next: (res) => {
        this.clases.set(res.clases || []);
        this.usuarioNombre.set(res.usuarioNombre || this.auth.sesion()?.nombre || '');
        this.grupoNombre.set(res.grupoNombre || '');
        this.rolUsuario.set(res.rol || this.auth.rol() || '');
        if (res.grupoId) {
          this.cursoSeleccionadoId.set(res.grupoId);
          if (this.esDirector()) this.cargarMateriasDelCurso(res.grupoId);
        }
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      }
    });
  }

  seleccionarCurso(grupoId: number): void {
    this.cursoSeleccionadoId.set(grupoId);
    this.cargarHorario();
  }

  clasesPorDia(diaNum: number): HorarioClaseItem[] {
    return this.clases().filter(c => c.diaSemana === diaNum);
  }

  esClaseEnCurso(diaNum: number, inicio: string, fin: string): boolean {
    if (this.diaHoy() !== diaNum) return false;
    const actual = this.horaActualStr();
    return actual >= inicio && actual <= fin;
  }

  nombreDia(diaNum: number): string {
    const d = this.diasBase.find(x => x.num === diaNum);
    return d ? d.nombre : 'Día';
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

  // =========================================================================
  // GESTIÓN DE HORARIOS DESDE DIRECCIÓN (CREAR, EDITAR, ELIMINAR)
  // =========================================================================
  abrirModalCrear(): void {
    this.modalError.set('');
    this.formMateriaId = 0;
    this.formProfesorId = 0;
    this.formProfesorNombre.set('');
    this.formDiaSemana = this.diaHoy() || 1;
    this.formFranjaPredefinida = '07:00-08:30';
    this.formHoraInicio = '07:00';
    this.formHoraFin = '08:30';
    this.formAula = '';
    this.formNotas = '';
    this.mostrarModalCrear.set(true);

    const gId = this.cursoSeleccionadoId();
    if (gId && this.materiasDelCurso().length === 0) {
      this.cargarMateriasDelCurso(gId);
    }
  }

  cerrarModalCrear(event?: MouseEvent): void {
    if (!event || event.target === event.currentTarget) {
      this.mostrarModalCrear.set(false);
    }
  }

  alSeleccionarMateriaCrear(materiaId: number): void {
    const mat = this.materiasDelCurso().find(m => m.materiaId === materiaId);
    if (mat) {
      this.formProfesorId = mat.profesorId;
      this.formProfesorNombre.set(mat.profesorNombre);
    } else {
      this.formProfesorId = 0;
      this.formProfesorNombre.set('');
    }
  }

  aplicarFranjaCrear(franja: string): void {
    if (!franja) return;
    const [ini, fin] = franja.split('-');
    if (ini && fin) {
      this.formHoraInicio = ini;
      this.formHoraFin = fin;
    }
  }

  guardarNuevoHorario(): void {
    this.modalError.set('');
    const gId = this.cursoSeleccionadoId();
    if (!gId) {
      this.modalError.set('Selecciona un grado escolar para programar.');
      return;
    }
    if (!this.formMateriaId) {
      this.modalError.set('Debes seleccionar la materia a dictar.');
      return;
    }
    if (!this.formHoraInicio || !this.formHoraFin) {
      this.modalError.set('Indica la hora de inicio y fin.');
      return;
    }
    if (this.formHoraInicio >= this.formHoraFin) {
      this.modalError.set('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    this.guardando.set(true);
    const body: CrearHorarioRequest = {
      grupoId: gId,
      materiaId: this.formMateriaId,
      profesorId: this.formProfesorId > 0 ? this.formProfesorId : undefined,
      diaSemana: this.formDiaSemana,
      horaInicio: this.formHoraInicio,
      horaFin: this.formHoraFin,
      aula: this.formAula.trim() || undefined,
      notas: this.formNotas.trim() || undefined
    };

    this.api.directorCrearHorario(body).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.mostrarModalCrear.set(false);
        this.aviso.set(res.mensaje || 'Clase programada exitosamente.');
        this.cargarHorario();
        setTimeout(() => this.aviso.set(''), 5000);
      },
      error: (err) => {
        this.guardando.set(false);
        this.modalError.set(mensajeError(err));
      }
    });
  }

  abrirModalEditar(clase: HorarioClaseItem): void {
    this.modalError.set('');
    this.editClaseId = clase.id;
    this.editGrupoId = clase.grupoId;
    this.editGrupoNombre = clase.grupoNombre;
    this.editMateriaId = clase.materiaId;
    this.editProfesorId = clase.profesorId;
    this.editProfesorNombre = clase.profesorNombre;
    this.editDiaSemana = clase.diaSemana;
    this.editHoraInicio = clase.horaInicio;
    this.editHoraFin = clase.horaFin;
    this.editAula = clase.aula || '';
    this.editNotas = clase.notas || '';

    // Asegurar materias del curso
    this.cargarMateriasDelCurso(clase.grupoId);
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(event?: MouseEvent): void {
    if (!event || event.target === event.currentTarget) {
      this.mostrarModalEditar.set(false);
    }
  }

  alSeleccionarMateriaEditar(materiaId: number): void {
    const mat = this.materiasDelCurso().find(m => m.materiaId === materiaId);
    if (mat) {
      this.editProfesorId = mat.profesorId;
      this.editProfesorNombre = mat.profesorNombre;
    }
  }

  aplicarFranjaEditar(event: Event): void {
    const franja = (event.target as HTMLSelectElement).value;
    if (!franja) return;
    const [ini, fin] = franja.split('-');
    if (ini && fin) {
      this.editHoraInicio = ini;
      this.editHoraFin = fin;
    }
  }

  guardarEdicionHorario(): void {
    this.modalError.set('');
    if (!this.editMateriaId) {
      this.modalError.set('Selecciona la materia.');
      return;
    }
    if (!this.editHoraInicio || !this.editHoraFin) {
      this.modalError.set('Indica hora de inicio y fin.');
      return;
    }
    if (this.editHoraInicio >= this.editHoraFin) {
      this.modalError.set('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    this.editando.set(true);
    const body: CrearHorarioRequest = {
      grupoId: this.editGrupoId,
      materiaId: this.editMateriaId,
      profesorId: this.editProfesorId > 0 ? this.editProfesorId : undefined,
      diaSemana: this.editDiaSemana,
      horaInicio: this.editHoraInicio,
      horaFin: this.editHoraFin,
      aula: this.editAula.trim() || undefined,
      notas: this.editNotas.trim() || undefined
    };

    this.api.directorActualizarHorario(this.editClaseId, body).subscribe({
      next: (res) => {
        this.editando.set(false);
        this.mostrarModalEditar.set(false);
        this.aviso.set(res.mensaje || 'Horario actualizado exitosamente.');
        this.cargarHorario();
        setTimeout(() => this.aviso.set(''), 5000);
      },
      error: (err) => {
        this.editando.set(false);
        this.modalError.set(mensajeError(err));
      }
    });
  }

  confirmarEliminar(clase: HorarioClaseItem): void {
    const txt = `¿Eliminar la clase de ${clase.materiaNombre} del ${clase.diaNombre} (${clase.horaInicio} - ${clase.horaFin}) en el grado ${clase.grupoNombre}?`;
    if (!confirm(txt)) return;

    this.api.directorEliminarHorario(clase.id).subscribe({
      next: (res) => {
        this.aviso.set(res.mensaje || 'Clase eliminada del horario con éxito.');
        this.cargarHorario();
        setTimeout(() => this.aviso.set(''), 4000);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        setTimeout(() => this.error.set(''), 5000);
      }
    });
  }

  imprimirHorario(): void {
    window.print();
  }
}
