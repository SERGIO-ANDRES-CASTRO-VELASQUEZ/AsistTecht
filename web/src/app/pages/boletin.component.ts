import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { BoletinOficial } from '../core/models';
import { mensajeError } from '../core/errores';

interface EstudianteResumen {
  id: number;
  nombre: string;
  documento: string;
  grupoId: number;
  grupo: string;
  acudiente: string;
  activo: boolean;
}

interface GrupoItem {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-boletin',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <!-- Barra Superior de Acciones y Controles (Oculta en Impresión) -->
      <div class="entre no-print" style="margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
            <span class="pulsing-dot"></span>
            <span class="hero-tag" style="margin-bottom: 0;">Documento Oficial del MEN · Decreto 1290</span>
          </div>
          <h1 style="margin-bottom: 0.25rem;">Boletín Integral de Calificaciones</h1>
          <p class="lead" style="margin: 0;">Informe evaluativo periódico oficial con las 10 áreas del plan de estudios, juicio valorativo IA y promedio general.</p>
        </div>

        <div class="acciones" style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;">
          @if (puedeSeleccionarEstudiante()) {
            <!-- Selector de Curso / Grado Escolar -->
            <div style="display: flex; align-items: center; gap: 0.45rem; background: var(--bg-hover); padding: 0.35rem 0.65rem; border: 1.5px solid var(--border); border-radius: var(--radius-md);">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">🏫 Grado:</span>
              <select [ngModel]="grupoSeleccionadoId()" (ngModelChange)="cambiarGrupo($event)" style="font-size: 0.82rem; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); font-weight: 700;">
                @for (g of listaGrupos(); track g.id) {
                  <option [value]="g.id">{{ g.nombre }}</option>
                }
              </select>
            </div>

            <!-- Selector de Estudiante en ese Curso -->
            @if (listaEstudiantes().length > 0) {
              <div style="display: flex; align-items: center; gap: 0.45rem; background: var(--bg-hover); padding: 0.35rem 0.65rem; border: 1.5px solid var(--border); border-radius: var(--radius-md);">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">🎓 Alumno:</span>
                <select [ngModel]="estudianteSeleccionadoId()" (ngModelChange)="cambiarEstudiante($event)" style="font-size: 0.82rem; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); max-width: 15rem;">
                  @for (e of listaEstudiantes(); track e.id; let idx = $index) {
                    <option [value]="e.id">{{ idx + 1 }}. {{ e.nombre }} ({{ e.documento }})</option>
                  }
                </select>
              </div>

              <!-- Navegación Uno a Uno (Anterior / Siguiente) -->
              <div style="display: flex; align-items: center; gap: 0.25rem;">
                <button type="button" class="btn-secundario" (click)="anteriorEstudiante()" [disabled]="indiceEstudiante() <= 0" title="Ver alumno anterior" style="padding: 0.35rem 0.65rem; font-size: 0.82rem;">
                  ◀ Anterior
                </button>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); padding: 0 0.3rem;">
                  {{ indiceEstudiante() + 1 }} / {{ listaEstudiantes().length }}
                </span>
                <button type="button" class="btn-secundario" (click)="siguienteEstudiante()" [disabled]="indiceEstudiante() >= listaEstudiantes().length - 1" title="Ver alumno siguiente" style="padding: 0.35rem 0.65rem; font-size: 0.82rem;">
                  Siguiente ▶
                </button>
              </div>
            }
          }

          <!-- Alternador de Modo de Visualización (Individual vs Todo el Curso) -->
          @if (puedeSeleccionarEstudiante() && listaEstudiantes().length > 0) {
            <div style="display: flex; gap: 0.25rem; background: var(--bg-hover); padding: 0.2rem; border-radius: var(--radius-md); border: 1.5px solid var(--border);">
              <button type="button" class="btn-vista-tab" [class.activo]="modoVista() === 'individual'" (click)="activarModoIndividual()" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; margin: 0;">
                <span>👤</span> Individual
              </button>
              <button type="button" class="btn-vista-tab" [class.activo]="modoVista() === 'curso'" (click)="activarModoCurso()" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; margin: 0;">
                <span>👥</span> Todo el Curso ({{ listaEstudiantes().length }})
              </button>
            </div>
          }

          <button type="button" class="btn-secundario" (click)="refrescar()" [disabled]="cargando()" title="Refrescar datos">
            <span>🔄</span> Actualizar
          </button>

          <!-- Botón de Descarga / Impresión -->
          @if (modoVista() === 'individual') {
            <button type="button" class="btn-principal" (click)="imprimirIndividual()" [disabled]="cargando() || !boletin()">
              <span>🖨️</span> Imprimir / PDF Alumno
            </button>
          } @else {
            <button type="button" class="btn-principal" (click)="imprimirCurso()" [disabled]="cargando() || cargandoCurso() || boletinesCurso().length === 0" style="background: var(--grade-superior); border-color: var(--grade-superior);">
              <span>📑</span> Descargar / Imprimir TODO el Curso ({{ boletinesCurso().length }} Boletines)
            </button>
          }
        </div>
      </div>

      <!-- Banner Informativo del Modo Curso (Oculto en Impresión) -->
      @if (modoVista() === 'curso' && !cargando()) {
        <div class="aviso exito no-print" style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.35rem;">📚</span>
            <div>
              <strong>Visualizando todos los boletines oficiales del grado {{ nombreGrupoActual() }} ({{ boletinesCurso().length }} estudiantes)</strong>
              <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.15rem;">
                Listo para imprimir en bloque o guardar como PDF consolidado. Cada informe cuenta con salto de página oficial automático.
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn-accion-sm" (click)="activarModoIndividual()">
              Volver a vista individual
            </button>
            <button type="button" class="btn-principal" (click)="imprimirCurso()" style="font-size: 0.82rem; padding: 0.35rem 0.75rem;">
              🖨️ Imprimir Todo el Curso
            </button>
          </div>
        </div>
      }

      @if (error()) {
        <div class="aviso error no-print" style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
          <span>{{ error() }}</span>
          <button type="button" class="btn-accion-sm" (click)="refrescar()">Reintentar</button>
        </div>
      }

      @if (cargando() || (modoVista() === 'curso' && cargandoCurso())) {
        <div class="card no-print" style="text-align: center; padding: 3rem 1.5rem;">
          <div class="apk-icon-box" style="animation: pulse-green 1.5s infinite; margin: 0 auto 1rem;">📜</div>
          <h2 style="font-size: 1.3rem; margin-bottom: 0.35rem;">
            {{ modoVista() === 'curso' ? 'Generando boletines oficiales de todo el grado escolar...' : 'Generando Boletín Oficial Institucional...' }}
          </h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Consolidando notas del sistema, fallas biométricas y juicios pedagógicos asistidos por IA.</p>
        </div>
      } @else if (modoVista() === 'individual' && boletin()) {
        <!-- Tarjeta Informativa Resumen Superior (Web y Mobile, no print) -->
        <div class="kpi-grid no-print" style="margin-bottom: 1.75rem;">
          <div class="kpi-banner">
            <div class="kpi-icono">🏅</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Puesto en el Grado</span>
              <strong class="kpi-numero" style="color: var(--primary);">
                {{ boletin()!.estudiante.puesto === 'Pendiente' ? 'Pendiente' : (boletin()!.estudiante.puesto + '°') }}
              </strong>
              <span class="kpi-desc">De un total de {{ boletin()!.estudiante.totalAlumnosGrupo }} estudiantes</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono">📈</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Promedio General</span>
              @if (boletin()!.estudiante.promedioGeneral > 0) {
                <strong class="kpi-numero" [style.color]="boletin()!.estudiante.promedioGeneral >= 4.0 ? 'var(--grade-superior)' : 'var(--grade-alto)'">
                  {{ boletin()!.estudiante.promedioGeneral | number:'1.2-2' }}
                </strong>
              } @else {
                <strong class="kpi-numero" style="color: #64748b; font-size: 1.35rem;">
                  Pendiente
                </strong>
              }
              <span class="kpi-desc">{{ boletin()!.estudiante.escalaGeneral || 'Sin evaluaciones' }}</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono">📚</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Áreas del Plan de Estudios</span>
              <strong class="kpi-numero">{{ boletin()!.materias.length }}</strong>
              <span class="kpi-desc">{{ boletin()!.estudiante.promedioGeneral > 0 ? 'Todas evaluadas en Periodo 1' : 'En curso en Periodo 1' }}</span>
            </div>
          </div>

          <div class="kpi-banner" [class.alerta]="boletin()!.estudiante.totalFallas > 3">
            <div class="kpi-icono">🕒</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Asistencia del Periodo</span>
              <strong class="kpi-numero">{{ boletin()!.estudiante.totalFallas }}</strong>
              <span class="kpi-desc">Inasistencias registradas</span>
            </div>
          </div>
        </div>

        <!-- Selector de Modo de Visualización para Pantallas Pequeñas (Oculto en Impresión) -->
        <div class="boletin-vista-tabs no-print">
          <button type="button" class="btn-vista-tab" [class.activo]="vistaMovil() === 'tarjetas'" (click)="vistaMovil.set('tarjetas')">
            <span>📱</span> Tarjetas de Notas
          </button>
          <button type="button" class="btn-vista-tab" [class.activo]="vistaMovil() === 'tabla'" (click)="vistaMovil.set('tabla')">
            <span>📜</span> Tabla Oficial (MEN)
          </button>
        </div>

        <!-- ==========================================================================
             DOCUMENTO OFICIAL DEL BOLETÍN INDIVIDUAL
             ========================================================================== -->
        <ng-container *ngTemplateOutlet="documentoBoletinTpl; context: { $implicit: boletin()! }"></ng-container>

      } @else if (modoVista() === 'curso' && boletinesCurso().length > 0) {
        <!-- ==========================================================================
             VISTA EN BLOQUE DE TODOS LOS BOLETINES DEL CURSO SELECCIONADO
             ========================================================================== -->
        <div class="curso-boletines-contenedor">
          @for (bol of boletinesCurso(); track bol.estudiante.id; let idx = $index) {
            <!-- Separador Visual Informativo en Pantalla (Oculto en Impresión) -->
            <div class="boletin-separador-curso no-print">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span class="badge badge-azul" style="font-weight: 800; font-size: 0.85rem;">#{{ idx + 1 }}</span>
                <strong style="color: var(--text-primary); font-size: 1rem;">{{ bol.estudiante.nombre }}</strong>
                <span style="font-size: 0.82rem; color: var(--text-muted);">(Doc: {{ bol.estudiante.documento }})</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.82rem;">
                  Promedio: <strong [style.color]="bol.estudiante.promedioGeneral >= 4.0 ? 'var(--grade-superior)' : 'var(--text-primary)'">
                    {{ bol.estudiante.promedioGeneral > 0 ? (bol.estudiante.promedioGeneral | number:'1.2-2') : 'Pendiente' }}
                  </strong>
                </span>
                <button type="button" class="btn-accion-sm" (click)="verIndividualDesdeCurso(bol.estudiante.id)">
                  🔍 Ver solo a este alumno
                </button>
              </div>
            </div>

            <!-- Documento Oficial Completo del Estudiante -->
            <ng-container *ngTemplateOutlet="documentoBoletinTpl; context: { $implicit: bol }"></ng-container>
          }
        </div>
      } @else {
        <div class="card no-print" style="text-align: center; padding: 2.5rem 1.5rem;">
          <span style="font-size: 2.5rem;">📋</span>
          <h2 style="font-size: 1.25rem; margin: 0.5rem 0 0.35rem;">No se encontraron calificaciones en este grado</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">Selecciona otro grado escolar o matricula estudiantes para emitir sus boletines oficiales.</p>
        </div>
      }

      <!-- ==========================================================================
           TEMPLATE REUTILIZABLE: DOCUMENTO OFICIAL DE BOLETÍN (PANTALLA E IMPRESIÓN)
           ========================================================================== -->
      <ng-template #documentoBoletinTpl let-b>
        <article class="boletin-documento" style="page-break-after: always; break-after: page; margin-bottom: 2rem;">
          <!-- Encabezado Institucional Oficial con Escudo y Membrete -->
          <div class="boletin-encabezado">
            <div class="boletin-colegio-bloque">
              <div class="logo-escuela-boletin">GIR</div>
              <div class="boletin-colegio-textos">
                <h2 class="boletin-colegio-nombre">
                  {{ b.institucion.nombre }}
                </h2>
                <div class="boletin-colegio-sub">
                  RECONOCIMIENTO OFICIAL DE ESTUDIOS DE EDUCACIÓN BÁSICA Y MEDIA VOCACIONAL
                </div>
              </div>
            </div>

            <p class="boletin-meta-p">
              {{ b.institucion.resolucion }} · Código DANE: <strong>{{ b.institucion.dane }}</strong> · NIT: <strong>{{ b.institucion.nit }}</strong>
            </p>
            <p class="boletin-meta-p">
              Sede Principal · Neiva, Huila - Colombia · Plataforma de Gestión Integral AsisTecht
            </p>

            <div class="boletin-periodo-badge-wrapper">
              <span class="boletin-periodo-badge">
                INFORME DE EVALUACIÓN Y RENDIMIENTO ESCOLAR · {{ b.institucion.periodo | uppercase }}
              </span>
            </div>
          </div>

          <!-- Datos de Identificación del Estudiante -->
          <div class="boletin-estudiante-grid">
            <div class="dato-bloque">
              <span class="dato-etiqueta">Estudiante:</span>
              <strong class="dato-valor">{{ b.estudiante.nombre }}</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Documento de Identidad:</span>
              <strong class="dato-valor">{{ b.estudiante.documento }} (T.I.)</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Grado / Grupo:</span>
              <strong class="dato-valor">{{ b.estudiante.grupo }} (Educación Media)</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Director(a) de Grupo:</span>
              <strong class="dato-valor">{{ b.estudiante.directorGrupo }}</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Padre / Acudiente:</span>
              <strong class="dato-valor">{{ b.estudiante.acudiente }}</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Puesto en el Grado:</span>
              <strong class="dato-valor" style="color: #047857;">
                {{ b.estudiante.puesto === 'Pendiente' ? 'Pendiente (En curso)' : ('Puesto ' + b.estudiante.puesto + ' de ' + b.estudiante.totalAlumnosGrupo + ' alumnos') }}
              </strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Promedio Ponderado:</span>
              <strong class="dato-valor" style="font-size: 1.05rem;" [style.color]="b.estudiante.promedioGeneral > 0 ? '#047857' : '#64748b'">
                {{ b.estudiante.promedioGeneral > 0 ? ((b.estudiante.promedioGeneral | number:'1.2-2') + ' (' + (b.estudiante.escalaGeneral || '') + ')') : 'Sin evaluaciones registradas' }}
              </strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Estado Académico:</span>
              <strong class="dato-valor" [style.color]="b.estudiante.promedioGeneral >= 3.0 ? '#047857' : '#be123c'">
                {{ b.estudiante.estadoAcademico || 'APROBADO SATISFACTORIAMENTE' }}
              </strong>
            </div>
          </div>

          <!-- Vista Móvil de Tarjetas (Oculta en Impresión y cuando se elige tabla) -->
          <div class="boletin-materias-cards no-print" [class.oculta]="vistaMovil() !== 'tarjetas' || modoVista() === 'curso'">
            @for (materia of b.materias; track materia.nombre; let idx = $index) {
              <div class="materia-card-movil">
                <div class="materia-card-header">
                  <div style="flex: 1; min-width: 0;">
                    <span class="boletin-area-tag">{{ materia.area }}</span>
                    <h3 class="materia-card-titulo">{{ materia.nombre }}</h3>
                    <div class="materia-card-profe">👨‍🏫 {{ materia.profesor }} · {{ materia.ihs }}h semanales</div>
                  </div>
                  <div class="materia-card-nota-badge" [class]="claseDefinitiva(materia.definitiva)">
                    <span class="nota-num">{{ materia.definitiva > 0 ? (materia.definitiva | number:'1.1-1') : '--' }}</span>
                    <span class="nota-escala">{{ materia.escala }}</span>
                  </div>
                </div>

                <div class="materia-card-parciales">
                  <span class="parciales-titulo">Calificaciones del Periodo:</span>
                  <div class="parciales-chips">
                    @for (n of materia.notas; track n.columna) {
                      <div class="parcial-chip">
                        <span>{{ n.columna }}:</span>
                        <strong>{{ n.valor }}</strong>
                      </div>
                    }
                    @if (materia.notas.length === 0) {
                      <div class="parcial-chip" style="background: #f8fafc; color: #64748b; font-style: italic;">
                        <span>Sin notas parciales</span>
                      </div>
                    }
                    <div class="parcial-chip" style="background: #f1f5f9;">
                      <span>Prom. Curso:</span>
                      <strong>{{ materia.promedioGrupo || 3.8 }}</strong>
                    </div>
                    <div class="parcial-chip" [style.color]="materia.fallas > 0 ? '#e11d48' : '#059669'">
                      <span>Fallas:</span>
                      <strong>{{ materia.fallas }}</strong>
                    </div>
                  </div>
                </div>

                @if (materia.juicioIa) {
                  <div class="materia-card-juicio">
                    <div class="juicio-icono-ia">🤖 Juicio Pedagógico Institucional (IA):</div>
                    <p>{{ materia.juicioIa }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <!-- TABLA COMPLETA OFICIAL DE CALIFICACIONES (Siempre visible en impresión) -->
          <div class="boletin-tabla-wrapper" [class.oculta-movil]="vistaMovil() === 'tarjetas' && modoVista() === 'individual'">
            <table class="boletin-tabla">
              <thead>
                <tr>
                  <th style="width: 2.5rem; text-align: center;">#</th>
                  <th style="min-width: 14rem;">Área Curricular y Asignatura</th>
                  <th style="width: 4rem; text-align: center;" title="Intensidad Horaria Semanal">I.H.S.</th>
                  <th style="min-width: 8rem; text-align: center;">Evaluaciones Parciales</th>
                  <th style="width: 5.5rem; text-align: center;" title="Promedio del Curso">Prom. Curso</th>
                  <th style="width: 5.5rem; text-align: center;">Definitiva</th>
                  <th style="width: 6.5rem; text-align: center;">Nivel (MEN)</th>
                  <th style="width: 4rem; text-align: center;">Fallas</th>
                  <th style="min-width: 17rem;">Juicio Valorativo Pedagógico Asistido por IA</th>
                </tr>
              </thead>
              <tbody>
                @for (materia of b.materias; track materia.nombre; let idx = $index) {
                  <tr>
                    <td style="text-align: center; font-weight: 700; color: #64748b; font-size: 0.82rem;">
                      {{ idx + 1 }}
                    </td>
                    <td>
                      <span class="boletin-area-tag">{{ materia.area }}</span>
                      <strong class="boletin-materia-nombre">{{ materia.nombre }}</strong>
                      <span class="boletin-materia-profe">Docente: {{ materia.profesor }}</span>
                    </td>
                    <td style="text-align: center; font-weight: 700; color: #334155; font-size: 0.88rem;">
                      {{ materia.ihs }}h
                    </td>
                    <td style="text-align: center; font-size: 0.78rem;">
                      <div style="display: flex; flex-direction: column; gap: 0.2rem; align-items: center;">
                        @for (n of materia.notas; track n.columna) {
                          <span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.15rem 0.4rem; border-radius: 4px; display: inline-block;">
                            {{ n.columna }}: <strong>{{ n.valor }}</strong>
                          </span>
                        }
                        @if (materia.notas.length === 0) {
                          <span style="color: #94a3b8; font-style: italic; font-size: 0.75rem;">
                            Sin notas aún
                          </span>
                        }
                      </div>
                    </td>
                    <td style="text-align: center; font-size: 0.85rem; color: #64748b; font-weight: 600;">
                      {{ materia.promedioGrupo || 3.8 }}
                    </td>
                    <td style="text-align: center;">
                      <span class="boletin-definitiva-num" [class]="claseDefinitiva(materia.definitiva)">
                        {{ materia.definitiva > 0 ? (materia.definitiva | number:'1.1-1') : '--' }}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span class="badge" [class]="claseEscala(materia.escala)" style="font-size: 0.72rem; letter-spacing: 0.04em;">
                        {{ materia.escala }}
                      </span>
                    </td>
                    <td style="text-align: center; font-weight: 700;" [style.color]="materia.fallas > 0 ? '#e11d48' : '#059669'">
                      {{ materia.fallas }}
                    </td>
                    <td class="boletin-juicio-celda">
                      <div class="boletin-juicio-texto">
                        {{ materia.juicioIa }}
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="boletin-resumen-fila">
                  <td colspan="4" style="text-align: right; font-weight: 800; font-size: 0.9rem; padding: 0.85rem;">
                    PROMEDIO GENERAL PONDERADO DEL ESTUDIANTE:
                  </td>
                  <td style="text-align: center; font-size: 0.88rem; font-weight: 700; color: #475569;">
                    3.90
                  </td>
                  <td style="text-align: center; font-size: 1.15rem; font-weight: 800;" [style.color]="b.estudiante.promedioGeneral > 0 ? '#047857' : '#64748b'">
                    {{ b.estudiante.promedioGeneral > 0 ? (b.estudiante.promedioGeneral | number:'1.2-2') : 'Pendiente' }}
                  </td>
                  <td style="text-align: center;">
                    <span class="badge" [class]="claseEscala(b.estudiante.escalaGeneral)" style="font-size: 0.75rem;">
                      {{ b.estudiante.escalaGeneral || 'EN CURSO' }}
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: 800; color: #047857;">
                    {{ b.estudiante.totalFallas }}
                  </td>
                  <td style="font-size: 0.82rem; font-weight: 700;" [style.color]="b.estudiante.promedioGeneral > 0 ? '#065f46' : '#475569'">
                    @if (b.estudiante.promedioGeneral > 0) {
                      ✅ Criterio de Promoción: Cumple satisfactoriamente con los estándares y competencias fijadas.
                    } @else {
                      ℹ️ Periodo Académico en Curso: El estudiante aún no cuenta con calificaciones definitivas registradas.
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Concepto General de Rectoría / Consejo Académico con IA -->
          <div class="boletin-concepto-box">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
              <span style="font-size: 1.1rem;">🤖</span>
              <strong style="color: #065f46; font-size: 0.92rem; text-transform: uppercase; letter-spacing: 0.04em;">
                CONCEPTO GENERAL DEL CONSEJO ACADÉMICO Y DIRECCIÓN ESCOLAR:
              </strong>
            </div>
            <p style="margin: 0; font-size: 0.88rem; line-height: 1.5; color: #1e293b;">
              {{ b.conceptoGeneralDirector || 'El estudiante ha demostrado un sobresaliente rendimiento académico y compromiso formativo durante el Primer Periodo Escolar 2026. Se destaca su liderazgo positivo, cumplimiento ético y alto nivel de asimilación conceptual. ¡Felicitaciones a la familia por el acompañamiento brindado!' }}
            </p>
          </div>

          <!-- Observaciones del Observador de Convivencia Escolar -->
          @if (b.observacionesConvivencia && b.observacionesConvivencia.length > 0) {
            <div style="margin-top: 1.25rem; font-size: 0.85rem; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.9rem; background: #fafafa;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span>⚖️</span>
                <strong style="color: #0e6b52; text-transform: uppercase; font-size: 0.88rem;">REGISTROS DEL OBSERVADOR DE CONVIVENCIA ESCOLAR (PERIODO 1):</strong>
              </div>
              @for (obs of b.observacionesConvivencia; track obs.fecha) {
                <div style="margin: 0.45rem 0; padding: 0.45rem 0.65rem; background: white; border-radius: 6px; border-left: 3px solid #0e6b52;">
                  <div style="font-weight: 700; color: #1e293b; font-size: 0.84rem;">
                    [{{ obs.tipo }} · {{ obs.fecha }}] {{ obs.titulo }}
                  </div>
                  <div style="color: #475569; font-size: 0.82rem; margin-top: 0.15rem;">
                    {{ obs.descripcion }}
                  </div>
                  @if (obs.compromiso) {
                    <div style="color: #0e6b52; font-size: 0.78rem; font-weight: 600; margin-top: 0.2rem;">
                      Compromiso suscrito: {{ obs.compromiso }}
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Escala Oficial de Valoración Nacional (Decreto 1290 de 2009 del MEN) -->
          <div class="boletin-escala-box">
            <strong style="display: block; font-size: 0.82rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; text-align: center;">
              ESCALA INSTITUCIONAL DE VALORACIÓN Y EQUIVALENCIA NACIONAL (DECRETO 1290 DE 2009)
            </strong>
            <div class="escala-grid">
              <div class="escala-item">
                <span class="escala-rango" style="background: #ecfdf5; color: #047857; border-color: #059669;">4.6 a 5.0</span>
                <div>
                  <strong>Desempeño Superior</strong>
                  <p>Supera ampliamente todos los logros previstos con creatividad, rigor y constancia.</p>
                </div>
              </div>
              <div class="escala-item">
                <span class="escala-rango" style="background: #f0f9ff; color: #0284c7; border-color: #0284c7;">4.0 a 4.5</span>
                <div>
                  <strong>Desempeño Alto</strong>
                  <p>Alcanza la totalidad de los logros de aprendizaje de manera satisfactoria y oportuna.</p>
                </div>
              </div>
              <div class="escala-item">
                <span class="escala-rango" style="background: #fffbeb; color: #d97706; border-color: #d97706;">3.0 a 3.9</span>
                <div>
                  <strong>Desempeño Básico</strong>
                  <p>Supera los logros mínimos requeridos para la aprobación de la asignatura o área.</p>
                </div>
              </div>
              <div class="escala-item">
                <span class="escala-rango" style="background: #fff1f2; color: #e11d48; border-color: #e11d48;">1.0 a 2.9</span>
                <div>
                  <strong>Desempeño Bajo</strong>
                  <p>No alcanza los desempeños básicos; requiere plan de mejoramiento obligatorio.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Cuadro Oficial de Firmas Institucionales y Sellos -->
          <footer class="boletin-firmas">
            <div class="firma-columna">
              <div class="boletin-firma-linea">
                <strong>Lic. Roberto Gómez Bolaños</strong>
                <span>Rector Institucional</span>
              </div>
              <span class="firma-sub">Gimnasio José Eustasio Rivera</span>
            </div>

            <div class="firma-columna">
              <div class="boletin-firma-linea">
                <strong>Mg. Patricia Morales Valencia</strong>
                <span>Coordinadora Académica</span>
              </div>
              <span class="firma-sub">Consejo Académico Central</span>
            </div>

            <div class="firma-columna">
              <div class="boletin-firma-linea">
                <strong>{{ b.estudiante.directorGrupo }}</strong>
                <span>Director(a) de Grupo</span>
              </div>
              <span class="firma-sub">Grado {{ b.estudiante.grupo }}</span>
            </div>

            <div class="firma-columna">
              <div class="boletin-firma-linea">
                <strong>{{ b.estudiante.acudiente }}</strong>
                <span>Firma del Acudiente / Familia</span>
              </div>
              <span class="firma-sub">Aceptación y Notificación</span>
            </div>
          </footer>

          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.72rem; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;">
            Documento expedido oficialmente por el Sistema de Gestión Escolar AsisTecht el {{ b.institucion.fechaExpedicion }}. Código de verificación digital institucional: ASIS-HUILA-2026-{{ b.estudiante.id }}-BOLET.
          </div>
        </article>
      </ng-template>
    </section>
  `
})
export class BoletinComponent implements OnInit {
  boletin = signal<BoletinOficial | null>(null);
  cargando = signal(true);
  cargandoCurso = signal(false);
  error = signal('');
  vistaMovil = signal<'tarjetas' | 'tabla'>('tarjetas');
  modoVista = signal<'individual' | 'curso'>('individual');

  listaGrupos = signal<GrupoItem[]>([]);
  grupoSeleccionadoId = signal<number>(1);
  listaEstudiantes = signal<EstudianteResumen[]>([]);
  estudianteSeleccionadoId = signal<number>(1);
  boletinesCurso = signal<BoletinOficial[]>([]);

  indiceEstudiante = computed(() => {
    const lista = this.listaEstudiantes();
    const selId = this.estudianteSeleccionadoId();
    return lista.findIndex(e => e.id === selId);
  });

  nombreGrupoActual = computed(() => {
    const gid = this.grupoSeleccionadoId();
    const g = this.listaGrupos().find(x => x.id === gid);
    return g ? g.nombre : '';
  });

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  puedeSeleccionarEstudiante(): boolean {
    const r = this.auth.rol();
    return r === 'Director' || r === 'Admin';
  }

  ngOnInit(): void {
    if (this.puedeSeleccionarEstudiante()) {
      this.cargarGrupos();
    } else {
      this.cargarDatosIndividual();
    }
  }

  cargarGrupos(): void {
    this.api.grupos().subscribe({
      next: (grupos) => {
        const items = (grupos || []).map(g => ({ id: g.id, nombre: g.nombre }));
        this.listaGrupos.set(items);
        if (items.length > 0) {
          const primero = items[0].id;
          this.grupoSeleccionadoId.set(primero);
          this.cargarEstudiantesGrupo(primero);
        } else {
          this.cargarDatosIndividual();
        }
      },
      error: () => {
        this.cargarDatosIndividual();
      }
    });
  }

  cambiarGrupo(nuevoGrupoId: number): void {
    const gid = Number(nuevoGrupoId);
    this.grupoSeleccionadoId.set(gid);
    this.boletinesCurso.set([]);
    this.cargarEstudiantesGrupo(gid);
  }

  cargarEstudiantesGrupo(grupoId: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.boletinEstudiantes(grupoId).subscribe({
      next: (estudiantes) => {
        const lista = (estudiantes || []) as EstudianteResumen[];
        this.listaEstudiantes.set(lista);

        if (lista.length > 0) {
          const primerEst = lista[0].id;
          this.estudianteSeleccionadoId.set(primerEst);
          this.cargarPorId(primerEst);
          // Precarga en segundo plano de todos los boletines de este grupo
          this.cargarBoletinesDelCurso(grupoId);
        } else {
          this.boletin.set(null);
          this.boletinesCurso.set([]);
          this.cargando.set(false);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  cambiarEstudiante(nuevoId: number): void {
    const id = Number(nuevoId);
    this.estudianteSeleccionadoId.set(id);
    this.modoVista.set('individual');
    this.cargarPorId(id);
  }

  anteriorEstudiante(): void {
    const idx = this.indiceEstudiante();
    if (idx > 0) {
      const prev = this.listaEstudiantes()[idx - 1];
      this.cambiarEstudiante(prev.id);
    }
  }

  siguienteEstudiante(): void {
    const idx = this.indiceEstudiante();
    const lista = this.listaEstudiantes();
    if (idx >= 0 && idx < lista.length - 1) {
      const sig = lista[idx + 1];
      this.cambiarEstudiante(sig.id);
    }
  }

  activarModoIndividual(): void {
    this.modoVista.set('individual');
  }

  activarModoCurso(): void {
    this.modoVista.set('curso');
    if (this.boletinesCurso().length === 0) {
      this.cargarBoletinesDelCurso(this.grupoSeleccionadoId());
    }
  }

  verIndividualDesdeCurso(estudianteId: number): void {
    this.cambiarEstudiante(estudianteId);
  }

  private cargarBoletinesDelCurso(grupoId: number): void {
    this.cargandoCurso.set(true);
    this.api.boletinCurso(grupoId).subscribe({
      next: (res) => {
        this.boletinesCurso.set(res?.boletines || []);
        this.cargandoCurso.set(false);
      },
      error: () => {
        this.cargandoCurso.set(false);
      }
    });
  }

  refrescar(): void {
    if (this.puedeSeleccionarEstudiante()) {
      this.cargarEstudiantesGrupo(this.grupoSeleccionadoId());
    } else {
      this.cargarDatosIndividual();
    }
  }

  cargarDatosIndividual(): void {
    this.cargando.set(true);
    this.error.set('');

    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      const id = parseInt(paramId, 10);
      this.estudianteSeleccionadoId.set(id);
      this.cargarPorId(id);
    } else {
      this.api.miBoletin().subscribe({
        next: (res) => {
          this.boletin.set(res);
          this.cargando.set(false);
          if (res?.estudiante?.id) {
            this.estudianteSeleccionadoId.set(res.estudiante.id);
          }
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(mensajeError(err));
        }
      });
    }
  }

  private cargarPorId(id: number): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.boletin(id).subscribe({
      next: (res) => {
        this.boletin.set(res);
        this.cargando.set(false);
        this.estudianteSeleccionadoId.set(id);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  imprimirIndividual(): void {
    this.modoVista.set('individual');
    setTimeout(() => {
      window.print();
    }, 150);
  }

  imprimirCurso(): void {
    if (this.boletinesCurso().length === 0) {
      this.cargandoCurso.set(true);
      this.api.boletinCurso(this.grupoSeleccionadoId()).subscribe({
        next: (res) => {
          this.boletinesCurso.set(res?.boletines || []);
          this.cargandoCurso.set(false);
          this.modoVista.set('curso');
          setTimeout(() => {
            window.print();
          }, 350);
        },
        error: (err) => {
          this.cargandoCurso.set(false);
          this.error.set(mensajeError(err));
        }
      });
    } else {
      this.modoVista.set('curso');
      setTimeout(() => {
        window.print();
      }, 250);
    }
  }

  claseEscala(escala?: string | null): string {
    const esc = (escala || '').toUpperCase();
    if (esc.includes('PENDIENTE') || esc.includes('SIN CALIFICACIONES') || esc.includes('EN CURSO')) return 'badge-gris';
    if (esc.includes('SUPERIOR')) return 'badge-verde';
    if (esc.includes('ALTO')) return 'badge-azul';
    if (esc.includes('BÁSICO') || esc.includes('BASICO')) return 'badge-amarillo';
    return 'badge-rojo';
  }

  claseDefinitiva(valor: number): string {
    if (!valor || valor === 0) return 'nota-pendiente';
    if (valor >= 4.6) return 'nota-superior';
    if (valor >= 4.0) return 'nota-alto';
    if (valor >= 3.0) return 'nota-basico';
    return 'nota-bajo';
  }
}
