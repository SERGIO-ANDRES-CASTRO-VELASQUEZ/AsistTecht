import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { DashboardAcudiente } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-portal-acudiente',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="pagina">
      <!-- Hero Banner Familiar -->
      <div class="hero-banner-institucional no-print">
        <div class="hero-tag">
          <span class="pulsing-dot"></span>
          <span>Acompañamiento Escolar Familiar · Año Lectivo 2026</span>
        </div>
        <div class="entre" style="align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 1.85rem; margin-bottom: 0.35rem;">Portal de Familias y Acudientes</h1>
            <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 44rem; margin: 0;">
              Seguimiento en tiempo real de la presencia física en el plantel, notas parciales, boletín de calificaciones y convivencia escolar.
            </p>
          </div>

          <div class="acciones">
            <button type="button" class="btn-secundario" (click)="cargar()">
              <span>🔄</span> Actualizar Datos
            </button>
          </div>
        </div>
      </div>

      @if (error()) { <p class="aviso error no-print">{{ error() }}</p> }

      @if (cargando()) {
        <p class="lead">Consultando el registro escolar y biométrico de tus hijos...</p>
      } @else if (data()) {
        <div style="display: grid; gap: 1.75rem;">
          @for (hijo of data()!.hijos; track hijo.id) {
            <div class="card card-interactiva" style="border-top: 4px solid var(--primary);">
              <!-- Encabezado del Estudiante -->
              <div class="entre" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.85rem;">
                  <div class="avatar-circulo" style="width: 44px; height: 44px; font-size: 1.15rem;">
                    {{ hijo.nombre.charAt(0) }}
                  </div>
                  <div>
                    <h2 style="font-size: 1.45rem; margin-bottom: 0.2rem;">{{ hijo.nombre }}</h2>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
                      Documento: <strong>{{ hijo.documento }}</strong> · Grupo: <strong>{{ hijo.grupo }}</strong>
                    </p>
                  </div>
                </div>

                <div class="acciones">
                  <a [routerLink]="['/acudiente/boletin']" class="btn-principal" style="font-size: 0.88rem;">
                    <span>📜</span> Ver Boletín Oficial
                  </a>
                </div>
              </div>

              <!-- Tarjeta de Estado de Presencia en Tiempo Real -->
              <div style="margin: 1.25rem 0; padding: 1.15rem 1.35rem; border-radius: var(--radius-md); background: var(--bg-hover); border: 1px solid var(--border);">
                <div class="entre" style="flex-wrap: wrap; gap: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 0.85rem;">
                    <div style="width: 14px; height: 14px; border-radius: 50%;"
                      [style.background]="hijo.asistenciaHoy.asistio ? 'var(--grade-superior)' : 'var(--grade-basico)'"
                      [class.pulsing-dot]="hijo.asistenciaHoy.asistio">
                    </div>
                    <div>
                      <strong style="font-size: 1.05rem; display: block; color: var(--text-primary);">
                        {{ hijo.asistenciaHoy.asistio ? '¡Estudiante en el Plantel Educativo!' : 'Ingreso Pendiente de Registro Hoy' }}
                      </strong>
                      <span style="font-size: 0.82rem; color: var(--text-secondary);">
                        {{ hijo.asistenciaHoy.asistio ? 'Ingresó a su jornada académica correctamente.' : 'Aún no se ha marcado entrada por cámara o QR en el aula.' }}
                      </span>
                    </div>
                  </div>

                  @if (hijo.asistenciaHoy.detalle.length > 0) {
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-align: right;">
                      <span style="font-weight: 700; color: var(--primary);">Registrado a las {{ hijo.asistenciaHoy.detalle[0].hora }}</span>
                      <span style="display: block; font-size: 0.75rem;">Vía {{ hijo.asistenciaHoy.detalle[0].origen }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Métricas Académicas y Asistencia -->
              <div class="kpi-grid" style="margin: 1.25rem 0;">
                <div class="kpi-banner">
                  <div class="kpi-icono" style="background: var(--grade-superior-bg); color: var(--grade-superior);">✅</div>
                  <div class="kpi-info">
                    <span class="kpi-titulo">Asistencia Global</span>
                    <strong class="kpi-numero" style="color: var(--grade-superior);">{{ hijo.estadisticas.porcentajeAsistencia }}%</strong>
                    <span class="kpi-desc">{{ hijo.estadisticas.fallasAcumuladas }} inasistencias acumuladas</span>
                  </div>
                </div>

                <div class="kpi-banner">
                  <div class="kpi-icono" style="background: var(--grade-alto-bg); color: var(--grade-alto);">📈</div>
                  <div class="kpi-info">
                    <span class="kpi-titulo">Promedio Escolar</span>
                    <strong class="kpi-numero" [style.color]="hijo.estadisticas.promedioGeneral >= 3.0 ? 'var(--grade-superior)' : 'var(--grade-bajo)'">
                      {{ hijo.estadisticas.promedioGeneral }}
                    </strong>
                    <span class="kpi-desc">{{ hijo.estadisticas.promedioGeneral >= 3.0 ? 'Aprobando con normalidad' : 'Atención académica requerida' }}</span>
                  </div>
                </div>

                <div class="kpi-banner" [class.alerta]="hijo.diagnosticoIa.nivel === 'Critico' || hijo.diagnosticoIa.nivel === 'Alto'">
                  <div class="kpi-icono" [style.background]="hijo.diagnosticoIa.nivel === 'Bajo' ? 'var(--grade-superior-bg)' : 'var(--grade-bajo-bg)'"
                    [style.color]="hijo.diagnosticoIa.nivel === 'Bajo' ? 'var(--grade-superior)' : 'var(--grade-bajo)'">🤖</div>
                  <div class="kpi-info">
                    <span class="kpi-titulo">Diagnóstico IA</span>
                    <strong class="kpi-numero" style="font-size: 1.35rem;" [style.color]="colorNivel(hijo.diagnosticoIa.nivel)">Riesgo {{ hijo.diagnosticoIa.nivel }}</strong>
                    <span class="kpi-desc">{{ hijo.diagnosticoIa.factores.length > 0 ? hijo.diagnosticoIa.factores[0] : 'Desempeño adecuado' }}</span>
                  </div>
                </div>
              </div>

              <!-- Observador Escolar de Convivencia -->
              <div style="margin-top: 1.5rem;">
                <div class="entre" style="margin-bottom: 0.75rem;">
                  <h3 style="font-size: 1.15rem;">Observador de Convivencia Escolar</h3>
                  <a routerLink="/acudiente/convivencia" class="btn-accion-sm">Ver Historial Completo</a>
                </div>

                <div style="display: grid; gap: 0.65rem;">
                  @for (obs of hijo.observaciones; track obs.id) {
                    <div style="padding: 0.85rem 1.15rem; border-radius: var(--radius-md); background: var(--bg-hover); border: 1px solid var(--border);">
                      <div class="entre">
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                          <span class="badge" [class]="claseBadge(obs.tipo)">{{ obs.tipo }}</span>
                          <strong>{{ obs.titulo }}</strong>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">{{ obs.fecha }}</span>
                      </div>
                      <p style="margin: 0.45rem 0 0.25rem; font-size: 0.88rem; color: var(--text-secondary);">{{ obs.descripcion }}</p>
                      @if (obs.compromiso) {
                        <p style="margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--primary);">
                          🤝 <strong>Compromiso acordado:</strong> {{ obs.compromiso }}
                        </p>
                      }
                    </div>
                  } @empty {
                    <p class="aviso">El estudiante no registra llamados de atención en el observador escolar. ¡Excelente conducta!</p>
                  }
                </div>
              </div>

              <!-- Sugerencia Pedagógica de la IA para la Familia -->
              @if (hijo.diagnosticoIa.recomendacionPedagogica) {
                <div class="ai-banner-modern" style="margin-top: 1.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.5rem;">
                    <span class="ai-chip">💡 Acompañamiento Familiar IA</span>
                    <strong style="font-size: 0.95rem;">Recomendación Pedagógica para el Hogar</strong>
                  </div>
                  <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary);">
                    {{ hijo.diagnosticoIa.recomendacionPedagogica }}
                  </p>
                </div>
              }
            </div>
          } @empty {
            <p class="aviso">No tienes estudiantes vinculados a tu cuenta de acudiente. Comunícate con secretaría académica para asociar a tus hijos.</p>
          }
        </div>
      }
    </section>
  `
})
export class PortalAcudienteComponent implements OnInit {
  data = signal<DashboardAcudiente | null>(null);
  cargando = signal(true);
  error = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.dashboardAcudiente().subscribe({
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

  colorNivel(nivel: string): string {
    if (nivel === 'Critico') return 'var(--grade-bajo)';
    if (nivel === 'Alto') return 'var(--grade-basico)';
    if (nivel === 'Medio') return 'var(--grade-alto)';
    return 'var(--grade-superior)';
  }

  claseBadge(tipo: string): string {
    if (tipo === 'Felicitacion') return 'badge-verde';
    if (tipo === 'Atencion') return 'badge-azul';
    if (tipo === 'FaltaLeve') return 'badge-amarillo';
    return 'badge-rojo';
  }
}
