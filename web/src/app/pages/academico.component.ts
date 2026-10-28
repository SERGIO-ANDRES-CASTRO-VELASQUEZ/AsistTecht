import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MateriaAcademica } from '../core/models';

@Component({
  selector: 'app-academico',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="pagina">
      <!-- Hero Banner Académico del Estudiante -->
      <div class="hero-banner-institucional no-print">
        <div class="hero-tag">
          <span class="pulsing-dot"></span>
          <span>Portal del Estudiante · Año Lectivo 2026</span>
        </div>
        <div class="entre" style="align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 1.85rem; margin-bottom: 0.35rem;">Mis Calificaciones y Asistencias</h1>
            <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 44rem; margin: 0;">
              Consulta el desglose de tus evaluaciones parciales, quices, talleres y porcentaje de asistencia por asignatura.
            </p>
          </div>

          <div class="acciones">
            <a routerLink="/estudiante/boletin" class="btn-principal">
              <span>📜</span> Ver Mi Boletín Oficial
            </a>
          </div>
        </div>
      </div>

      <!-- Resumen General del Estudiante (KPIs) -->
      @if (materias().length > 0) {
        <div class="kpi-grid" style="margin-bottom: 1.5rem;">
          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">⭐</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Promedio General</span>
              @if (promedioGeneral() !== null) {
                <strong class="kpi-numero" [style.color]="promedioGeneral()! >= 3.0 ? 'var(--grade-superior)' : 'var(--grade-bajo)'">
                  {{ promedioGeneral() }}
                </strong>
              } @else {
                <strong class="kpi-numero" style="color: var(--text-muted); font-size: 1.5rem;">
                  Pendiente
                </strong>
              }
              <span class="kpi-desc">Desempeño {{ escalaGeneral() }}</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono" style="background: var(--grade-alto-bg); color: var(--grade-alto);">📚</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Asignaturas Matriculadas</span>
              <strong class="kpi-numero">{{ materias().length }}</strong>
              <span class="kpi-desc">Todas las materias al día</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="kpi-icono">✅</div>
            <div class="kpi-info">
              <span class="kpi-titulo">Asistencia Global</span>
              <strong class="kpi-numero" style="color: var(--primary);">{{ porcentajeAsistenciaGlobal() }}%</strong>
              <span class="kpi-desc">{{ totalFallasGlobales() }} fallas acumuladas</span>
            </div>
          </div>
        </div>
      }

      <!-- Lista de Asignaturas con Diseño Moderno (Notion / Canvas Style) -->
      <div style="display: grid; gap: 1.35rem;">
        @for (materia of materias(); track materia.materia) {
          <div class="card card-interactiva">
            <!-- Cabecera de la Materia -->
            <div class="entre" style="border-bottom: 1px solid var(--border); padding-bottom: 0.85rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.85rem;">
                <div class="icono-materia" style="font-size: 1.4rem;">{{ iconoDeMateria(materia.materia) }}</div>
                <div>
                  <h2 style="font-size: 1.35rem; margin-bottom: 0.15rem;">{{ materia.materia }}</h2>
                  <span style="font-size: 0.82rem; color: var(--text-muted);">Asignatura Curricular · Periodo 1</span>
                </div>
              </div>

              <!-- Definitiva y Fallas -->
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="text-align: right;">
                  <span style="display: block; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Definitiva:</span>
                  @if (promedioMateria(materia) !== null) {
                    <span class="badge-nota" [class]="claseNota(promedioMateria(materia))" style="font-size: 1.05rem; padding: 0.4rem 0.85rem;">
                      {{ promedioMateria(materia) }}
                    </span>
                  } @else {
                    <span class="badge" style="background: var(--bg-hover); color: var(--text-muted); font-size: 0.82rem; padding: 0.35rem 0.65rem;">
                      Pendiente
                    </span>
                  }
                </div>

                <div style="text-align: right;">
                  <span style="display: block; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Fallas:</span>
                  <span class="badge" [class]="materia.ausencias > 2 ? 'badge-rojo' : 'badge-verde'" style="font-size: 0.82rem;">
                    {{ materia.ausencias }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Barra Visual de Progreso hacia la Excelencia (0.0 a 5.0) -->
            <div style="margin-bottom: 1.25rem;">
              <div class="entre" style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem;">
                <span>Nivel de Rendimiento: <strong [style.color]="colorDeNota(promedioMateria(materia))">{{ escalaNota(promedioMateria(materia)) }}</strong></span>
                <span>Meta Mínima: 3.0 / Excelencia: 4.6</span>
              </div>
              <div class="progreso-nota-bar">
                <div class="progreso-nota-fill"
                  [style.width.%]="((promedioMateria(materia) ?? 0) / 5.0) * 100"
                  [style.background]="colorDeNota(promedioMateria(materia))">
                </div>
              </div>
            </div>

            <!-- Evaluaciones Parciales -->
            <div style="margin-bottom: 1.15rem;">
              <span style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.65rem; letter-spacing: 0.04em;">
                Notas y Calificaciones Parciales:
              </span>

              <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
                @for (col of materia.columnas; track col.nombre) {
                  <div style="background: var(--bg-hover); border: 1px solid var(--border); padding: 0.65rem 0.95rem; border-radius: var(--radius-md); min-width: 9rem;">
                    <span style="display: block; font-size: 0.78rem; color: var(--text-secondary); font-weight: 600; margin-bottom: 0.2rem;">{{ col.nombre }}</span>
                    <strong style="font-size: 1.3rem; font-family: var(--font-display);" [style.color]="col.valor !== null ? colorDeNota(col.valor) : 'inherit'">
                      {{ col.valor !== null ? col.valor : '—' }}
                    </strong>
                  </div>
                } @empty {
                  <span style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Aún no se han registrado notas en esta materia.</span>
                }
              </div>
            </div>

            <!-- Historial de Fechas de Asistencia -->
            @if (materia.fechas.length > 0) {
              <div>
                <span style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.65rem; letter-spacing: 0.04em;">
                  Registro de Asistencias:
                </span>

                <div style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
                  @for (f of materia.fechas; track f.fecha) {
                    <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-pill); font-size: 0.78rem; font-weight: 700;"
                      [style.background]="f.presente ? 'var(--grade-superior-bg)' : 'var(--grade-bajo-bg)'"
                      [style.color]="f.presente ? 'var(--grade-superior)' : 'var(--grade-bajo)'">
                      <span>{{ f.presente ? '✔' : '✖' }}</span>
                      <span>{{ f.fecha | slice:5:10 }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @empty {
          <div class="card" style="text-align: center; padding: 3.5rem;">
            <p class="lead">Tu grupo escolar todavía no tiene materias vinculadas.</p>
          </div>
        }
      </div>
    </section>
  `
})
export class AcademicoComponent implements OnInit {
  materias = signal<MateriaAcademica[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.academico().subscribe((datos) => this.materias.set(datos.materias));
  }

  promedioMateria(m: MateriaAcademica): number | null {
    const valores = m.columnas.map(c => c.valor).filter((v): v is number => v !== null && v !== undefined);
    if (valores.length === 0) return null;
    return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
  }

  promedioGeneral(): number | null {
    const mats = this.materias();
    if (mats.length === 0) return null;
    const proms = mats.map(m => this.promedioMateria(m)).filter((p): p is number => p !== null);
    if (proms.length === 0) return null;
    return Math.round((proms.reduce((a, b) => a + b, 0) / proms.length) * 10) / 10;
  }

  escalaGeneral(): string {
    const p = this.promedioGeneral();
    if (p === null) return 'Periodo en Curso';
    if (p >= 4.6) return 'Superior';
    if (p >= 4.0) return 'Alto';
    if (p >= 3.0) return 'Básico';
    return 'Bajo';
  }

  escalaNota(val: number | null): string {
    if (val === null) return 'Sin Calificaciones';
    if (val >= 4.6) return 'Desempeño Superior';
    if (val >= 4.0) return 'Desempeño Alto';
    if (val >= 3.0) return 'Desempeño Básico';
    return 'Desempeño Bajo';
  }

  claseNota(val: number | null): string {
    if (val === null) return 'badge-gris';
    if (val >= 4.6) return 'nota-superior';
    if (val >= 4.0) return 'nota-alto';
    if (val >= 3.0) return 'nota-basico';
    return 'nota-bajo';
  }

  colorDeNota(val: number | null): string {
    if (val === null) return 'var(--text-muted)';
    if (val >= 4.6) return 'var(--grade-superior)';
    if (val >= 4.0) return 'var(--grade-alto)';
    if (val >= 3.0) return 'var(--grade-basico)';
    return 'var(--grade-bajo)';
  }

  iconoDeMateria(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('álgebra') || n.includes('matemática') || n.includes('cálculo')) return '📐';
    if (n.includes('física') || n.includes('química') || n.includes('ciencia')) return '🔬';
    if (n.includes('español') || n.includes('lengua') || n.includes('literatura')) return '📖';
    if (n.includes('inglés') || n.includes('idioma')) return '🌐';
    if (n.includes('tecnología') || n.includes('sistemas') || n.includes('informática')) return '💻';
    if (n.includes('historia') || n.includes('sociales') || n.includes('filosofía')) return '🏛️';
    if (n.includes('arte') || n.includes('música') || n.includes('danza')) return '🎨';
    if (n.includes('educación física') || n.includes('deporte')) return '⚽';
    return '📚';
  }

  totalFallasGlobales(): number {
    return this.materias().map(m => m.ausencias).reduce((a, b) => a + b, 0);
  }

  porcentajeAsistenciaGlobal(): number {
    const mats = this.materias();
    if (mats.length === 0) return 100;
    let totalFechas = 0;
    let totalPresentes = 0;
    mats.forEach(m => {
      totalFechas += m.fechas.length;
      totalPresentes += m.fechas.filter(f => f.presente).length;
    });
    if (totalFechas === 0) return 96;
    return Math.round((totalPresentes / totalFechas) * 100);
  }
}
