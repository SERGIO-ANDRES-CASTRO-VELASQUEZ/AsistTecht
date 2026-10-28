import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DashboardProfesor, DiagnosticoRiesgoIa } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-dashboard-profesor',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <section class="pagina">
      <!-- Hero Banner Docente -->
      <div class="hero-banner-institucional no-print">
        <div class="hero-tag">
          <span class="pulsing-dot"></span>
          <span>Espacio de Trabajo Docente · Gimnasio José Eustasio Rivera</span>
        </div>
        <div class="entre" style="align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 1.85rem; margin-bottom: 0.35rem;">Panel de Gestión Académica</h1>
            <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 44rem; margin: 0;">
              Control de asistencia por QR y reconocimiento facial, registro de notas en planilla digital y copiloto de IA para prevención de deserción.
            </p>
          </div>

          <div class="acciones" style="gap: 0.5rem; display: flex; flex-wrap: wrap;">
            <a routerLink="/profesor/planilla" class="btn-principal">
              <span>📝</span> Abrir Planilla de Notas
            </a>
            <a routerLink="/profesor/clase" class="btn-secundario">
              <span>📷</span> Iniciar Clase de Hoy
            </a>
            <a routerLink="/profesor/estudiantes" class="btn-secundario">
              <span>👥</span> Mis Estudiantes
            </a>
          </div>
        </div>
      </div>

      @if (error()) { <p class="aviso error">{{ error() }}</p> }

      @if (cargando()) {
        <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <div class="pulsing-dot" style="margin: 0 auto 0.75rem; width: 14px; height: 14px;"></div>
          <p class="lead" style="margin: 0;">Cargando métricas de tus cursos y procesando alertas de aula...</p>
        </div>
      } @else if (data()) {
        <!-- KPIs del Profesor -->
        <div class="kpi-grid">
          <div class="kpi-banner">
            <div class="kpi-icono">📚</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Cursos a Cargo</span>
              <strong class="kpi-numero">{{ data()!.kpis.totalMaterias }}</strong>
              <span class="kpi-desc">{{ data()!.kpis.totalGrupos }} grupos asignados</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-alto-bg); color: var(--grade-alto);">👥</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Estudiantes Totales</span>
              <strong class="kpi-numero">{{ data()!.kpis.totalEstudiantes }}</strong>
              <span class="kpi-desc">Alumnos bajo tu seguimiento</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">✅</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Asistencia Hoy</span>
              <strong class="kpi-numero" style="color: var(--grade-superior);">{{ data()!.kpis.asistenciaHoy }}%</strong>
              <span class="kpi-desc">{{ data()!.kpis.presentesHoy }} presencias registradas</span>
            </div>
          </div>

          <div class="kpi-banner alerta">
            <div class="kpi-icono" style="background: var(--grade-bajo-bg); color: var(--grade-bajo);">⚠️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Alertas Académicas (IA)</span>
              <strong class="kpi-numero" style="color: var(--grade-bajo);">{{ data()!.kpis.estudiantesEnRiesgo }}</strong>
              <span class="kpi-desc">Estudiantes que requieren refuerzo</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--accent-purple-bg); color: var(--accent-purple);">⚖️</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Anotaciones Convivencia</span>
              <strong class="kpi-numero" style="color: var(--accent-purple);">{{ data()!.kpis.totalConvivencia || 0 }}</strong>
              <span class="kpi-desc">Casos en observador escolar</span>
            </div>
          </div>
        </div>

        <!-- Accesos Directos Rápidos (Tiles Dinámicos y Ergonómicos) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
          <a routerLink="/profesor/planilla" class="card card-interactiva" style="text-decoration: none; padding: 1.15rem; display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              📝
            </div>
            <div>
              <strong style="display: block; font-size: 0.95rem; color: var(--text-primary);">Planilla de Notas</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Calificar evaluaciones</span>
            </div>
          </a>

          <a routerLink="/profesor/clase" class="card card-interactiva" style="text-decoration: none; padding: 1.15rem; display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--grade-alto-bg); color: var(--grade-alto); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              📷
            </div>
            <div>
              <strong style="display: block; font-size: 0.95rem; color: var(--text-primary);">Tomar Asistencia</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Cámara QR y Facial</span>
            </div>
          </a>

          <a routerLink="/profesor/convivencia" class="card card-interactiva" style="text-decoration: none; padding: 1.15rem; display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--accent-purple-bg); color: var(--accent-purple); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              ⚖️
            </div>
            <div>
              <strong style="display: block; font-size: 0.95rem; color: var(--text-primary);">Observador Escolar</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Convivencia y méritos</span>
            </div>
          </a>

          <a routerLink="/profesor/estudiantes" class="card card-interactiva" style="text-decoration: none; padding: 1.15rem; display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--grade-basico-bg); color: var(--grade-basico); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              🎓
            </div>
            <div>
              <strong style="display: block; font-size: 0.95rem; color: var(--text-primary);">Lista de Alumnos</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Carnets y acudientes</span>
            </div>
          </a>
        </div>

        <!-- Módulo de Copiloto Docente con IA -->
        <div class="ai-banner-modern">
          <div class="entre" style="margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span class="ai-chip">🤖 Copiloto Docente IA</span>
              <h2 style="font-size: 1.25rem; margin: 0;">Radar de Rendimiento y Prevención de Deserción</h2>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Algoritmo heurístico institucional</span>
          </div>

          <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0.25rem 0 1rem;">
            Estudiantes identificados automáticamente con riesgo académico por acumulación de inasistencias o promedio bajo en este periodo.
          </p>

          <!-- Filtros de Alertas y Buscador para Docentes -->
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
              <input type="text" [ngModel]="busquedaTexto()" (ngModelChange)="busquedaTexto.set($event)" placeholder="🔍 Buscar alumno o grupo..."
                style="padding: 0.45rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: var(--bg-surface-solid); width: 100%; box-sizing: border-box; color: var(--text-primary);" />
            </div>
          </div>

          <!-- Lista de Alumnos en Alerta -->
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

                      <div class="ai-factors-cloud">
                        @for (factor of est.factores; track factor) {
                          <span class="ai-factor-chip">{{ factor }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="acciones" style="display: flex; gap: 0.45rem;">
                    <a routerLink="/profesor/planilla" class="btn-principal" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
                      <span>📝</span> Planilla Notas
                    </a>
                    <a [routerLink]="['/profesor/convivencia']" [queryParams]="{ estudianteId: est.estudianteId }" class="btn-secundario" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
                      <span>⚖️</span> Observador
                    </a>
                  </div>
                </div>

                <div class="ai-recomendacion-box">
                  <strong>💡 Sugerencia Pedagógica Institucional:</strong>
                  <span>{{ est.recomendacionPedagogica }}</span>
                </div>
              </div>
            } @empty {
              <div class="card" style="padding: 2rem 1.5rem; text-align: center;">
                <span style="font-size: 2.2rem;">🎉</span>
                <p class="lead" style="color: var(--grade-superior); margin: 0.35rem 0 0;">
                  Todos los estudiantes se encuentran en zona de normalidad académica y asistencia para este criterio.
                </p>
              </div>
            }
          </div>
        </div>

        <!-- Sección de Observador Escolar y Convivencia Reciente -->
        <div class="card" style="margin-top: 1.75rem; border-top: 4px solid var(--accent-purple);">
          <div class="entre" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.5rem;">⚖️</span>
              <div>
                <h2 style="font-size: 1.25rem; margin: 0;">Observador Escolar: Anotaciones Recientes</h2>
                <small style="color: var(--text-muted);">Llamados de atención, compromisos formativos y méritos escolares</small>
              </div>
            </div>
            <a routerLink="/profesor/convivencia" class="btn-principal" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
              + Abrir Observador Completo
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
                    Estudiante: <strong style="color: var(--text-primary);">{{ obs.estudianteNombre }}</strong> · {{ obs.grupo }} · Registrado por: <em>{{ obs.profesorNombre }}</em>
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
            <p class="aviso" style="margin: 0;">No hay anotaciones registradas recientemente para tus estudiantes.</p>
          }
        </div>
      }
    </section>
  `
})
export class DashboardProfesorComponent implements OnInit {
  data = signal<DashboardProfesor | null>(null);
  cargando = signal(true);
  error = signal('');
  filtroNivel = signal<'todos' | 'Critico' | 'Alto' | 'Medio'>('todos');
  busquedaTexto = signal('');

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

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.dashboardProfesor().subscribe({
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
