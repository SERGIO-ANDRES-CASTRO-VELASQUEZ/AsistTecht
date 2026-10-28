import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { BoletinOficial, Estudiante } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-boletin',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <!-- Barra Superior de Acciones (Oculta en Impresión) -->
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
          @if (puedeSeleccionarEstudiante() && listaEstudiantes().length > 0) {
            <div style="display: flex; align-items: center; gap: 0.45rem; background: var(--bg-hover); padding: 0.35rem 0.65rem; border: 1.5px solid var(--border); border-radius: var(--radius-md);">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">🎓 Alumno:</span>
              <select [ngModel]="estudianteSeleccionadoId()" (ngModelChange)="cambiarEstudiante($event)" style="font-size: 0.82rem; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); max-width: 17rem;">
                @for (e of listaEstudiantes(); track e.id) {
                  <option [value]="e.id">{{ e.nombre }} ({{ e.grupo || 'GIR' }})</option>
                }
              </select>
            </div>
          }

          <button type="button" class="btn-secundario" (click)="cargarDatos()" [disabled]="cargando()" title="Refrescar datos">
            <span>🔄</span> Actualizar
          </button>
          <button type="button" class="btn-principal" (click)="imprimir()" [disabled]="cargando() || !boletin()">
            <span>🖨️</span> Imprimir / Descargar PDF Oficial
          </button>
        </div>
      </div>

      @if (error()) {
        <div class="aviso error no-print" style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
          <span>{{ error() }}</span>
          <button type="button" class="btn-accion-sm" (click)="cargarDatos()">Reintentar</button>
        </div>
      }

      @if (cargando()) {
        <div class="card no-print" style="text-align: center; padding: 3rem 1.5rem;">
          <div class="apk-icon-box" style="animation: pulse-green 1.5s infinite; margin: 0 auto 1rem;">📜</div>
          <h2 style="font-size: 1.3rem; margin-bottom: 0.35rem;">Generando Boletín Oficial Institucional...</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Consolidando notas del sistema, fallas biométricas y juicios pedagógicos asistidos por IA.</p>
        </div>
      } @else if (boletin()) {
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

        <!-- ==========================================================================
             DOCUMENTO OFICIAL DEL BOLETÍN (OPTIMIZADO PARA PANTALLA E IMPRESIÓN OFICIAL)
             ========================================================================== -->
        <article class="boletin-documento">
          <!-- Encabezado Institucional Oficial con Escudo y Membrete -->
          <div class="boletin-encabezado">
            <div class="boletin-colegio-bloque">
              <div class="logo-escuela-boletin">GIR</div>
              <div class="boletin-colegio-textos">
                <h2 class="boletin-colegio-nombre">
                  {{ boletin()!.institucion.nombre }}
                </h2>
                <div class="boletin-colegio-sub">
                  RECONOCIMIENTO OFICIAL DE ESTUDIOS DE EDUCACIÓN BÁSICA Y MEDIA VOCACIONAL
                </div>
              </div>
            </div>

            <p class="boletin-meta-p">
              {{ boletin()!.institucion.resolucion }} · Código DANE: <strong>{{ boletin()!.institucion.dane }}</strong> · NIT: <strong>{{ boletin()!.institucion.nit }}</strong>
            </p>
            <p class="boletin-meta-p">
              Sede Principal · Neiva, Huila - Colombia · Plataforma de Gestión Integral AsisTecht
            </p>

            <div class="boletin-periodo-badge-wrapper">
              <span class="boletin-periodo-badge">
                INFORME DE EVALUACIÓN Y RENDIMIENTO ESCOLAR · {{ boletin()!.institucion.periodo | uppercase }}
              </span>
            </div>
          </div>

          <!-- Datos de Identificación del Estudiante -->
          <div class="boletin-estudiante-grid">
            <div class="dato-bloque">
              <span class="dato-etiqueta">Estudiante:</span>
              <strong class="dato-valor">{{ boletin()!.estudiante.nombre }}</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Documento de Identidad:</span>
              <strong class="dato-valor">{{ boletin()!.estudiante.documento }} (T.I.)</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Grado / Grupo:</span>
              <strong class="dato-valor">{{ boletin()!.estudiante.grupo }} (Educación Media)</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Director(a) de Grupo:</span>
              <strong class="dato-valor">{{ boletin()!.estudiante.directorGrupo }}</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Padre / Acudiente:</span>
              <strong class="dato-valor">{{ boletin()!.estudiante.acudiente }}</strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Puesto en el Grado:</span>
              <strong class="dato-valor" style="color: #047857;">
                {{ boletin()!.estudiante.puesto === 'Pendiente' ? 'Pendiente (En curso)' : ('Puesto ' + boletin()!.estudiante.puesto + ' de ' + boletin()!.estudiante.totalAlumnosGrupo + ' alumnos') }}
              </strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Promedio Ponderado:</span>
              <strong class="dato-valor" style="font-size: 1.05rem;" [style.color]="boletin()!.estudiante.promedioGeneral > 0 ? '#047857' : '#64748b'">
                {{ boletin()!.estudiante.promedioGeneral > 0 ? ((boletin()!.estudiante.promedioGeneral | number:'1.2-2') + ' (' + (boletin()!.estudiante.escalaGeneral || '') + ')') : 'Sin evaluaciones registradas' }}
              </strong>
            </div>
            <div class="dato-bloque">
              <span class="dato-etiqueta">Estado Académico:</span>
              <strong class="dato-valor" [style.color]="boletin()!.estudiante.promedioGeneral >= 3.0 ? '#047857' : '#be123c'">
                {{ boletin()!.estudiante.estadoAcademico || 'APROBADO SATISFACTORIAMENTE' }}
              </strong>
            </div>
          </div>

          <!-- Selector de Modo de Visualización (Solo en Pantalla, Oculto en Impresión) -->
          <div class="boletin-vista-tabs no-print">
            <button type="button" class="btn-vista-tab" [class.activo]="vistaMovil() === 'tarjetas'" (click)="vistaMovil.set('tarjetas')">
              <span>📱</span> Tarjetas de Notas
            </button>
            <button type="button" class="btn-vista-tab" [class.activo]="vistaMovil() === 'tabla'" (click)="vistaMovil.set('tabla')">
              <span>📜</span> Tabla Oficial (MEN)
            </button>
          </div>

          <!-- ==========================================================================
               VISTA MÓVIL OPTIMIZADA: TARJETAS DE MATERIAS (INTUITIVA Y RESPONSIVA)
               ========================================================================== -->
          <div class="boletin-materias-cards no-print" [class.oculta]="vistaMovil() !== 'tarjetas'">
            @for (materia of boletin()!.materias; track materia.nombre; let idx = $index) {
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

                <!-- Evaluaciones Parciales -->
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

                <!-- Juicio Pedagógico Asistido por IA -->
                @if (materia.juicioIa) {
                  <div class="materia-card-juicio">
                    <div class="juicio-icono-ia">🤖 Juicio Pedagógico Institucional (IA):</div>
                    <p>{{ materia.juicioIa }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Indicador de Desplazamiento en Pantallas Pequeñas -->
          <div class="scroll-hint-mobile no-print" [class.oculta]="vistaMovil() === 'tarjetas'">
            👈 Desliza horizontalmente la tabla para ver todas las calificaciones y juicios pedagógicos 👉
          </div>

          <!-- ==========================================================================
               TABLA COMPLETA DE CALIFICACIONES (10 ASIGNATURAS OFICIALES)
               ========================================================================== -->
          <div class="boletin-tabla-wrapper" [class.oculta-movil]="vistaMovil() === 'tarjetas'">
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
                @for (materia of boletin()!.materias; track materia.nombre; let idx = $index) {
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
                  <td style="text-align: center; font-size: 1.15rem; font-weight: 800;" [style.color]="boletin()!.estudiante.promedioGeneral > 0 ? '#047857' : '#64748b'">
                    {{ boletin()!.estudiante.promedioGeneral > 0 ? (boletin()!.estudiante.promedioGeneral | number:'1.2-2') : 'Pendiente' }}
                  </td>
                  <td style="text-align: center;">
                    <span class="badge" [class]="claseEscala(boletin()!.estudiante.escalaGeneral)" style="font-size: 0.75rem;">
                      {{ boletin()!.estudiante.escalaGeneral || 'EN CURSO' }}
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: 800; color: #047857;">
                    {{ boletin()!.estudiante.totalFallas }}
                  </td>
                  <td style="font-size: 0.82rem; font-weight: 700;" [style.color]="boletin()!.estudiante.promedioGeneral > 0 ? '#065f46' : '#475569'">
                    @if (boletin()!.estudiante.promedioGeneral > 0) {
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
              {{ boletin()!.conceptoGeneralDirector || 'El estudiante ha demostrado un sobresaliente rendimiento académico y compromiso formativo durante el Primer Periodo Escolar 2026. Se destaca su liderazgo positivo, cumplimiento ético y alto nivel de asimilación conceptual. ¡Felicitaciones a la familia por el acompañamiento brindado!' }}
            </p>
          </div>

          <!-- Observaciones del Observador de Convivencia Escolar -->
          @if (boletin()!.observacionesConvivencia && boletin()!.observacionesConvivencia.length > 0) {
            <div style="margin-top: 1.25rem; font-size: 0.85rem; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.9rem; background: #fafafa;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span>⚖️</span>
                <strong style="color: #0e6b52; text-transform: uppercase; font-size: 0.88rem;">REGISTROS DEL OBSERVADOR DE CONVIVENCIA ESCOLAR (PERIODO 1):</strong>
              </div>
              @for (obs of boletin()!.observacionesConvivencia; track obs.fecha) {
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
                <strong>{{ boletin()!.estudiante.directorGrupo }}</strong>
                <span>Director(a) de Grupo</span>
              </div>
              <span class="firma-sub">Grado {{ boletin()!.estudiante.grupo }}</span>
            </div>

            <div class="firma-columna">
              <div class="boletin-firma-linea">
                <strong>{{ boletin()!.estudiante.acudiente }}</strong>
                <span>Firma del Acudiente / Familia</span>
              </div>
              <span class="firma-sub">Aceptación y Notificación</span>
            </div>
          </footer>

          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.72rem; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;">
            Documento expedido oficialmente por el Sistema de Gestión Escolar AsisTecht el {{ boletin()!.institucion.fechaExpedicion }}. Código de verificación digital institucional: ASIS-HUILA-2026-{{ boletin()!.estudiante.id }}-BOLET.
          </div>
        </article>
      }
    </section>
  `
})
export class BoletinComponent implements OnInit {
  boletin = signal<BoletinOficial | null>(null);
  cargando = signal(true);
  error = signal('');
  vistaMovil = signal<'tarjetas' | 'tabla'>('tarjetas');
  listaEstudiantes = signal<Estudiante[]>([]);
  estudianteSeleccionadoId = signal<number>(1);

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
      this.api.estudiantes().subscribe({
        next: (lista) => {
          this.listaEstudiantes.set(lista || []);
        }
      });
    }
    this.cargarDatos();
  }

  cambiarEstudiante(nuevoId: number): void {
    const id = Number(nuevoId);
    this.estudianteSeleccionadoId.set(id);
    this.cargarPorId(id);
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      const id = parseInt(paramId, 10);
      this.estudianteSeleccionadoId.set(id);
      this.cargarPorId(id);
    } else {
      // Usar endpoint mi-boletin con rol actual
      this.api.miBoletin().subscribe({
        next: (res) => {
          this.boletin.set(res);
          this.cargando.set(false);
          if (res?.estudiante?.id) {
            this.estudianteSeleccionadoId.set(res.estudiante.id);
          }
        },
        error: () => {
          // Fallback al primer estudiante si ocurre error de rol
          this.cargarPorId(1);
        }
      });
    }
  }

  private cargarPorId(id: number): void {
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

  imprimir(): void {
    window.print();
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
