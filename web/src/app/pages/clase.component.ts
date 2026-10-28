import { AfterViewChecked, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CaraLeida, RostroService } from '../core/rostro.service';
import { EstadoMarca, EstudianteClase, Grupo, Materia, SesionDetalle } from '../core/models';
import { mensajeError } from '../core/errores';

interface Burbuja {
  token: string;
  nombre: string;
  estado: EstadoMarca;
  x: number;
  y: number;
}

interface EstudianteEscaneado {
  nombre: string;
  documento?: string;
  estado: EstadoMarca;
  hora: string;
  origen: 'qr' | 'rostro';
}

@Component({
  selector: 'app-clase',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina pagina-clase-scanner">
      @if (!sesion()) {
        <div class="clase-apertura-card">
          <div class="apertura-header">
            <div class="apertura-icon-badge">🪪</div>
            <div>
              <h1 style="margin: 0 0 0.35rem; font-size: 1.6rem; color: var(--text-primary);">Escáner de Asistencia Escolar</h1>
              <p class="lead" style="margin: 0;">Inicia la sesión para validar carnets digitales QR y biometría facial en tiempo real.</p>
            </div>
          </div>

          <form class="grilla apertura-form" (ngSubmit)="abrir()">
            <label>Materia
              <select [(ngModel)]="materiaId" name="materiaId" required>
                <option [ngValue]="0">Elige la materia</option>
                @for (materia of materias(); track materia.id) {
                  <option [ngValue]="materia.id">{{ materia.nombre }}</option>
                }
              </select>
            </label>
            <label>Grupo Escolar
              <select [(ngModel)]="grupoId" name="grupoId" required>
                <option [ngValue]="0">Elige el grupo</option>
                @for (grupo of gruposDeLaMateria(); track grupo.id) {
                  <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
                }
              </select>
            </label>
            <button class="btn-principal apertura-btn" type="submit">
              <span>📷</span> Abrir Cámara y Tomar Asistencia
            </button>
          </form>
          @if (error()) { <div class="aviso error" style="margin-top: 1rem;">{{ error() }}</div> }
        </div>
      } @else {
        <!-- Encabezado de la Sesión Activa -->
        <div class="scanner-session-header">
          <div class="session-info-pill">
            <div class="session-badge-icon">🏫</div>
            <div class="session-titles">
              <h2>{{ sesion()!.materia }} · Grupo {{ sesion()!.grupo }}</h2>
              <span class="session-time-text">Clase Activa Gimnasio José Eustasio Rivera</span>
            </div>
          </div>

          <div class="session-counter-badge">
            <span class="pulsing-live-dot"></span>
            <strong>{{ sesion()!.presentes }} / {{ sesion()!.total }}</strong>
            <span class="counter-label">Presentes ({{ porcentajeAsistencia() }}%)</span>
          </div>
        </div>

        <!-- Barra de Modos y Controles Superiores -->
        <div class="scanner-controls-bar">
          <div class="scanner-modes-group">
            <button type="button" class="scanner-mode-tab" [class.activo]="modo === 'qr'" (click)="usarModo('qr')">
              <span class="tab-icon">🪪</span>
              <span>Escanear Carnet QR</span>
            </button>
            <button type="button" class="scanner-mode-tab" [class.activo]="modo === 'rostro'" (click)="usarModo('rostro')">
              <span class="tab-icon">👁</span>
              <span>Geometría Facial</span>
            </button>
          </div>

          <div class="scanner-actions-group">
            @if (linternaDisponible()) {
              <button type="button" class="btn-scanner-action" (click)="alternarLinterna()">
                <span>{{ linternaEncendida() ? '💡 Luz ON' : '🔦 Linterna' }}</span>
              </button>
            }
            <button type="button" class="btn-scanner-action" (click)="cambiarCamara()" title="Alternar entre cámara frontal y trasera">
              <span>🔄 Cambiar Cámara</span>
            </button>
            <button type="button" class="btn-scanner-action btn-danger-action" (click)="cerrar()" title="Cerrar la cámara y finalizar clase">
              <span>✕ Finalizar</span>
            </button>
          </div>
        </div>

        @if (error()) { <div class="aviso error" style="margin-bottom: 1rem;">{{ error() }}</div> }

        <!-- Grid de la Escena: Visor Cyberpunk a la izquierda + Planilla a la derecha -->
        <div class="escena-scanner-grid">
          <!-- Contenedor del Visor de Video -->
          <div class="scanner-visor-wrapper">
            <div class="scanner-visor-box" [class.detected-glow]="carnetDetectado()">
              <video #video autoplay muted playsinline class="scanner-video-element"></video>

              <!-- Destello de escaneo exitoso -->
              @if (flashActivo()) {
                <div class="scanner-flash-effect"></div>
              }

              <!-- Retícula Holográfica para Escaneo de Carnet QR -->
              @if (modo === 'qr') {
                <div class="carnet-reticle-overlay" [class.detected]="carnetDetectado()">
                  <!-- Esquinas Tecnológicas -->
                  <div class="corner-bracket tl"></div>
                  <div class="corner-bracket tr"></div>
                  <div class="corner-bracket bl"></div>
                  <div class="corner-bracket br"></div>

                  <!-- Línea Láser de Escaneo en Movimiento Continuo -->
                  <div class="laser-scanner-beam"></div>

                  <!-- Zona Guía: Foto del Estudiante (Izquierda) -->
                  <div class="carnet-photo-zone">
                    <span class="zone-icon">👤</span>
                    <span class="zone-text">Foto Carnet</span>
                  </div>

                  <!-- Zona Guía: Código QR (Derecha) -->
                  <div class="carnet-qr-zone">
                    <div class="qr-target-corners"></div>
                    <span class="zone-icon">📷</span>
                    <span class="zone-text">Enfoca el QR aquí</span>
                  </div>

                  <!-- Leyenda Guía -->
                  <div class="carnet-guide-caption">
                    <span>🪪 Ubica el carnet dentro del marco para detección instantánea</span>
                  </div>
                </div>
              } @else {
                <!-- Retícula para Geometría Facial Biometría -->
                <div class="face-reticle-overlay">
                  <div class="face-silhouette-oval">
                    <div class="face-crosshair-h"></div>
                    <div class="face-crosshair-v"></div>
                  </div>
                  <div class="face-guide-caption">
                    <span>👁 Mira hacia la cámara para cotejar tu geometría facial</span>
                  </div>
                </div>
              }

              <!-- Burbujas Flotantes de Detección (QR / Rostro) -->
              @for (burbuja of burbujas(); track burbuja.token) {
                <div class="ar-bubble-badge" [attr.data-estado]="burbuja.estado" [style.left.px]="burbuja.x" [style.top.px]="burbuja.y">
                  <div class="bubble-pulse"></div>
                  <div class="bubble-content">
                    <strong>{{ burbuja.nombre || 'Detectando...' }}</strong>
                    <span>{{ texto(burbuja.estado) }}</span>
                  </div>
                </div>
              }

              <!-- Tarjeta Holográfica del Alumno Escaneado -->
              @if (ultimoEscaneado()) {
                <div class="scanned-student-hologram" [attr.data-estado]="ultimoEscaneado()!.estado">
                  <div class="hologram-avatar">
                    {{ inicialDe(ultimoEscaneado()!.nombre) }}
                  </div>
                  <div class="hologram-details">
                    <div class="hologram-header">
                      <span class="hologram-name">{{ ultimoEscaneado()!.nombre }}</span>
                      <span class="hologram-time">{{ ultimoEscaneado()!.hora }}</span>
                    </div>
                    <div class="hologram-meta">
                      @if (ultimoEscaneado()!.documento) {
                        <span class="meta-doc">Doc: {{ ultimoEscaneado()!.documento }}</span>
                      }
                      <span class="meta-origin">
                        {{ ultimoEscaneado()!.origen === 'qr' ? '🪪 Carnet QR Oficial' : '👁 Biometría Facial' }}
                      </span>
                    </div>
                    <div class="hologram-status-badge">
                      <span class="status-icon">
                        {{ ultimoEscaneado()!.estado === 'Anotado' ? '✓' : 'ℹ' }}
                      </span>
                      <span>{{ texto(ultimoEscaneado()!.estado) }}</span>
                    </div>
                  </div>
                  <button type="button" class="hologram-close-btn" (click)="ultimoEscaneado.set(null)" title="Cerrar aviso">✕</button>
                </div>
              }
            </div>

            <!-- Ayuda e Indicaciones para el Docente -->
            <div class="scanner-quick-tips">
              <span class="tip-pill">💡 <strong>Carnet:</strong> Puedes escanear el carnet físico impreso o el carnet digital desde el teléfono.</span>
              <span class="tip-pill">⚡ <strong>Rápido:</strong> Si un alumno no trae su carnet, puedes marcarlo manualmente en la lista lateral.</span>
            </div>
          </div>

          <!-- Panel Lateral: Lista de Asistencia en Tiempo Real -->
          <div class="scanner-roster-panel">
            <div class="roster-panel-header">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary);">Planilla de Asistencia</h3>
                <span class="roster-total-count">{{ sesion()!.estudiantes.length }} alumnos</span>
              </div>
            </div>

            <!-- Barra de Progreso de Asistencia -->
            <div class="roster-progress-track">
              <div class="roster-progress-fill" [style.width.%]="porcentajeAsistencia()"></div>
            </div>

            <!-- Filtros de Búsqueda y Pestañas -->
            <div class="roster-filters-row">
              <div class="roster-search-box">
                <span class="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar alumno..."
                  [(ngModel)]="filtroTexto"
                  name="filtroTexto"
                  class="roster-search-input"
                />
              </div>

              <div class="roster-tabs-row">
                <button
                  type="button"
                  class="roster-tab-btn"
                  [class.activo]="filtroTab() === 'todos'"
                  (click)="filtroTab.set('todos')"
                >
                  Todos ({{ sesion()!.estudiantes.length }})
                </button>
                <button
                  type="button"
                  class="roster-tab-btn"
                  [class.activo]="filtroTab() === 'anotados'"
                  (click)="filtroTab.set('anotados')"
                >
                  ✓ Presentes ({{ sesion()!.presentes }})
                </button>
                <button
                  type="button"
                  class="roster-tab-btn"
                  [class.activo]="filtroTab() === 'pendientes'"
                  (click)="filtroTab.set('pendientes')"
                >
                  ⏳ Pendientes ({{ sesion()!.total - sesion()!.presentes }})
                </button>
              </div>
            </div>

            <!-- Listado con Tarjetas de Estudiantes -->
            <div class="roster-students-list">
              @for (estudiante of estudiantesFiltrados(); track estudiante.id) {
                <div class="roster-student-item" [class.anotado]="estudiante.estado === 'Anotado'">
                  <div class="student-item-avatar">
                    {{ estudiante.nombre.charAt(0).toUpperCase() }}
                  </div>
                  <div class="student-item-info">
                    <strong class="student-item-name">{{ estudiante.nombre }}</strong>
                    <span class="student-item-meta">
                      @if (estudiante.estado === 'Anotado') {
                        <span class="time-stamp">✓ Registrado {{ estudiante.marcadaEn ? formatearHora(estudiante.marcadaEn) : 'en clase' }}</span>
                      } @else {
                        <span class="pending-stamp">⏳ Pendiente de registro</span>
                      }
                    </span>
                  </div>
                  <div class="student-item-action">
                    @if (estudiante.estado === 'Anotado') {
                      <span class="badge-presente">✓ Presente</span>
                    } @else {
                      <button
                        type="button"
                        class="btn-marcar-manual"
                        (click)="marcarManual(estudiante)"
                        title="Marcar asistencia manualmente"
                      >
                        + Marcar
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="roster-empty-state">
                  <p>No se encontraron estudiantes para este filtro.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `
})
export class ClaseComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  materias = signal<Materia[]>([]);
  grupos = signal<Grupo[]>([]);
  sesion = signal<SesionDetalle | null>(null);
  burbujas = signal<Burbuja[]>([]);
  error = signal('');
  materiaId = 0;
  grupoId = 0;

  modo: 'qr' | 'rostro' = 'qr';
  carnetDetectado = signal(false);
  flashActivo = signal(false);
  ultimoEscaneado = signal<EstudianteEscaneado | null>(null);
  filtroTexto = signal('');
  filtroTab = signal<'todos' | 'anotados' | 'pendientes'>('todos');
  linternaDisponible = signal(false);
  linternaEncendida = signal(false);

  private frente = true;
  private esperaCamara = false;
  private stream: MediaStream | null = null;
  private timer = 0;
  private activo = false;

  // Lector ZXing MultiFormat optimizado con TRY_HARDER
  private lectorQr = new MultiFormatReader();
  private lienzoQr = document.createElement('canvas');
  private lienzoSubQr = document.createElement('canvas');
  private enCurso = new Set<string>();
  private resueltos = new Map<string, { estado: EstadoMarca; nombre: string }>();
  private posiciones = new Map<string, { x: number; y: number; visto: number }>();
  private rachas = new Map<number, { veces: number; visto: number }>();
  private confirmados = new Map<number, EstadoMarca>();
  private leyendoCara = false;
  private confirmandoIds = new Set<number>();

  estudiantesFiltrados = computed(() => {
    const s = this.sesion();
    if (!s) return [];
    const busq = this.filtroTexto().trim().toLowerCase();
    const tab = this.filtroTab();
    return s.estudiantes.filter((e) => {
      const coincideTexto = !busq || e.nombre.toLowerCase().includes(busq);
      const coincideTab =
        tab === 'todos' ||
        (tab === 'anotados' && e.estado === 'Anotado') ||
        (tab === 'pendientes' && e.estado !== 'Anotado');
      return coincideTexto && coincideTab;
    });
  });

  porcentajeAsistencia = computed(() => {
    const s = this.sesion();
    if (!s || s.total === 0) return 0;
    return Math.round((s.presentes / s.total) * 100);
  });

  constructor(
    private api: ApiService,
    private zone: NgZone,
    private rostro: RostroService
  ) {
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    this.lectorQr.setHints(hints);
  }

  ngOnInit(): void {
    this.api.materias().subscribe((lista) => this.materias.set(lista));
    this.api.grupos().subscribe((lista) => this.grupos.set(lista));
  }

  ngAfterViewChecked(): void {
    if (this.esperaCamara && this.video?.nativeElement) {
      this.esperaCamara = false;
      void this.encender();
    }
  }

  ngOnDestroy(): void {
    this.apagar();
  }

  gruposDeLaMateria(): Grupo[] {
    return this.grupos().filter((grupo) => grupo.materiaIds.includes(this.materiaId));
  }

  abrir(): void {
    this.error.set('');
    if (!this.materiaId || !this.grupoId) {
      this.error.set('Elige materia y grupo escolar.');
      return;
    }
    this.api.abrirSesion(this.materiaId, this.grupoId).subscribe({
      next: (detalle) => {
        this.error.set('');
        this.sesion.set(detalle);
        this.esperaCamara = true;
      },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  cerrar(): void {
    this.apagar();
    this.sesion.set(null);
    this.burbujas.set([]);
    this.ultimoEscaneado.set(null);
  }

  cambiarCamara(): void {
    this.frente = !this.frente;
    this.apagar();
    void this.encender();
  }

  async alternarLinterna(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = (track.getCapabilities?.() as any) || {};
      if (caps.torch) {
        const nuevoEstado = !this.linternaEncendida();
        await (track as any).applyConstraints({ advanced: [{ torch: nuevoEstado }] });
        this.linternaEncendida.set(nuevoEstado);
      }
    } catch {}
  }

  usarModo(modo: 'qr' | 'rostro'): void {
    if (this.modo === modo) return;
    this.modo = modo;
    this.burbujas.set([]);
    this.rachas.clear();
    if (!this.activo) return;
    window.clearTimeout(this.timer);
    if (modo === 'rostro') void this.bucleRostro();
    else void this.iniciarLectura();
  }

  texto(estado: EstadoMarca): string {
    switch (estado) {
      case 'Anotado': return 'Asistencia Anotada';
      case 'YaRegistrado': return 'Ya Estaba Registrado';
      case 'NoPertenece': return 'No Pertenece a Este Grupo';
      case 'NoEncontrado': return 'Carnet No Encontrado';
      default: return 'Verificando…';
    }
  }

  inicialDe(nombre?: string): string {
    return nombre ? nombre.trim().charAt(0).toUpperCase() : 'E';
  }

  formatearHora(iso?: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  marcarManual(estudiante: EstudianteClase): void {
    const sesion = this.sesion();
    if (!sesion) return;
    this.anotarEnLista(estudiante.nombre);
    this.sonar();
    this.activarFeedbackCarnet();
    const ahora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.ultimoEscaneado.set({
      nombre: estudiante.nombre,
      estado: 'Anotado',
      hora: ahora,
      origen: 'qr'
    });
  }

  private async encender(): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('El navegador no entregó la cámara. En el computador usa http://localhost:8080. En celular usa https://IP:8443.');
      return;
    }
    this.activo = true;
    const facingMode = this.frente ? 'environment' : 'user';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
    } catch {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } catch {
        this.error.set('No se pudo abrir la cámara. Revisa los permisos del navegador.');
        return;
      }
    }

    video.srcObject = this.stream;
    await video.play();

    // Comprobar soporte de linterna
    const track = this.stream.getVideoTracks()[0];
    if (track) {
      const caps = (track.getCapabilities?.() as any) || {};
      this.linternaDisponible.set(!!caps.torch);
    }

    if (this.modo === 'rostro') {
      await this.bucleRostro();
      return;
    }
    await this.iniciarLectura();
  }

  private async iniciarLectura(): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video || !this.activo || this.modo !== 'qr') return;

    const detector = 'BarcodeDetector' in window ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null;

    const paso = async () => {
      if (!this.activo || this.modo !== 'qr') return;
      const actual = this.video?.nativeElement;
      if (actual && actual.readyState >= 2) {
        try {
          const codigos: any[] = detector ? await detector.detect(actual) : [];
          const propios = this.leerVariosQr(actual);

          this.zone.run(() => {
            const vistos = new Set<string>();
            for (const codigo of codigos) {
              const crudo = (codigo.rawValue || '').trim();
              if (crudo) {
                vistos.add(crudo.toLowerCase());
                this.recibir(crudo, codigo.boundingBox);
              }
            }
            for (const codigo of propios) {
              const crudo = (codigo.texto || '').trim();
              if (!crudo || vistos.has(crudo.toLowerCase())) continue;
              vistos.add(crudo.toLowerCase());
              this.recibir(crudo, undefined, codigo.puntos);
            }
            this.ocultarAusentes(vistos);
          });
        } catch {
          /* un fallo puntual no interrumpe el ciclo de escaneo */
        }
      }
      if (!this.activo || this.modo !== 'qr') return;
      this.timer = window.setTimeout(() => void paso(), 180);
    };
    void paso();
  }

  /**
   * Motor de decodificación multicapa optimizado para Carnets Escolares:
   * 1. Sub-recuadro dedicado de código QR (mitad derecha del marco del carnet) a resolución nativa 100%.
   * 2. Recuadro completo del carnet en el centro.
   * 3. Pantalla completa escalada.
   */
  private leerVariosQr(video: HTMLVideoElement): Array<{ texto: string; puntos: Array<{ x: number; y: number }> }> {
    const anchoVideo = video.videoWidth;
    const altoVideo = video.videoHeight;
    if (!anchoVideo || !altoVideo) return [];

    const hallados: Array<{ texto: string; puntos: Array<{ x: number; y: number }> }> = [];
    const ya = new Set<string>();

    // 1. CAPA PRIORITARIA: Recorte de alta resolución de la zona del QR del Carnet (lado derecho)
    const carnetW = Math.round(anchoVideo * 0.70);
    const carnetH = Math.round(carnetW / 1.72);
    const carnetX = Math.round((anchoVideo - carnetW) / 2);
    const carnetY = Math.round((altoVideo - carnetH) / 2);

    const qrCropX = Math.max(0, Math.round(carnetX + carnetW * 0.48));
    const qrCropY = Math.max(0, Math.round(carnetY + carnetH * 0.08));
    const qrCropW = Math.min(anchoVideo - qrCropX, Math.round(carnetW * 0.50));
    const qrCropH = Math.min(altoVideo - qrCropY, Math.round(carnetH * 0.84));

    if (qrCropW > 30 && qrCropH > 30) {
      this.lienzoSubQr.width = qrCropW;
      this.lienzoSubQr.height = qrCropH;
      const ctxSub = this.lienzoSubQr.getContext('2d', { willReadFrequently: true });
      if (ctxSub) {
        ctxSub.drawImage(video, qrCropX, qrCropY, qrCropW, qrCropH, 0, 0, qrCropW, qrCropH);
        const subRes = this.decodificarLienzo(this.lienzoSubQr, qrCropW, qrCropH);
        if (subRes) {
          ya.add(subRes.texto.toLowerCase());
          hallados.push({
            texto: subRes.texto,
            puntos: subRes.puntos.map((p) => ({ x: p.x + qrCropX, y: p.y + qrCropY }))
          });
          return hallados;
        }
      }
    }

    // 2. CAPA SECUNDARIA: Recorte de todo el marco del carnet en el centro
    if (carnetW > 50 && carnetH > 50) {
      this.lienzoSubQr.width = carnetW;
      this.lienzoSubQr.height = carnetH;
      const ctxCarnet = this.lienzoSubQr.getContext('2d', { willReadFrequently: true });
      if (ctxCarnet) {
        ctxCarnet.drawImage(video, carnetX, carnetY, carnetW, carnetH, 0, 0, carnetW, carnetH);
        const carnetRes = this.decodificarLienzo(this.lienzoSubQr, carnetW, carnetH);
        if (carnetRes && !ya.has(carnetRes.texto.toLowerCase())) {
          ya.add(carnetRes.texto.toLowerCase());
          hallados.push({
            texto: carnetRes.texto,
            puntos: carnetRes.puntos.map((p) => ({ x: p.x + carnetX, y: p.y + carnetY }))
          });
          return hallados;
        }
      }
    }

    // 3. CAPA GLOBAL: Video completo escalado
    const escala = Math.min(1, 1280 / Math.max(anchoVideo, altoVideo));
    const ancho = Math.max(1, Math.round(anchoVideo * escala));
    const alto = Math.max(1, Math.round(altoVideo * escala));
    this.lienzoQr.width = ancho;
    this.lienzoQr.height = alto;
    const ctx = this.lienzoQr.getContext('2d', { willReadFrequently: true });
    if (!ctx) return hallados;
    ctx.drawImage(video, 0, 0, ancho, alto);

    const imagen = ctx.getImageData(0, 0, ancho, alto);
    const grises = new Uint8ClampedArray(ancho * alto);
    for (let i = 0, j = 0; i < imagen.data.length; i += 4, j++) {
      grises[j] = (imagen.data[i] * 77 + imagen.data[i + 1] * 150 + imagen.data[i + 2] * 29) >> 8;
    }

    for (let intento = 0; intento < 4; intento++) {
      try {
        this.lectorQr.reset();
        const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(grises.slice(), ancho, alto)));
        const resultado = this.lectorQr.decode(bitmap);
        const texto = resultado.getText();
        if (ya.has(texto.toLowerCase())) break;
        ya.add(texto.toLowerCase());
        const puntos = (resultado.getResultPoints() ?? []).map((punto) => ({
          x: punto.getX() / escala,
          y: punto.getY() / escala
        }));
        hallados.push({ texto, puntos });
        taparQr(grises, ancho, alto, resultado.getResultPoints() ?? []);
      } catch {
        break;
      }
    }
    return hallados;
  }

  private decodificarLienzo(canvas: HTMLCanvasElement, w: number, h: number): { texto: string; puntos: Array<{ x: number; y: number }> } | null {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const imgData = ctx.getImageData(0, 0, w, h);
    const grises = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < imgData.data.length; i += 4, j++) {
      grises[j] = (imgData.data[i] * 77 + imgData.data[i + 1] * 150 + imgData.data[i + 2] * 29) >> 8;
    }
    try {
      this.lectorQr.reset();
      const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(grises, w, h)));
      const res = this.lectorQr.decode(bitmap);
      const puntos = (res.getResultPoints() ?? []).map((p) => ({ x: p.getX(), y: p.getY() }));
      return { texto: res.getText(), puntos };
    } catch {
      return null;
    }
  }

  private async bucleRostro(): Promise<void> {
    try {
      await this.rostro.preparar();
    } catch {
      this.error.set('No se pudieron cargar los modelos de biometría facial.');
      return;
    }
    const paso = async () => {
      if (!this.activo || this.modo !== 'rostro') return;
      const video = this.video?.nativeElement;
      if (video && video.readyState >= 2 && !this.leyendoCara) {
        this.leyendoCara = true;
        try {
          const caras = await this.rostro.describirTodas(video);
          this.zone.run(() => void this.recibirCaras(caras));
        } catch {
          /* un fallo puntual no interrumpe la lectura */
        } finally {
          this.leyendoCara = false;
        }
      }
      if (!this.activo || this.modo !== 'rostro') return;
      this.timer = window.setTimeout(() => void paso(), 380);
    };
    void paso();
  }

  private async recibirCaras(caras: CaraLeida[]): Promise<void> {
    const sesion = this.sesion();
    const video = this.video?.nativeElement;
    if (!sesion || !video) return;
    const ahora = Date.now();
    const vistos = new Set<string>();

    const lecturas = await Promise.all(
      caras.map(async (cara) => {
        const ancho = cara.box.width / video.videoWidth;
        try {
          const marca = await firstValueFrom(this.api.reconocer(sesion.id, cara.vector, false, ancho));
          if (!marca.seguro || !marca.estudianteId || !marca.nombre) return null;
          return { cara, ancho, id: marca.estudianteId, nombre: marca.nombre };
        } catch {
          return null;
        }
      })
    );

    const porId = new Map<number, { cara: CaraLeida; ancho: number; nombre: string }>();
    for (const lectura of lecturas) {
      if (!lectura || porId.has(lectura.id)) continue;
      porId.set(lectura.id, lectura);
    }

    for (const [id, dato] of porId) {
      const previo = this.rachas.get(id);
      const veces = previo && ahora - previo.visto < 900 ? previo.veces + 1 : 1;
      this.rachas.set(id, { veces, visto: ahora });
      const token = `rostro-${id}`;
      vistos.add(token);
      const sitio = this.ubicar({
        x: dato.cara.box.x,
        y: dato.cara.box.y,
        width: dato.cara.box.width,
        height: dato.cara.box.height
      } as DOMRectReadOnly);
      if (sitio) this.posiciones.set(token, { ...sitio, visto: ahora });
      const ya = this.confirmados.get(id);
      this.pintar(token, dato.nombre, ya ?? 'Consultando');
      if (ya || veces < 2 || this.confirmandoIds.has(id)) continue;
      this.confirmandoIds.add(id);

      this.api.reconocer(sesion.id, dato.cara.vector, true, dato.ancho).subscribe({
        next: (final) => {
          this.confirmandoIds.delete(id);
          if (!final.estudianteId || !final.nombre) return;
          this.confirmados.set(final.estudianteId, final.estado);
          this.pintar(`rostro-${final.estudianteId}`, final.nombre, final.estado);

          const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          this.ultimoEscaneado.set({
            nombre: final.nombre,
            estado: final.estado,
            hora: horaActual,
            origen: 'rostro'
          });

          if (final.estado === 'Anotado') {
            this.sonar();
            this.activarFeedbackCarnet();
            this.anotarEnLista(final.nombre);
          }
        },
        error: () => this.confirmandoIds.delete(id)
      });
    }
    this.ocultarAusentes(vistos);
  }

  private recibir(crudo: string, caja?: DOMRectReadOnly, puntos?: Array<{ x: number; y: number }>): void {
    const raw = (crudo || '').trim();
    if (!raw) return;

    // Extracción limpia del token: aqr_... o número de documento del alumno
    const matchAqr = raw.match(/aqr_[0-9a-f]{32}/i);
    const matchDoc = raw.match(/\b\d{6,12}\b/);
    const token = matchAqr ? matchAqr[0].toLowerCase() : (matchDoc ? matchDoc[0] : raw.toLowerCase());

    if (!token) return;

    const sitio = this.ubicar(caja, puntos);
    if (sitio) this.posiciones.set(token, { ...sitio, visto: Date.now() });

    const conocido = this.resueltos.get(token);
    if (conocido) {
      this.pintar(token, conocido.nombre, conocido.estado);
      return;
    }

    this.pintar(token, '', 'Consultando');
    if (this.enCurso.has(token)) return;

    const sesion = this.sesion();
    if (!sesion) return;
    this.enCurso.add(token);

    this.activarFeedbackCarnet();

    this.api.marcar(sesion.id, token).subscribe({
      next: (marca) => {
        this.enCurso.delete(token);
        const nombre = marca.nombre ?? 'Estudiante';
        const documento = (marca as any).documento ?? '';
        this.resueltos.set(token, { estado: marca.estado, nombre });
        this.pintar(token, nombre, marca.estado);

        const ahora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.ultimoEscaneado.set({
          nombre,
          documento,
          estado: marca.estado,
          hora: ahora,
          origen: 'qr'
        });

        if (marca.estado === 'Anotado') {
          this.sonar();
          this.anotarEnLista(nombre);
        }
      },
      error: () => this.enCurso.delete(token)
    });
  }

  private activarFeedbackCarnet(): void {
    this.carnetDetectado.set(true);
    this.flashActivo.set(true);
    window.setTimeout(() => this.flashActivo.set(false), 300);
    window.setTimeout(() => this.carnetDetectado.set(false), 2400);
  }

  private ubicar(caja?: DOMRectReadOnly, puntos?: Array<{ x: number; y: number }>): { x: number; y: number } | null {
    const video = this.video?.nativeElement;
    if (!video?.videoWidth) return null;
    let x = 0;
    let y = 0;
    let ancho = 0;
    let alto = 0;
    if (caja && caja.width) {
      x = caja.x; y = caja.y; ancho = caja.width; alto = caja.height;
    } else if (puntos && puntos.length) {
      const xs = puntos.map((punto) => punto.x);
      const ys = puntos.map((punto) => punto.y);
      x = Math.min(...xs);
      y = Math.min(...ys);
      ancho = Math.max(...xs) - x;
      alto = Math.max(...ys) - y;
    } else {
      return { x: video.clientWidth / 2, y: 48 };
    }
    const escala = Math.min(video.clientWidth / video.videoWidth, video.clientHeight / video.videoHeight);
    const margenX = (video.clientWidth - video.videoWidth * escala) / 2;
    const margenY = (video.clientHeight - video.videoHeight * escala) / 2;
    return {
      x: margenX + (x + ancho / 2) * escala,
      y: margenY + y * escala
    };
  }

  private pintar(token: string, nombre: string, estado: EstadoMarca): void {
    const sitio = this.posiciones.get(token) ?? { x: 24, y: 24, visto: Date.now() };
    const actual = this.burbujas().filter((burbuja) => burbuja.token !== token);
    actual.push({ token, nombre, estado, x: sitio.x, y: sitio.y });
    this.burbujas.set(actual);
  }

  private ocultarAusentes(vistos: Set<string>): void {
    const ahora = Date.now();
    for (const [token, sitio] of this.posiciones) {
      if (!vistos.has(token) && ahora - sitio.visto > 900) this.posiciones.delete(token);
    }
    this.burbujas.set(this.burbujas().filter((burbuja) => this.posiciones.has(burbuja.token)));
  }

  private anotarEnLista(nombre: string): void {
    const sesion = this.sesion();
    if (!sesion) return;
    const estudiantes = sesion.estudiantes.map((estudiante) =>
      estudiante.nombre === nombre && estudiante.estado !== 'Anotado'
        ? { ...estudiante, estado: 'Anotado' as const, marcadaEn: new Date().toISOString() }
        : estudiante
    );
    const presentes = estudiantes.filter((estudiante) => estudiante.estado === 'Anotado').length;
    this.sesion.set({ ...sesion, estudiantes, presentes });
  }

  private sonar(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gan = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.10);

      gan.gain.setValueAtTime(0.08, ctx.currentTime);
      gan.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);

      osc.connect(gan);
      gan.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.20);
    } catch {}
  }

  private apagar(): void {
    this.activo = false;
    window.clearTimeout(this.timer);
    this.stream?.getTracks().forEach((pista) => pista.stop());
    this.stream = null;
    if (this.video?.nativeElement) this.video.nativeElement.srcObject = null;
  }
}

function taparQr(
  grises: Uint8ClampedArray,
  ancho: number,
  alto: number,
  puntos: Array<{ getX(): number; getY(): number }>
): void {
  if (!puntos.length) return;
  const xs = puntos.map((punto) => punto.getX());
  const ys = puntos.map((punto) => punto.getY());
  const margen = 16;
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - margen));
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - margen));
  const x1 = Math.min(ancho - 1, Math.ceil(Math.max(...xs) + margen));
  const y1 = Math.min(alto - 1, Math.ceil(Math.max(...ys) + margen));
  for (let y = y0; y <= y1; y++) {
    grises.fill(255, y * ancho + x0, y * ancho + x1 + 1);
  }
}
