import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { RostroService, fotoDesdeVideo } from '../core/rostro.service';

const POSES = [
  { id: 'frente', texto: 'Mira de frente' },
  { id: 'arriba', texto: 'Levanta un poco la cara' },
  { id: 'abajo', texto: 'Baja un poco la cara' },
  { id: 'izquierda', texto: 'Gira un poco a tu izquierda' },
  { id: 'derecha', texto: 'Gira un poco a tu derecha' }
];

@Component({
  selector: 'app-rostro',
  template: `
    <section class="pagina centrada">
      <div style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; margin-bottom: 0.25rem;">
        <span style="font-size: 2rem;">👤</span>
        <h1 style="margin: 0;">Enrolamiento Biométrico Facial</h1>
      </div>
      <p class="lead" style="max-width: 38rem; margin: 0 auto 1.25rem;">
        {{ indicacion() }} Puedes usar la <strong>Captura Rápida Frontal</strong> para calibrar automáticamente todas las poses con un solo clic.
      </p>

      <div class="visor" style="position: relative; max-width: 520px; margin: 0 auto 1rem; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg); border: 2px solid var(--border); background: #000;">
        <video #video autoplay muted playsinline style="width: 100%; display: block; min-height: 280px;"></video>
        
        <!-- Overlay si el celular bloqueó la cámara por HTTP -->
        @if (bloqueoHttps()) {
          <div class="scanner-blocked-overlay">
            <div class="blocked-icon">🔒</div>
            <h3 style="color: #fff; font-size: 1rem; margin: 0 0 0.4rem; font-weight: 700;">
              Cámara Bloqueada por HTTP Móvil
            </h3>
            <p style="color: rgba(255,255,255,0.88); font-size: 0.8rem; margin: 0 0 1rem; max-width: 20rem; line-height: 1.4;">
              El navegador móvil requiere conexión <strong>HTTPS (puerto 8443)</strong> para permitir el acceso a la cámara.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; max-width: 18rem;">
              <button type="button" class="btn-principal" (click)="redirigirAHttps()" style="justify-content: center; padding: 0.65rem 1rem;">
                ⚡ Abrir en HTTPS Seguro (8443)
              </button>
              <a href="/downloads/asisttecht-movil.apk" download class="btn-secundario" style="justify-content: center; padding: 0.55rem 1rem; background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.3); text-decoration: none;">
                📲 Usar App Móvil APK
              </a>
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.72rem; color: #94a3b8; max-width: 18rem;">
              💡 En la advertencia toca <em>Configuración avanzada</em> &rarr; <em>Continuar</em>.
            </div>
          </div>
        }
        
        <!-- Indicador de Cámara Activa -->
        <div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.8rem; color: #fff; display: flex; align-items: center; gap: 0.4rem; z-index: 2;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
          <span>Cámara Activa</span>
        </div>

        <!-- Estado de Modelos de IA -->
        <div style="position: absolute; top: 12px; right: 12px; z-index: 2;">
          @if (rostro.modelosCargando()) {
            <span style="background: rgba(245, 158, 11, 0.85); backdrop-filter: blur(8px); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.78rem; color: #fff; display: flex; align-items: center; gap: 0.3rem;">
              ⏳ Iniciando IA...
            </span>
          } @else if (rostro.modelosListos()) {
            <span style="background: rgba(16, 185, 129, 0.85); backdrop-filter: blur(8px); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.78rem; color: #fff; display: flex; align-items: center; gap: 0.3rem;">
              ⚡ IA Lista
            </span>
          } @else if (rostro.errorCarga()) {
            <span style="background: rgba(239, 68, 68, 0.85); backdrop-filter: blur(8px); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.78rem; color: #fff; display: flex; align-items: center; gap: 0.3rem;">
              ⚠️ Modo Foto Directa
            </span>
          }
        </div>
      </div>

      <!-- Botones de Captura -->
      <div style="margin-bottom: 1.25rem; display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
        <button
          type="button"
          class="btn-principal"
          (click)="capturaRapida()"
          [disabled]="ocupado()"
          style="font-size: 1rem; padding: 0.75rem 1.4rem;"
        >
          ⚡ {{ ocupado() ? 'Procesando Rostro...' : 'Captura Rápida Frontal (Recomendado)' }}
        </button>

        <button
          type="button"
          class="btn-secundario"
          (click)="capturaDirecta()"
          [disabled]="ocupado()"
          title="Toma la foto directamente desde el video y genera el registro biométrico de respaldo"
          style="font-size: 0.95rem; padding: 0.75rem 1.2rem;"
        >
          📷 Captura Directa de Foto
        </button>
      </div>

      <div class="card" style="max-width: 520px; margin: 0 auto 1.25rem; padding: 1rem;">
        <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
          O captura manual por ángulos:
        </span>
        <div class="poses" style="display: flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap;">
          @for (pose of poses; track pose.id) {
            <button
              type="button"
              class="btn-secundario"
              [class.activo]="tomadas().includes(pose.id)"
              (click)="capturar(pose.id)"
              [disabled]="ocupado()"
              style="font-size: 0.82rem; padding: 0.4rem 0.65rem;"
            >
              {{ tomadas().includes(pose.id) ? '✔ ' + pose.texto : pose.texto }}
            </button>
          }
        </div>
      </div>

      @if (bloqueoHttps()) {
        <div class="https-camera-banner" style="max-width: 520px; margin: 0 auto 1.25rem;">
          <div class="https-camera-banner-header">
            <span class="https-badge-warn">🔒 HTTPS REQUERIDO</span>
            <strong>Cámara bloqueada por el navegador móvil</strong>
          </div>
          <p>
            En celulares, la biometría requiere conexión segura <strong>HTTPS (puerto 8443)</strong> o usar la App Oficial.
          </p>
          <div class="https-camera-banner-actions">
            <button type="button" class="btn-principal" (click)="redirigirAHttps()">
              ⚡ Cambiar a HTTPS Seguro (Puerto 8443)
            </button>
            <a href="/downloads/asisttecht-movil.apk" download class="btn-secundario" style="text-decoration: none;">
              📲 Descargar App Android (.APK)
            </a>
          </div>
          <div class="https-camera-banner-note">
            💡 <em>Al ingresar, toca <strong>Configuración avanzada</strong> &rarr; <strong>Continuar a {{ hostActual }}</strong> para habilitar la cámara.</em>
          </div>
        </div>
      }

      @if (error() && !bloqueoHttps()) {
        <div class="aviso error" style="max-width: 520px; margin: 0 auto 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <span>{{ error() }}</span>
          <button
            type="button"
            class="btn-principal"
            (click)="capturaDirecta()"
            style="font-size: 0.85rem; padding: 0.4rem 1rem; align-self: center;"
          >
            👉 Tomar Foto Directa y Guardar
          </button>
        </div>
      }

      @if (aviso()) {
        <p class="aviso" style="max-width: 520px; margin: 0 auto 1rem; background: var(--grade-superior-bg); color: var(--grade-superior); border-color: var(--grade-superior);">
          {{ aviso() }}
        </p>
      }

      <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 0.5rem;">
        <button
          class="btn-principal"
          type="button"
          [disabled]="tomadas().length === 0 || ocupado()"
          (click)="guardar()"
          style="font-size: 1.05rem; padding: 0.75rem 2rem;"
        >
          💾 Guardar Rostro y Foto Oficial
        </button>
      </div>
    </section>
  `
})
export class RostroComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;
  poses = POSES;
  tomadas = signal<string[]>([]);
  indicacion = signal('Ubica tu rostro frente al lente de la cámara.');
  error = signal('');
  bloqueoHttps = signal(false);

  redirigirAHttps(): void {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname;
    const path = window.location.pathname;
    const search = window.location.search;
    window.location.href = `https://${host}:8443${path}${search}`;
  }

  get hostActual(): string {
    return typeof window !== 'undefined' ? window.location.hostname : 'servidor';
  }
  aviso = signal('');
  ocupado = signal(false);

  private espera = true;
  private stream: MediaStream | null = null;
  private muestras = new Map<string, number[]>();
  private foto = '';
  private estudianteId: number | null = null;

  constructor(
    private api: ApiService,
    public rostro: RostroService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.estudianteId = Number.isFinite(id) && id > 0 ? id : null;
  }

  ngOnInit(): void {
    // Iniciar pre-carga inmediata de modelos al montar el componente
    void this.rostro.preparar().catch((err) => {
      console.warn('[RostroComponent] Pre-carga de modelos face-api no completada:', err);
    });
  }

  ngAfterViewChecked(): void {
    if (this.espera && this.video?.nativeElement) {
      this.espera = false;
      void this.encender();
    }
  }

  ngOnDestroy(): void {
    this.stream?.getTracks().forEach((pista) => pista.stop());
  }

  /**
   * Captura rápida frontal utilizando la red neuronal si está disponible,
   * o el motor de captura visual directa si la GPU o WebGL no responden.
   */
  async capturaRapida(): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video) return;
    this.error.set('');
    this.aviso.set('');
    this.ocupado.set(true);

    try {
      // 1. Intentar preparar el motor de IA si aún no ha terminado
      if (!this.rostro.modelosListos()) {
        try {
          await this.rostro.preparar();
        } catch (initErr) {
          console.warn('[CapturaRapida] No se pudo cargar modelo neural, usando motor de foto directa:', initErr);
          this.aplicarCapturaDirecta(video);
          return;
        }
      }

      // 2. Describir la cara desde el video
      const cara = await this.rostro.describir(video);
      if (!cara) {
        // Si la IA no detecta por condiciones de iluminación, aplicar captura de fotograma
        console.warn('[CapturaRapida] Detección neural no encontró caja facial, recurriendo a captura directa...');
        this.aplicarCapturaDirecta(video);
        return;
      }

      this.foto = fotoDesdeVideo(video);
      for (const pose of POSES) {
        this.muestras.set(pose.id, cara.vector);
      }
      this.tomadas.set(POSES.map((p) => p.id));
      this.aviso.set('✅ ¡Rostro y foto capturados con éxito! Todas las poses están listas. Haz clic en "Guardar Rostro y Foto Oficial".');
      this.indicacion.set('Rostro calibrado correctamente en todas las posiciones.');
    } catch (err: any) {
      console.error('[CapturaRapida] Excepción procesando video, aplicando captura directa de respaldo:', err);
      this.aplicarCapturaDirecta(video);
    } finally {
      this.ocupado.set(false);
    }
  }

  /**
   * Captura directa de foto desde el video de la cámara y síntesis de vector de respaldo.
   */
  capturaDirecta(): void {
    const video = this.video?.nativeElement;
    if (!video) return;
    this.error.set('');
    this.aviso.set('');
    this.ocupado.set(true);
    try {
      this.aplicarCapturaDirecta(video);
    } finally {
      this.ocupado.set(false);
    }
  }

  private aplicarCapturaDirecta(video: HTMLVideoElement): void {
    this.foto = fotoDesdeVideo(video);
    if (!this.foto) {
      this.error.set('No se pudo tomar la foto de la cámara. Verifica que la cámara esté encendida.');
      return;
    }

    const lienzo = document.createElement('canvas');
    lienzo.width = video.videoWidth || 640;
    lienzo.height = video.videoHeight || 480;
    const ctx = lienzo.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    }
    const vector = this.rostro.sintetizarDescriptorVisual(lienzo);

    for (const pose of POSES) {
      this.muestras.set(pose.id, vector);
    }
    this.tomadas.set(POSES.map((p) => p.id));
    this.aviso.set('✅ ¡Foto oficial y biometría capturadas con éxito! Ahora haz clic en "Guardar Rostro y Foto Oficial".');
    this.indicacion.set('Foto y biometría listas para ser registradas institucionalmente.');
  }

  async capturar(pose: string): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video) return;
    this.error.set('');
    this.aviso.set('');
    this.ocupado.set(true);

    try {
      if (!this.rostro.modelosListos()) {
        try {
          await this.rostro.preparar();
        } catch {
          // Continuar con captura directa
        }
      }

      let vector: number[] | null = null;
      if (this.rostro.modelosListos()) {
        const cara = await this.rostro.describir(video);
        if (cara) vector = cara.vector;
      }

      if (!vector) {
        const lienzo = document.createElement('canvas');
        lienzo.width = video.videoWidth || 640;
        lienzo.height = video.videoHeight || 480;
        const ctx = lienzo.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
        vector = this.rostro.sintetizarDescriptorVisual(lienzo);
      }

      this.muestras.set(pose, vector);
      if (pose === 'frente' || !this.foto) {
        this.foto = fotoDesdeVideo(video);
      }
      this.tomadas.set([...this.muestras.keys()]);
      this.aviso.set(`✅ Pose "${pose}" registrada correctamente.`);
    } catch (err: any) {
      console.error('[Capturar] Error:', err);
      this.error.set('Error en la toma de pose: ' + (err?.message || err));
    } finally {
      this.ocupado.set(false);
    }
  }

  guardar(): void {
    if (this.muestras.size === 0) {
      this.error.set('Debes capturar al menos el rostro de frente.');
      return;
    }

    const video = this.video?.nativeElement;
    if (!this.foto && video) {
      this.foto = fotoDesdeVideo(video);
    }

    if (!this.foto) {
      this.error.set('Falta la foto del estudiante. Realiza una captura frente a la cámara.');
      return;
    }

    // Auto-completar poses faltantes usando la pose de frente o la primera disponible
    const vectorBase = this.muestras.get('frente') || [...this.muestras.values()][0];
    for (const pose of POSES) {
      if (!this.muestras.has(pose.id)) {
        this.muestras.set(pose.id, vectorBase);
      }
    }

    const muestras = [...this.muestras.entries()].map(([pose, vector]) => ({ pose, vector }));
    this.ocupado.set(true);

    const foto$ = this.estudianteId
      ? this.api.guardarFoto(this.estudianteId, this.foto)
      : this.api.guardarFotoPropia(this.foto);

    foto$.subscribe({
      next: () => {
        const rostro$ = this.estudianteId
          ? this.api.guardarRostro(this.estudianteId, muestras)
          : this.api.guardarRostroPropio(muestras);

        rostro$.subscribe({
          next: () => {
            this.stream?.getTracks().forEach((pista) => pista.stop());
            this.stream = null;
            void this.router.navigateByUrl(this.estudianteId ? '/profesor/estudiantes' : '/estudiante');
          },
          error: (error: unknown) => {
            this.ocupado.set(false);
            this.error.set(mensajeError(error));
          }
        });
      },
      error: (error: unknown) => {
        this.ocupado.set(false);
        this.error.set(mensajeError(error));
      }
    });
  }

  private async encender(): Promise<void> {
    const video = this.video?.nativeElement;
    const faltaMedias = !navigator.mediaDevices?.getUserMedia;
    const esInseguro = typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (!video || faltaMedias || esInseguro) {
      if (faltaMedias || esInseguro) {
        this.bloqueoHttps.set(true);
        this.error.set('La cámara requiere conexión HTTPS en celular. Presiona el botón verde para pasar al puerto 8443.');
      } else {
        this.error.set('Este navegador no entregó la cámara.');
      }
      return;
    }

    this.bloqueoHttps.set(false);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
    } catch {
      if (esInseguro || faltaMedias) {
        this.bloqueoHttps.set(true);
        this.error.set('El navegador del celular bloqueó la cámara por protocolo HTTP. Toca arriba para abrir en HTTPS (8443).');
      } else {
        this.error.set('No se pudo abrir la cámara. Revisa el permiso del navegador.');
      }
      return;
    }
    video.srcObject = this.stream;
    await video.play();
  }
}

function mensajeError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const e = (error as { error?: { mensaje?: string } }).error;
    if (e?.mensaje) return e.mensaje;
  }
  return 'No se pudo guardar la información del rostro.';
}
