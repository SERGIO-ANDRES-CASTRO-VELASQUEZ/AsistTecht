import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DashboardDirector, DiagnosticoRiesgoIa, EstudianteFalla } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-dashboard-director',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <section class="pagina">
      <!-- Hero Banner Ejecutivo Directivo -->
      <div class="hero-banner-institucional no-print">
        <div class="hero-tag">
          <span class="pulsing-dot"></span>
          <span>Tablero de Control Directivo · Gimnasio José Eustasio Rivera</span>
        </div>
        <div class="entre" style="align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 1.85rem; margin-bottom: 0.35rem;">Panel Ejecutivo Institucional</h1>
            <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 46rem; margin: 0;">
              Métricas académicas en tiempo real, análisis profundo de ausentismo estudiantil, comparativa de cursos e inteligencia artificial para la prevención de deserción escolar.
            </p>
          </div>

          <div class="acciones" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn-secundario" (click)="cargar()" [disabled]="cargando()">
              <span>{{ cargando() ? '⏳' : '🔄' }}</span> Actualizar Datos
            </button>
            <a routerLink="/director/profesores" class="btn-principal">
              <span>👨‍🏫</span> Planta Docente
            </a>
            <a routerLink="/director/convivencia" class="btn-secundario">
              <span>⚖️</span> Convivencia
            </a>
            <a routerLink="/director/boletin" class="btn-secundario">
              <span>📜</span> Boletines
            </a>
          </div>
        </div>
      </div>

      @if (error()) { <p class="aviso error">{{ error() }}</p> }

      @if (cargando()) {
        <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <div class="pulsing-dot" style="margin: 0 auto 0.75rem; width: 14px; height: 14px;"></div>
          <p class="lead" style="margin: 0;">Sincronizando métricas institucionales, gráficas de ausentismo y modelo de IA...</p>
        </div>
      } @else if (data()) {
        <!-- KPIs Principales en Grid Estandarizado -->
        <div class="kpi-grid">
          <div class="kpi-banner">
            <div class="kpi-icono">👥</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Matrícula Estudiantil</span>
              <strong class="kpi-numero">{{ data()!.kpis.totalEstudiantes }}</strong>
              <span class="kpi-desc">{{ data()!.kpis.totalGrupos }} grupos · {{ data()!.kpis.totalMaterias }} asignaturas</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">🕒</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Asistencia Hoy</span>
              <strong class="kpi-numero" style="color: var(--grade-superior);">{{ data()!.kpis.asistenciaHoy }}%</strong>
              <span class="kpi-desc">{{ data()!.kpis.presentesHoy }} en aula · {{ data()!.kpis.fallasHoy || 0 }} ausencias</span>
            </div>
          </div>

          <div class="kpi-banner alerta">
            <div class="kpi-icono" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">📉</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Ausentismo Global</span>
              <strong class="kpi-numero" style="color: #ef4444;">{{ data()!.kpis.totalFallasGlobales || 0 }} fallas</strong>
              <span class="kpi-desc">Tasa ausentismo: {{ data()!.kpis.tasaAusentismoGlobal || 0 }}%</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-alto-bg); color: var(--grade-alto);">📈</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Promedio General</span>
              <strong class="kpi-numero" style="color: var(--grade-alto);">{{ data()!.kpis.promedioGeneral > 0 ? (data()!.kpis.promedioGeneral | number:'1.2-2') : 'Pendiente' }}</strong>
              <span class="kpi-desc">Escala 1.0 a 5.0 (MEN)</span>
            </div>
          </div>

          <div class="kpi-banner alerta">
            <div class="kpi-icono" style="background: var(--grade-bajo-bg); color: var(--grade-bajo);">⚠️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Alertas Tempranas IA</span>
              <strong class="kpi-numero" style="color: var(--grade-bajo);">{{ data()!.kpis.estudiantesEnRiesgo }}</strong>
              <span class="kpi-desc">Riesgo académico o deserción</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--accent-purple-bg); color: var(--accent-purple);">⚖️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Observador Escolar</span>
              <strong class="kpi-numero" style="color: var(--accent-purple);">{{ data()!.kpis.totalConvivencia || 0 }}</strong>
              <span class="kpi-desc">Anotaciones formativas</span>
            </div>
          </div>
        </div>

        <!-- Gráficos de Inteligencia de Negocios (BI) -->
        <div class="dashboard-charts-grid">
          <!-- Gráfico de Tendencia de Asistencia Semanal -->
          <div class="chart-card">
            <div class="chart-header">
              <div>
                <h2>Tendencia de Asistencia Semanal</h2>
                <span class="lead">Comportamiento institucional diario de la última semana</span>
              </div>
              <span class="badge badge-verde">Últimos 7 días</span>
            </div>

            <div class="weekly-bars-container">
              @for (dia of data()!.historicoSemanal; track dia.fecha) {
                <div class="bar-col" [title]="dia.diaNombre + ': ' + dia.presentes + ' presentes, ' + (dia.fallas || 0) + ' fallas (' + dia.porcentaje + '%)'">
                  <span class="bar-val">{{ dia.porcentaje }}%</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.height.%]="dia.porcentaje"></div>
                  </div>
                  <span class="bar-label">{{ dia.diaNombre ? dia.diaNombre.slice(0, 3) : formatearDia(dia.fecha) }}</span>
                </div>
              }
            </div>

            <div class="balance-meta-footer" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
              <span>Promedio Semanal: <strong style="color: var(--grade-superior);">{{ promedioSemanal() }}%</strong></span>
              <span style="font-size: 0.75rem;">Actualización en vivo vía QR y Facial</span>
            </div>
          </div>

          <!-- Comparativa de Asistencia por Grupos / Cursos -->
          @if (data()!.asistenciaPorGrupos && data()!.asistenciaPorGrupos!.length > 0) {
            <div class="chart-card">
              <div class="chart-header">
                <div>
                  <h2>Asistencia por Grados / Cursos</h2>
                  <span class="lead">Rendimiento comparativo entre cursos institucionales</span>
                </div>
                <span class="badge badge-azul">{{ data()!.asistenciaPorGrupos!.length }} Grupos</span>
              </div>

              <div class="group-bars-list">
                @for (grp of data()!.asistenciaPorGrupos; track grp.grupoId) {
                  <div class="group-bar-item">
                    <div class="group-bar-header">
                      <strong>Grado {{ grp.grupoNombre }} ({{ grp.totalEstudiantes }} alumnos)</strong>
                      <span [style.color]="colorBarraGrupo(grp.porcentajeAsistencia)" style="font-weight: 800;">
                        {{ grp.porcentajeAsistencia }}% Asist. · <span style="color: #ef4444;">{{ grp.totalFallas }} fallas</span>
                      </span>
                    </div>
                    <div class="group-bar-track">
                      <div class="group-bar-fill" [class]="claseBarraGrupo(grp.porcentajeAsistencia)" [style.width.%]="grp.porcentajeAsistencia"></div>
                    </div>
                  </div>
                }
              </div>

              <div class="balance-meta-footer" style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                <span>Criterio: <strong style="color: var(--grade-superior);">≥ 85% Óptimo</strong></span>
                <span style="color: #ef4444; font-weight: 600;">&lt; 75% Requiere Intervención</span>
              </div>
            </div>
          }

          <!-- Balance Académico Institucional -->
          <div class="chart-card">
            <div class="chart-header">
              <div>
                <h2>Balance Académico Institucional</h2>
                <span class="lead">Proporción general de calificaciones del periodo</span>
              </div>
              <span class="badge badge-azul">Periodo 1</span>
            </div>

            <div class="balance-stats-row">
              <div class="balance-stat-item">
                <strong class="balance-num" style="color: var(--grade-superior);">{{ data()!.distribucionNotas.aprobados }}</strong>
                <span class="balance-label">Notas Aprobadas (≥ 3.0)</span>
              </div>

              <div class="balance-divider"></div>

              <div class="balance-stat-item">
                <strong class="balance-num" style="color: var(--grade-bajo);">{{ data()!.distribucionNotas.reprobados }}</strong>
                <span class="balance-label">Notas en Riesgo (&lt; 3.0)</span>
              </div>
            </div>

            <div class="balance-progress-track">
              <div class="balance-progress-fill" [style.width.%]="porcentajeAprobados()"></div>
            </div>

            <div class="balance-meta-footer">
              <span><strong>{{ porcentajeAprobados() }}%</strong> Tasa de Aprobación Global</span>
              <span>Total Calificaciones: <strong>{{ data()!.distribucionNotas.total }}</strong></span>
            </div>
          </div>

          <!-- Distribución de Asistencia y Métodos de Registro Biométrico -->
          @if (data()!.distribucionAsistencia) {
            <div class="chart-card">
              <div class="chart-header">
                <div>
                  <h2>Métodos Biométricos y Ausencias</h2>
                  <span class="lead">Desglose de tecnologías de verificación en aula</span>
                </div>
                <span class="badge badge-verde">Biometría Activa</span>
              </div>

              <div class="distribucion-segmentada-track">
                <div class="dist-seg qr" [style.width.%]="pctMetodo('qr')" [title]="'QR: ' + data()!.distribucionAsistencia!.origenQr + ' marcas'"></div>
                <div class="dist-seg rostro" [style.width.%]="pctMetodo('rostro')" [title]="'Rostro Facial: ' + data()!.distribucionAsistencia!.origenRostro + ' marcas'"></div>
                <div class="dist-seg fallas" [style.width.%]="pctMetodo('fallas')" [title]="'Inasistencias: ' + data()!.distribucionAsistencia!.totalFallas + ' faltas'"></div>
              </div>

              <div class="dist-leyenda">
                <div class="dist-leyenda-item">
                  <span class="dot-color" style="background: #10b981;"></span>
                  <span>Carnet QR: <strong>{{ data()!.distribucionAsistencia!.origenQr }}</strong> ({{ pctMetodo('qr') }}%)</span>
                </div>
                <div class="dist-leyenda-item">
                  <span class="dot-color" style="background: #3b82f6;"></span>
                  <span>Geometría Facial: <strong>{{ data()!.distribucionAsistencia!.origenRostro }}</strong> ({{ pctMetodo('rostro') }}%)</span>
                </div>
                <div class="dist-leyenda-item">
                  <span class="dot-color" style="background: #ef4444;"></span>
                  <span>Inasistencias: <strong>{{ data()!.distribucionAsistencia!.totalFallas }}</strong> ({{ pctMetodo('fallas') }}%)</span>
                </div>
              </div>

              <div class="balance-meta-footer" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                <span>Total Registros: <strong>{{ data()!.distribucionAsistencia!.totalEsperados }}</strong></span>
                <span style="color: var(--grade-superior); font-weight: 700;">{{ data()!.distribucionAsistencia!.porcentajeAsistencia }}% Asistencia Neta</span>
              </div>
            </div>
          }
        </div>

        <!-- ========================================================================= -->
        <!-- MÓDULO EXCLUSIVO: ANÁLISIS PROFUNDO DE ESTUDIANTES QUE FALLAN (AUSENTISMO) -->
        <!-- ========================================================================= -->
        <div class="banner-ausentismo-profundo">
          <div class="entre" style="flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.6rem;">🚨</span>
              <div>
                <h2 style="font-size: 1.35rem; margin: 0; color: #dc2626; font-weight: 800;">
                  Monitor y Control de Inasistencias por Estudiante
                </h2>
                <small style="color: var(--text-muted);">
                  Seguimiento estricto de ausentismo según Decreto 1290 (Pérdida reglamentaria al superar 25% de inasistencias)
                </small>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge badge-rojo">Críticos: {{ contarFallasPorRiesgo('Critico') }}</span>
              <span class="badge badge-amarillo">En Alerta: {{ contarFallasPorRiesgo('Alto') }}</span>
              <span class="badge badge-verde">Normal: {{ contarFallasPorRiesgo('Bajo') }}</span>
            </div>
          </div>

          <!-- Barra de Filtros y Búsqueda de Inasistencias -->
          <div class="ai-radar-filters" style="margin-bottom: 1rem;">
            <button type="button" class="ai-filter-btn" [class.activo]="filtroFallasRiesgo() === 'todos'" (click)="filtroFallasRiesgo.set('todos')">
              <span>📋</span> Todos ({{ data()!.estudiantesConFallas?.length || 0 }})
            </button>
            <button type="button" class="ai-filter-btn" [class.activo]="filtroFallasRiesgo() === 'Critico'" (click)="filtroFallasRiesgo.set('Critico')">
              <span style="color: #ef4444;">🔴</span> Crítico ≥ 25% ({{ contarFallasPorRiesgo('Critico') }})
            </button>
            <button type="button" class="ai-filter-btn" [class.activo]="filtroFallasRiesgo() === 'Alto'" (click)="filtroFallasRiesgo.set('Alto')">
              <span style="color: #f59e0b;">🟡</span> Alerta 15-24% ({{ contarFallasPorRiesgo('Alto') }})
            </button>
            <button type="button" class="ai-filter-btn" [class.activo]="filtroFallasRiesgo() === 'Medio'" (click)="filtroFallasRiesgo.set('Medio')">
              <span style="color: #3b82f6;">🔵</span> Leve 1-14% ({{ contarFallasPorRiesgo('Medio') }})
            </button>

            <!-- Selector de Grupo / Grado -->
            <div style="min-width: 8.5rem;">
              <select [ngModel]="filtroFallasGrupo()" (ngModelChange)="filtroFallasGrupo.set($event)"
                style="padding: 0.45rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: var(--bg-surface-solid); width: 100%; color: var(--text-primary); cursor: pointer;">
                <option value="todos">🏫 Todos los grupos</option>
                @for (g of gruposDisponibles(); track g) {
                  <option [value]="g">Grado {{ g }}</option>
                }
              </select>
            </div>

            <!-- Buscador por Nombre o Documento -->
            <div style="margin-left: auto; max-width: 16rem; width: 100%;">
              <input type="text" [ngModel]="busquedaFallas()" (ngModelChange)="busquedaFallas.set($event)" placeholder="🔍 Buscar por alumno o acudiente..."
                style="padding: 0.45rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: var(--bg-surface-solid); width: 100%; box-sizing: border-box; color: var(--text-primary);" />
            </div>
          </div>

          <!-- Tabla Visual de Estudiantes con Inasistencias -->
          <div class="tabla-fallas-container">
            <table class="tabla-fallas">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Grado</th>
                  <th style="text-align: center;">Sesiones / Asistidas</th>
                  <th style="text-align: center;">Fallas</th>
                  <th>% Inasistencia</th>
                  <th>Nivel de Riesgo</th>
                  <th>Acudiente / Contacto</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (est of estudiantesFallasFiltrados(); track est.estudianteId) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circulo" style="width: 34px; height: 34px; font-size: 0.9rem; font-weight: 800; background: var(--primary-light); color: var(--primary); flex-shrink: 0;">
                          {{ est.nombre.charAt(0) }}
                        </div>
                        <div>
                          <strong style="display: block; color: var(--text-primary);">{{ est.nombre }}</strong>
                          <span style="font-size: 0.74rem; color: var(--text-muted);">Doc. {{ est.documento }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" style="background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border);">
                        {{ est.grupo }}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <strong>{{ est.totalAsistencias }}</strong> / {{ est.totalSesiones }} clases
                    </td>
                    <td style="text-align: center;">
                      <span class="badge" [class]="est.totalFallas > 0 ? (est.nivelRiesgo === 'Critico' ? 'badge-rojo' : 'badge-amarillo') : 'badge-verde'" style="font-size: 0.88rem; padding: 0.25rem 0.6rem;">
                        {{ est.totalFallas }}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div class="barra-fallas-mini" title="Línea roja marca el 25% de pérdida reglamentaria">
                          <div class="linea-limite-25"></div>
                          <div class="barra-fallas-fill" [style.width.%]="est.porcentajeInasistencia"
                            [style.background]="est.porcentajeInasistencia >= 25 ? '#ef4444' : (est.porcentajeInasistencia >= 15 ? '#f59e0b' : '#10b981')"></div>
                        </div>
                        <strong [style.color]="est.porcentajeInasistencia >= 25 ? '#ef4444' : (est.porcentajeInasistencia >= 15 ? '#f59e0b' : 'var(--text-primary)')">
                          {{ est.porcentajeInasistencia }}%
                        </strong>
                      </div>
                    </td>
                    <td>
                      @if (est.nivelRiesgo === 'Critico') {
                        <span class="badge badge-rojo">🔴 Riesgo Pérdida (≥25%)</span>
                      } @else if (est.nivelRiesgo === 'Alto') {
                        <span class="badge badge-amarillo">🟡 Alerta Preventiva</span>
                      } @else if (est.nivelRiesgo === 'Medio') {
                        <span class="badge badge-azul">🔵 Seguimiento Leve</span>
                      } @else {
                        <span class="badge badge-verde">🟢 Asistencia Normal</span>
                      }
                    </td>
                    <td>
                      <div>
                        <span style="font-size: 0.8rem; display: block; font-weight: 600;">{{ est.acudienteNombre }}</span>
                        @if (est.acudienteTelefono && est.acudienteTelefono !== 'Sin registro') {
                          <a [href]="'tel:' + est.acudienteTelefono" style="font-size: 0.74rem; color: var(--primary); text-decoration: none;">
                            📞 {{ est.acudienteTelefono }}
                          </a>
                        } @else {
                          <span style="font-size: 0.74rem; color: var(--text-muted);">Sin teléfono</span>
                        }
                      </div>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                        <a [routerLink]="['/director/convivencia']" [queryParams]="{ estudianteId: est.estudianteId }" class="btn-secundario" style="font-size: 0.76rem; padding: 0.3rem 0.6rem;" title="Citar acudiente o registrar anotación en observador">
                          <span>⚖️</span> Citar
                        </a>
                        <a [routerLink]="['/director/boletin']" [queryParams]="{ estudianteId: est.estudianteId }" class="btn-principal" style="font-size: 0.76rem; padding: 0.3rem 0.6rem;" title="Ver calificaciones y notas del alumno">
                          <span>📜</span> Boletín
                        </a>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                      <span style="font-size: 1.8rem;">🎉</span>
                      <p style="margin: 0.4rem 0 0; color: var(--grade-superior); font-weight: 600;">
                        No hay estudiantes que coincidan con los criterios de inasistencia seleccionados.
                      </p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Módulo de Copiloto IA: Radar Predictivo con Filtros Interactivos -->
        <div class="ai-banner-modern" style="margin-top: 1.75rem;">
          <div class="entre" style="flex-wrap: wrap; gap: 0.75rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span class="ai-chip">🤖 Copiloto IA Directivo</span>
              <h2 style="font-size: 1.3rem; margin: 0;">Radar Predictivo Multivariable (Early Warning System)</h2>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              Algoritmo heurístico institucional de correlación de notas y ausencias
            </span>
          </div>

          <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.5rem 0 0;">
            El motor predictivo correlaciona continuamente el porcentaje de inasistencias no justificadas, promedios por área y observaciones de convivencia para priorizar intervenciones pedagógicas oportunas.
          </p>

          <!-- Filtros de Nivel de Riesgo y Buscador -->
          <div class="ai-radar-filters">
            <button type="button" class="ai-filter-btn" [class.activo]="filtroNivel() === 'todos'" (click)="filtroNivel.set('todos')">
              <span>📋</span> Todos ({{ data()!.alertasIa.length }})
            </button>
            <button type="button" class="ai-filter-btn" [class.activo]="filtroNivel() === 'Critico'" (click)="filtroNivel.set('Critico')">
              <span style="color: var(--grade-bajo);">🔴</span> Crítico ({{ contarNivel('Critico') }})
            </button>
            <button type="button" class="ai-filter-btn" [class.activo]="filtroNivel() === 'Alto'" (click)="filtroNivel.set('Alto')">
              <span style="color: var(--grade-basico);">🟡</span> Alto ({{ contarNivel('Alto') }})
            </button>
            <button type="button" class="ai-filter-btn" [class.activo]="filtroNivel() === 'Medio'" (click)="filtroNivel.set('Medio')">
              <span style="color: var(--grade-alto);">🔵</span> Medio ({{ contarNivel('Medio') }})
            </button>

            <div style="margin-left: auto; max-width: 17rem; width: 100%;">
              <input type="text" [ngModel]="busquedaTexto()" (ngModelChange)="busquedaTexto.set($event)" placeholder="🔍 Buscar por alumno o grupo..."
                style="padding: 0.45rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: var(--bg-surface-solid); width: 100%; box-sizing: border-box; color: var(--text-primary);" />
            </div>
          </div>

          <!-- Listado de Estudiantes en Riesgo Filtrados -->
          <div style="display: grid; gap: 0.85rem;">
            @for (est of alertasFiltradas(); track est.estudianteId) {
              <div class="ai-student-card" [style.border-left-color]="colorNivel(est.nivel)">
                <div class="entre" style="flex-wrap: wrap; gap: 0.75rem; align-items: flex-start;">
                  <div style="display: flex; align-items: flex-start; gap: 0.85rem;">
                    <div class="avatar-circulo" style="width: 42px; height: 42px; font-size: 1.1rem; flex-shrink: 0; background: var(--primary-light); color: var(--primary); font-weight: 800;">
                      {{ est.nombre.charAt(0) }}
                    </div>
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                        <strong style="font-size: 1.05rem; color: var(--text-primary);">{{ est.nombre }}</strong>
                        <span class="badge" [class]="claseNivel(est.nivel)">Riesgo {{ est.nivel }} ({{ est.scoreRiesgo }} pts)</span>
                        <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border);">Grupo {{ est.grupo }}</span>
                        <span style="font-size: 0.78rem; color: var(--text-muted);">Doc. {{ est.documento }}</span>
                      </div>

                      <!-- Factores de Riesgo en Chips -->
                      <div class="ai-factors-cloud">
                        @for (factor of est.factores; track factor) {
                          <span class="ai-factor-chip">{{ factor }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="acciones" style="display: flex; gap: 0.45rem;">
                    <a routerLink="/director/boletin" class="btn-principal" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
                      <span>📜</span> Boletín Oficial
                    </a>
                    <a routerLink="/director/convivencia" class="btn-secundario" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
                      <span>⚖️</span> Observador
                    </a>
                  </div>
                </div>

                <!-- Caja de Recomendación Pedagógica de la IA -->
                <div class="ai-recomendacion-box">
                  <strong>💡 Recomendación Pedagógica del Motor de IA:</strong>
                  <span>{{ est.recomendacionPedagogica }}</span>
                </div>
              </div>
            } @empty {
              <div class="card" style="text-align: center; padding: 2rem 1.5rem;">
                <span style="font-size: 2rem;">🎉</span>
                <p class="lead" style="margin: 0.35rem 0 0; color: var(--grade-superior);">
                  No hay estudiantes que coincidan con el filtro seleccionado.
                </p>
              </div>
            }
          </div>
        </div>

        <!-- Sección de Convivencia Escolar Institucional -->
        <div class="card" style="margin-top: 1.75rem; border-top: 4px solid var(--accent-purple);">
          <div class="entre" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.5rem;">⚖️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0;">Observador Escolar: Casos Institucionales Recientes</h2>
                <small style="color: var(--text-muted);">Seguimiento institucional de Ley 1620 (Tipo I, II, III y Méritos Escolares)</small>
              </div>
            </div>
            <a routerLink="/director/convivencia" class="btn-principal" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
              + Ver Observador Completo
            </a>
          </div>

          @if (data()!.observacionesRecientes && data()!.observacionesRecientes!.length > 0) {
            <div style="display: grid; gap: 0.75rem;">
              @for (obs of data()!.observacionesRecientes; track obs.id) {
                <div class="card card-interactiva" style="padding: 0.85rem 1.1rem; border-left: 4px solid;" [style.border-left-color]="colorConvivencia(obs.tipo)">
                  <div class="entre" style="flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.35rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="badge" [class]="claseConvivencia(obs.tipo)">{{ textoTipoConvivencia(obs.tipo) }}</span>
                      <strong style="color: var(--text-primary); font-size: 0.95rem;">{{ obs.titulo }}</strong>
                    </div>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 550;">📅 {{ obs.fecha }}</span>
                  </div>

                  <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                    Estudiante: <strong style="color: var(--text-primary);">{{ obs.estudianteNombre }}</strong> · {{ obs.grupo }} · Registrado por docente: <em>{{ obs.profesorNombre }}</em>
                  </div>

                  <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0.25rem 0; line-height: 1.4;">
                    {{ obs.descripcion }}
                  </p>

                  @if (obs.compromiso) {
                    <div style="margin-top: 0.4rem; background: var(--bg-hover); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; border-left: 3px solid var(--grade-superior);">
                      <strong>🤝 Compromiso Formativo:</strong> {{ obs.compromiso }}
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="aviso" style="margin: 0;">No hay anotaciones registradas recientemente en el observador escolar.</p>
          }
        </div>
      }
    </section>
  `
})
export class DashboardDirectorComponent implements OnInit {
  data = signal<DashboardDirector | null>(null);
  cargando = signal(true);
  error = signal('');
  filtroNivel = signal<'todos' | 'Critico' | 'Alto' | 'Medio'>('todos');
  busquedaTexto = signal('');

  // Filtros para el monitor profundo de estudiantes que fallan
  filtroFallasRiesgo = signal<'todos' | 'Critico' | 'Alto' | 'Medio' | 'Bajo'>('todos');
  filtroFallasGrupo = signal<string>('todos');
  busquedaFallas = signal<string>('');

  alertasFiltradas = computed(() => {
    const list = this.data()?.alertasIa ?? [];
    const nivel = this.filtroNivel();
    const q = this.busquedaTexto().trim().toLowerCase();

    return list.filter(item => {
      const coincideNivel = nivel === 'todos' || item.nivel.toLowerCase() === nivel.toLowerCase();
      const coincideTexto = !q ||
        item.nombre.toLowerCase().includes(q) ||
        item.grupo.toLowerCase().includes(q) ||
        item.documento.toLowerCase().includes(q);
      return coincideNivel && coincideTexto;
    });
  });

  gruposDisponibles = computed(() => {
    const fallas = this.data()?.estudiantesConFallas ?? [];
    const set = new Set<string>();
    fallas.forEach(f => {
      if (f.grupo && f.grupo !== 'Sin grupo') set.add(f.grupo);
    });
    return Array.from(set).sort();
  });

  estudiantesFallasFiltrados = computed(() => {
    const list = this.data()?.estudiantesConFallas ?? [];
    const riesgo = this.filtroFallasRiesgo();
    const grupo = this.filtroFallasGrupo();
    const q = this.busquedaFallas().trim().toLowerCase();

    return list.filter(item => {
      const coincideRiesgo = riesgo === 'todos' || item.nivelRiesgo.toLowerCase() === riesgo.toLowerCase();
      const coincideGrupo = grupo === 'todos' || item.grupo.toLowerCase() === grupo.toLowerCase();
      const coincideTexto = !q ||
        item.nombre.toLowerCase().includes(q) ||
        item.documento.toLowerCase().includes(q) ||
        item.grupo.toLowerCase().includes(q) ||
        (item.acudienteNombre && item.acudienteNombre.toLowerCase().includes(q));

      return coincideRiesgo && coincideGrupo && coincideTexto;
    });
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.dashboardDirector().subscribe({
      next: (res) => {
        this.data.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err));
      }
    });
  }

  porcentajeAprobados(): number {
    const total = this.data()?.distribucionNotas.total ?? 0;
    const aprobados = this.data()?.distribucionNotas.aprobados ?? 0;
    return total > 0 ? Math.round((aprobados / total) * 100) : 100;
  }

  promedioSemanal(): number {
    const hist = this.data()?.historicoSemanal ?? [];
    if (hist.length === 0) return 100;
    const suma = hist.reduce((acc, curr) => acc + curr.porcentaje, 0);
    return Math.round(suma / hist.length);
  }

  pctMetodo(tipo: 'qr' | 'rostro' | 'fallas'): number {
    const dist = this.data()?.distribucionAsistencia;
    if (!dist || dist.totalEsperados === 0) return 0;
    if (tipo === 'qr') return Math.round((dist.origenQr / dist.totalEsperados) * 100);
    if (tipo === 'rostro') return Math.round((dist.origenRostro / dist.totalEsperados) * 100);
    return Math.round((dist.totalFallas / dist.totalEsperados) * 100);
  }

  colorBarraGrupo(porcentaje: number): string {
    if (porcentaje >= 85) return 'var(--grade-superior)';
    if (porcentaje >= 75) return '#f59e0b';
    return '#ef4444';
  }

  claseBarraGrupo(porcentaje: number): string {
    if (porcentaje >= 85) return 'verde';
    if (porcentaje >= 75) return 'amarillo';
    return 'rojo';
  }

  contarFallasPorRiesgo(nivel: string): number {
    const list = this.data()?.estudiantesConFallas ?? [];
    return list.filter(x => x.nivelRiesgo.toLowerCase() === nivel.toLowerCase()).length;
  }

  formatearDia(fecha: string): string {
    if (!fecha) return '';
    try {
      const partes = fecha.split('-');
      if (partes.length === 3) {
        const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return `${dias[d.getDay()]} ${partes[2]}`;
      }
      return fecha.slice(5, 10);
    } catch {
      return fecha.slice(5, 10);
    }
  }

  contarNivel(nivel: string): number {
    const list = this.data()?.alertasIa ?? [];
    return list.filter(x => x.nivel.toLowerCase() === nivel.toLowerCase()).length;
  }

  colorNivel(nivel: string): string {
    if (nivel === 'Critico') return 'var(--grade-bajo)';
    if (nivel === 'Alto') return 'var(--grade-basico)';
    if (nivel === 'Medio') return 'var(--grade-alto)';
    return 'var(--grade-superior)';
  }

  claseNivel(nivel: string): string {
    if (nivel === 'Critico') return 'badge-rojo';
    if (nivel === 'Alto') return 'badge-amarillo';
    if (nivel === 'Medio') return 'badge-azul';
    return 'badge-verde';
  }

  colorConvivencia(tipo: string): string {
    if (tipo === 'Felicitacion') return 'var(--grade-superior)';
    if (tipo === 'Atencion') return 'var(--grade-basico)';
    if (tipo === 'FaltaLeve') return 'var(--grade-alto)';
    return 'var(--grade-bajo)';
  }

  claseConvivencia(tipo: string): string {
    if (tipo === 'Felicitacion') return 'badge-verde';
    if (tipo === 'Atencion') return 'badge-amarillo';
    if (tipo === 'FaltaLeve') return 'badge-azul';
    return 'badge-rojo';
  }

  textoTipoConvivencia(tipo: string): string {
    if (tipo === 'Felicitacion') return '🌟 Felicitación / Mérito';
    if (tipo === 'Atencion') return '⚠️ Tipo I · Llamado de Atención';
    if (tipo === 'FaltaLeve') return '🟠 Tipo II · Falta Disciplinaria';
    return '🔴 Tipo III · Falta Gravísima';
  }
}
