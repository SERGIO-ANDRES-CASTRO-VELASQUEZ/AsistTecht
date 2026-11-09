import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-qr',
  imports: [RouterLink, CommonModule],
  template: `
    <section class="pagina centrada-mobile">
      <div class="qr-container-wrapper">
        <!-- Encabezado de Identidad Digital -->
        <div class="carnet-digital-card">
          <header class="carnet-header">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="logo-escuela" style="width: 40px; height: 40px; font-size: 1.1rem;">GIR</div>
                <div style="text-align: left;">
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-primary); line-height: 1.2;">
                    Gimnasio José Eustasio Rivera
                  </strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Carnet Digital Institucional</span>
                </div>
              </div>
              <div class="carnet-chip-seguridad" title="Cifrado con token único">
                <span class="pulsing-dot"></span>
                <span>ACTIVO 2026</span>
              </div>
            </div>
          </header>

          <!-- Perfil del Estudiante -->
          <div class="carnet-perfil">
            <div class="carnet-avatar" style="overflow: hidden;">
              @if (tieneFoto()) {
                <img src="/api/cuenta/foto" (error)="tieneFoto.set(false)" alt="Foto del estudiante" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
              } @else {
                {{ inicial() }}
              }
            </div>
            <div class="carnet-datos">
              <h2 class="carnet-nombre">{{ nombre() || 'Cargando Estudiante...' }}</h2>
              <div class="carnet-meta-tags">
                <span class="badge badge-verde">{{ grupo() ? 'Grado ' + grupo() : 'Estudiante' }}</span>
                <span class="badge badge-azul">Jornada Mañana</span>
                @if (documento()) {
                  <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border);">
                    Doc: {{ documento() }}
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- Contenedor del Código QR Responsivo -->
          <div class="carnet-qr-area">
            @if (url()) {
              <div class="qr-marco-blanco">
                <img class="qr-imagen" [src]="url()" alt="Código QR de asistencia institucional" />
              </div>
              <div class="qr-instruccion">
                <span style="font-size: 1rem;">📷</span>
                <span>Muestra este código a la cámara para registrar tu asistencia automáticamente.</span>
              </div>
            } @else {
              <div class="qr-cargando-box">
                <div class="pulsing-dot" style="margin: 0 auto 0.5rem;"></div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Generando código QR dinámico de alta seguridad...</p>
              </div>
            }
          </div>

          <!-- Botones de Acción Totalmente Responsivos -->
          <div class="carnet-acciones-grid">
            @if (url()) {
              <a class="btn-principal carnet-btn" [href]="url()" download="qr-asistencia-asisttecht.png">
                <span>📥</span> Guardar QR en Teléfono
              </a>
            }
            <a class="btn-secundario carnet-btn" routerLink="/estudiante/rostro">
              <span>📸</span> Biometría Facial
            </a>
            @if (carnetListo()) {
              <button type="button" class="btn-secundario carnet-btn" (click)="carnet()">
                <span>🪪</span> Carnet Completo (PNG)
              </button>
            }
          </div>

          <!-- Pie de Seguridad Criptográfica -->
          <footer class="carnet-footer-seguridad">
            <span style="font-size: 0.95rem;">🔒</span>
            <span>Código único personal e intransferible. El sistema verifica tu rostro en clase para validar la marca.</span>
          </footer>
        </div>

        @if (error()) {
          <div class="aviso error" style="margin-top: 1rem; width: 100%;">{{ error() }}</div>
        }
      </div>
    </section>
  `
})
export class QrComponent implements OnInit, OnDestroy {
  url = signal('');
  nombre = signal('');
  documento = signal('');
  grupo = signal('');
  carnetListo = signal(false);
  tieneFoto = signal(false);
  error = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.perfil().subscribe({
      next: (perfil) => {
        this.nombre.set(perfil.nombre);
        this.documento.set(perfil.documento ?? '');
        this.grupo.set(perfil.grupo ?? '');
        this.carnetListo.set(!!perfil.carnet);
        this.tieneFoto.set(!!perfil.tieneFoto);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
      }
    });

    this.api.qr().subscribe({
      next: (blob) => this.url.set(URL.createObjectURL(blob)),
      error: (err) => this.error.set(mensajeError(err))
    });
  }

  inicial(): string {
    const n = this.nombre();
    return n ? n.charAt(0).toUpperCase() : 'E';
  }

  carnet(): void {
    this.api.carnetPropio().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `carnet-${this.nombre().toLowerCase().replace(/\s+/g, '-')}.png`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  ngOnDestroy(): void {
    const actual = this.url();
    if (actual) URL.revokeObjectURL(actual);
  }
}
