import { AfterViewChecked, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { fotoDesdeVideo, RostroService } from '../core/rostro.service';
import { mensajeError } from '../core/errores';

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
      <h1>Guardar el rostro</h1>
      <p class="lead">{{ indicacion() }} La foto del carnet se toma en la pose de frente. Si la cámara solo ve la coronilla, no guarda nada.</p>
      <div class="visor">
        <video #video autoplay muted playsinline></video>
      </div>
      <div class="poses">
        @for (pose of poses; track pose.id) {
          <button type="button" [class.activo]="tomadas().includes(pose.id)" (click)="capturar(pose.id)" [disabled]="ocupado()">
            {{ tomadas().includes(pose.id) ? 'Lista' : pose.texto }}
          </button>
        }
      </div>
      @if (error()) { <p class="aviso error">{{ error() }}</p> }
      @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }
      <button class="primario" type="button" [disabled]="tomadas().length < 5 || ocupado()" (click)="guardar()">Guardar rostro y foto</button>
    </section>
  `
})
export class RostroComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;
  poses = POSES;
  tomadas = signal<string[]>([]);
  indicacion = signal('Abre la cámara y captura las cinco poses.');
  error = signal('');
  aviso = signal('');
  ocupado = signal(false);

  private espera = true;
  private stream: MediaStream | null = null;
  private muestras = new Map<string, number[]>();
  private foto = '';
  private estudianteId: number | null = null;

  constructor(
    private api: ApiService,
    private rostro: RostroService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.estudianteId = Number.isFinite(id) && id > 0 ? id : null;
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

  async capturar(pose: string): Promise<void> {
    const video = this.video?.nativeElement;
    if (!video) return;
    this.error.set('');
    this.ocupado.set(true);
    try {
      await this.rostro.preparar();
      const cara = await this.rostro.describir(video);
      if (!cara) {
        this.error.set('No se ve la cara completa. Acércate y mira hacia la cámara, no desde arriba.');
        return;
      }
      this.muestras.set(pose, cara.vector);
      if (pose === 'frente') this.foto = fotoDesdeVideo(video);
      this.tomadas.set([...this.muestras.keys()]);
      this.indicacion.set(POSES.find((item) => item.id === pose)?.texto ?? '');
    } catch {
      this.error.set('No se pudieron cargar los modelos de la cara. Recarga la página.');
    } finally {
      this.ocupado.set(false);
    }
  }

  guardar(): void {
    if (this.muestras.size < 5 || !this.foto) {
      this.error.set('Falta la pose de frente, que también guarda la foto.');
      return;
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
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      this.error.set('Este navegador no entregó la cámara.');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
    } catch {
      this.error.set('No se pudo abrir la cámara. Revisa el permiso del navegador.');
      return;
    }
    video.srcObject = this.stream;
    await video.play();
  }
}
