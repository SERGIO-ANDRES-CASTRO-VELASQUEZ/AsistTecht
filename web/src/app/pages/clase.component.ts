import { AfterViewChecked, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ApiService } from '../core/api.service';
import { EstadoMarca, Grupo, Materia, SesionDetalle } from '../core/models';
import { mensajeError } from '../core/errores';

interface Burbuja {
  token: string;
  nombre: string;
  estado: EstadoMarca;
  x: number;
  y: number;
}

@Component({
  selector: 'app-clase',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Tomar asistencia</h1>
      @if (!sesion()) {
        <p class="lead">Elige la materia y el grupo. La cámara se queda abierta y marca cada QR en cuanto lo ve.</p>
        <form class="grilla" (ngSubmit)="abrir()">
          <label>Materia
            <select [(ngModel)]="materiaId" name="materiaId" required>
              <option [ngValue]="0">Elige</option>
              @for (materia of materias(); track materia.id) {
                <option [ngValue]="materia.id">{{ materia.nombre }}</option>
              }
            </select>
          </label>
          <label>Grupo
            <select [(ngModel)]="grupoId" name="grupoId" required>
              <option [ngValue]="0">Elige</option>
              @for (grupo of gruposDeLaMateria(); track grupo.id) {
                <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
              }
            </select>
          </label>
          <button class="primario" type="submit">Abrir clase de hoy</button>
        </form>
        @if (error()) { <p class="aviso error">{{ error() }}</p> }
      } @else {
        <div class="entre">
          <p class="lead">{{ sesion()!.materia }} · {{ sesion()!.grupo }} · {{ sesion()!.presentes }} de {{ sesion()!.total }}</p>
          <div class="acciones">
            <button type="button" (click)="cambiarCamara()">Cambiar cámara</button>
            <button type="button" (click)="cerrar()">Cerrar cámara</button>
          </div>
        </div>
        @if (error()) { <p class="aviso error">{{ error() }}</p> }
        <div class="escena">
          <div class="visor">
            <video #video autoplay muted playsinline></video>
            @for (burbuja of burbujas(); track burbuja.token) {
              <div class="burbuja" [attr.data-estado]="burbuja.estado" [style.left.px]="burbuja.x" [style.top.px]="burbuja.y">
                <strong>{{ burbuja.nombre || 'QR' }}</strong>
                <span>{{ texto(burbuja.estado) }}</span>
              </div>
            }
          </div>
          <ul class="lista lista-clase">
            @for (estudiante of sesion()!.estudiantes; track estudiante.id) {
              <li>
                <strong>{{ estudiante.nombre }}</strong>
                <span [attr.data-estado]="estudiante.estado">{{ estudiante.estado === 'Anotado' ? 'Anotado' : 'Pendiente' }}</span>
              </li>
            }
          </ul>
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

  private frente = true;
  private esperaCamara = false;
  private stream: MediaStream | null = null;
  private timer = 0;
  private activo = false;
  private lector: BrowserMultiFormatReader | null = null;
  private controles: { stop: () => void } | null = null;
  private enCurso = new Set<string>();
  private resueltos = new Map<string, { estado: EstadoMarca; nombre: string }>();
  private posiciones = new Map<string, { x: number; y: number; visto: number }>();

  constructor(private api: ApiService, private zone: NgZone) {}

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
      this.error.set('Elige materia y grupo.');
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
  }

  cambiarCamara(): void {
    this.frente = !this.frente;
    this.apagar();
    void this.encender();
  }

  texto(estado: EstadoMarca): string {
    switch (estado) {
      case 'Anotado': return 'Asistencia anotada';
      case 'YaRegistrado': return 'Ya estaba anotado';
      case 'NoPertenece': return 'No está en este grupo';
      case 'NoEncontrado': return 'QR no registrado';
      default: return 'Leyendo…';
    }
  }

  private async encender(): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('Este navegador no entregó la cámara. En el computador usa http://localhost:8080. En el celular usa https://IP-DEL-EQUIPO:8443.');
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
        this.error.set('No se pudo abrir la cámara. Revisa el permiso del navegador.');
        return;
      }
    }
    video.srcObject = this.stream;
    await video.play();

    if ('BarcodeDetector' in window) {
      this.bucleNativo(new BarcodeDetector({ formats: ['qr_code'] }));
      return;
    }

    this.lector = new BrowserMultiFormatReader();
    this.controles = await this.lector.decodeFromVideoElement(video, (result) => {
      if (!result) return;
      const puntos = result.getResultPoints()?.map((punto) => ({ x: punto.getX(), y: punto.getY() }));
      this.zone.run(() => this.recibir(result.getText(), undefined, puntos));
    });
  }

  private bucleNativo(detector: BarcodeDetector): void {
    const paso = async () => {
      if (!this.activo) return;
      const video = this.video?.nativeElement;
      if (video && video.readyState >= 2) {
        try {
          const codigos = await detector.detect(video);
          this.zone.run(() => {
            const vistos = new Set<string>();
            for (const codigo of codigos) {
              const token = codigo.rawValue.trim().toLowerCase();
              vistos.add(token);
              this.recibir(codigo.rawValue, codigo.boundingBox);
            }
            this.ocultarAusentes(vistos);
          });
        } catch {
          /* un cuadro fallido no detiene la cámara */
        }
      }
      this.timer = window.setTimeout(() => void paso(), 220);
    };
    void paso();
  }

  private recibir(crudo: string, caja?: DOMRectReadOnly, puntos?: Array<{ x: number; y: number }>): void {
    const token = crudo.trim().toLowerCase();
    if (!/^aqr_[0-9a-f]{32}$/.test(token)) return;
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
    this.api.marcar(sesion.id, token).subscribe({
      next: (marca) => {
        this.enCurso.delete(token);
        this.resueltos.set(token, { estado: marca.estado, nombre: marca.nombre ?? '' });
        this.pintar(token, marca.nombre ?? '', marca.estado);
        if (marca.estado === 'Anotado' && marca.nombre) {
          this.sonar();
          this.anotarEnLista(marca.nombre);
        }
      },
      error: () => this.enCurso.delete(token)
    });
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
      if (!vistos.has(token) && ahora - sitio.visto > 700) this.posiciones.delete(token);
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
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.frequency.value = 880;
    gan.gain.value = 0.04;
    osc.connect(gan);
    gan.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  private apagar(): void {
    this.activo = false;
    window.clearTimeout(this.timer);
    this.controles?.stop();
    this.controles = null;
    this.lector = null;
    this.stream?.getTracks().forEach((pista) => pista.stop());
    this.stream = null;
    if (this.video?.nativeElement) this.video.nativeElement.srcObject = null;
  }
}
