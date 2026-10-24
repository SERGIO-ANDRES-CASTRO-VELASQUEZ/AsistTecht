import { AfterViewChecked, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CaraLeida, RostroService } from '../core/rostro.service';
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
        <p class="lead">Elige la materia y el grupo. La cámara se queda abierta y marca, a la vez, todos los QR o todas las caras que alcance a ver.</p>
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
            <button type="button" [class.activo]="modo === 'qr'" (click)="usarModo('qr')">QR</button>
            <button type="button" [class.activo]="modo === 'rostro'" (click)="usarModo('rostro')">Rostro</button>
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

  modo: 'qr' | 'rostro' = 'qr';
  private frente = true;
  private esperaCamara = false;
  private stream: MediaStream | null = null;
  private timer = 0;
  private activo = false;
  private lectorQr = new QRCodeReader();
  private lienzoQr = document.createElement('canvas');
  private enCurso = new Set<string>();
  private resueltos = new Map<string, { estado: EstadoMarca; nombre: string }>();
  private posiciones = new Map<string, { x: number; y: number; visto: number }>();
  private rachas = new Map<number, { veces: number; visto: number }>();
  private confirmados = new Map<number, EstadoMarca>();
  private leyendoCara = false;
  private confirmandoIds = new Set<number>();

  constructor(private api: ApiService, private zone: NgZone, private rostro: RostroService) {}

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
    if (this.modo === 'rostro') {
      await this.bucleRostro();
      return;
    }
    await this.iniciarLectura();
  }

  private async iniciarLectura(): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video || !this.activo || this.modo !== 'qr') return;

    const detector = 'BarcodeDetector' in window ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
    const paso = async () => {
      if (!this.activo || this.modo !== 'qr') return;
      const actual = this.video?.nativeElement;
      if (actual && actual.readyState >= 2) {
        try {
          const codigos = detector ? await detector.detect(actual) : [];
          const propios = this.leerVariosQr(actual);
          this.zone.run(() => {
            const vistos = new Set<string>();
            for (const codigo of codigos) {
              const token = codigo.rawValue.trim().toLowerCase();
              vistos.add(token);
              this.recibir(codigo.rawValue, codigo.boundingBox);
            }
            for (const codigo of propios) {
              const token = codigo.texto.trim().toLowerCase();
              if (vistos.has(token)) continue;
              vistos.add(token);
              this.recibir(codigo.texto, undefined, codigo.puntos);
            }
            this.ocultarAusentes(vistos);
          });
        } catch {
          /* un cuadro fallido no detiene la cámara */
        }
      }
      if (!this.activo || this.modo !== 'qr') return;
      this.timer = window.setTimeout(() => void paso(), 220);
    };
    void paso();
  }

  private leerVariosQr(video: HTMLVideoElement): Array<{ texto: string; puntos: Array<{ x: number; y: number }> }> {
    const anchoVideo = video.videoWidth;
    const altoVideo = video.videoHeight;
    if (!anchoVideo || !altoVideo) return [];
    const escala = Math.min(1, 1200 / Math.max(anchoVideo, altoVideo));
    const ancho = Math.max(1, Math.round(anchoVideo * escala));
    const alto = Math.max(1, Math.round(altoVideo * escala));
    this.lienzoQr.width = ancho;
    this.lienzoQr.height = alto;
    const ctx = this.lienzoQr.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(video, 0, 0, ancho, alto);
    const imagen = ctx.getImageData(0, 0, ancho, alto);
    const grises = new Uint8ClampedArray(ancho * alto);
    for (let i = 0, j = 0; i < imagen.data.length; i += 4, j++) {
      grises[j] = (imagen.data[i] * 66 + imagen.data[i + 1] * 129 + imagen.data[i + 2] * 25) >> 8;
    }
    const hallados: Array<{ texto: string; puntos: Array<{ x: number; y: number }> }> = [];
    const ya = new Set<string>();
    for (let intento = 0; intento < 8; intento++) {
      try {
        this.lectorQr.reset();
        const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(grises.slice(), ancho, alto)));
        const resultado = this.lectorQr.decode(bitmap);
        const texto = resultado.getText();
        if (ya.has(texto)) break;
        ya.add(texto);
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

  private async bucleRostro(): Promise<void> {
    try {
      await this.rostro.preparar();
    } catch {
      this.error.set('No se pudieron cargar los modelos del rostro.');
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
          /* un cuadro fallido no detiene la cámara */
        } finally {
          this.leyendoCara = false;
        }
      }
      if (!this.activo || this.modo !== 'rostro') return;
      this.timer = window.setTimeout(() => void paso(), 450);
    };
    void paso();
  }

  private async recibirCaras(caras: CaraLeida[]): Promise<void> {
    const sesion = this.sesion();
    const video = this.video?.nativeElement;
    if (!sesion || !video) return;
    const ahora = Date.now();
    const vistos = new Set<string>();
    const lecturas = await Promise.all(caras.map(async (cara) => {
      const ancho = cara.box.width / video.videoWidth;
      try {
        const marca = await firstValueFrom(this.api.reconocer(sesion.id, cara.vector, false, ancho));
        if (!marca.seguro || !marca.estudianteId || !marca.nombre) return null;
        return { cara, ancho, id: marca.estudianteId, nombre: marca.nombre };
      } catch {
        return null;
      }
    }));

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
      if (ya || veces < 3 || this.confirmandoIds.has(id)) continue;
      this.confirmandoIds.add(id);
      this.api.reconocer(sesion.id, dato.cara.vector, true, dato.ancho).subscribe({
        next: (final) => {
          this.confirmandoIds.delete(id);
          if (!final.estudianteId || !final.nombre) return;
          this.confirmados.set(final.estudianteId, final.estado);
          this.pintar(`rostro-${final.estudianteId}`, final.nombre, final.estado);
          if (final.estado === 'Anotado') {
            this.sonar();
            this.anotarEnLista(final.nombre);
          }
        },
        error: () => this.confirmandoIds.delete(id)
      });
    }
    this.ocultarAusentes(vistos);
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
