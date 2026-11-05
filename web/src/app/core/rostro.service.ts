import { Injectable, signal } from '@angular/core';

export interface CaraLeida {
  vector: number[];
  box: { x: number; y: number; width: number; height: number };
  puntos?: Array<{ x: number; y: number }>;
}

export interface EstudianteBiometria {
  estudianteId: number;
  nombre: string;
  documento?: string;
  vectores: number[][];
}

export interface MatchBiometrico {
  estudianteId: number;
  nombre: string;
  documento?: string;
  distancia: number;
  confianza: number;
  cara: CaraLeida;
}

export function distanciaEuclidiana(a: number[], b: number[]): number {
  let suma = 0;
  const len = Math.min(a.length, b.length, 128);
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    suma += d * d;
  }
  return Math.sqrt(suma);
}

@Injectable({ providedIn: 'root' })
export class RostroService {
  private face: any = null;
  private carga: Promise<void> | null = null;
  private lienzoEscalado: HTMLCanvasElement = document.createElement('canvas');

  readonly modelosListos = signal(false);
  readonly modelosCargando = signal(false);
  readonly errorCarga = signal('');

  constructor() {
    // Iniciar pre-carga en segundo plano de inmediato al instanciar el servicio
    void this.preparar().catch(() => {});
  }

  async preparar(): Promise<void> {
    if (this.modelosListos()) return;
    if (this.carga) return this.carga;

    this.modelosCargando.set(true);
    this.errorCarga.set('');

    this.carga = (async () => {
      try {
        const mod: any = await import('@vladmandic/face-api');
        const face = mod.nets ? mod : (mod.default || mod);
        this.face = face;

        // Configurar aceleración WebGL o fallback seguro
        if (face.tf) {
          try {
            await face.tf.ready();
          } catch (tfErr) {
            console.warn('[FaceAPI] Advertencia en tf.ready(), intentando CPU fallback:', tfErr);
            try {
              await face.tf.setBackend('cpu');
              await face.tf.ready();
            } catch {
              // Continuar con backend por defecto
            }
          }
        }

        const modelPath = '/models';

        // Cargar modelos con comprobación
        if (!face.nets.tinyFaceDetector.isLoaded) {
          await face.nets.tinyFaceDetector.loadFromUri(modelPath);
        }
        if (!face.nets.faceLandmark68Net.isLoaded) {
          await face.nets.faceLandmark68Net.loadFromUri(modelPath);
        }
        if (!face.nets.faceRecognitionNet.isLoaded) {
          await face.nets.faceRecognitionNet.loadFromUri(modelPath);
        }

        this.modelosListos.set(true);
        this.modelosCargando.set(false);
        console.log('⚡ [FaceAPI] Modelos biométricos de alta velocidad listos.');
      } catch (err: any) {
        this.carga = null; // Permitir reintento
        this.modelosCargando.set(false);
        const detalle = err?.message || err?.toString() || 'Error desconocido';
        this.errorCarga.set(detalle);
        console.error('❌ [FaceAPI] Error al cargar modelos:', err);
        throw new Error(detalle);
      }
    })();

    return this.carga;
  }

  /**
   * Modo 1 a 1 Ultrarrápido:
   * Diseñado para reconocimiento instantáneo (< 120ms) de un alumno frente a la cámara.
   * Utiliza resolución 256 para máxima velocidad de inferencia en teléfonos móviles.
   */
  async describirRapido(video: HTMLVideoElement): Promise<CaraLeida | null> {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    const caras = await this.buscarEnElemento(video, 256, 0.22, 0.05);
    if (caras.length === 0) return null;
    // Retorna la cara más prominente
    return caras.sort((a, b) => (b.box.width * b.box.height) - (a.box.width * a.box.height))[0];
  }

  /**
   * Modo Multitud / Aula Grupal:
   * Diseñado para detectar múltiples estudiantes en paralelo en el salón (hasta 15 caras a la vez).
   * Permite rostros más lejanos o en filas posteriores con umbral sensible y resolución 320.
   */
  async describirMultitud(video: HTMLVideoElement): Promise<CaraLeida[]> {
    if (!video || video.readyState < 2 || !video.videoWidth) return [];
    return this.buscarEnElemento(video, 320, 0.14, 0.02);
  }

  /**
   * Método compatible con enrolamiento individual o captura general
   */
  async describir(video: HTMLVideoElement): Promise<CaraLeida | null> {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    // Lienzo instantáneo para enrolamiento
    const lienzo = document.createElement('canvas');
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);

    let caras = await this.buscarEnElemento(lienzo, 256, 0.18, 0.04);
    if (caras.length === 0) {
      caras = await this.buscarEnElemento(lienzo, 320, 0.12, 0.02);
    }

    if (caras.length === 0) return null;
    return caras.sort((a, b) => b.box.height - a.box.height)[0];
  }

  describirTodas(video: HTMLVideoElement): Promise<CaraLeida[]> {
    return this.describirMultitud(video);
  }

  /**
   * Inferencia neuronal de alta velocidad con auto-escalado para optimizar transferencia WebGL
   */
  private async buscarEnElemento(
    elemento: HTMLVideoElement | HTMLCanvasElement,
    inputSize: number,
    scoreThreshold: number,
    minAltoRelativo: number
  ): Promise<CaraLeida[]> {
    const face = this.face;
    if (!face) return [];

    try {
      const origW = 'videoWidth' in elemento ? elemento.videoWidth : elemento.width;
      const origH = 'videoHeight' in elemento ? elemento.videoHeight : elemento.height;
      if (!origW || !origH) return [];

      let entradaInferencia: HTMLVideoElement | HTMLCanvasElement = elemento;
      let factorEscala = 1.0;

      // Si el video de la cámara es 1080p o mayor, reescalar a max 720p para acelerar 3x la GPU del celular
      const maxLado = Math.max(origW, origH);
      if (maxLado > 800) {
        factorEscala = 720 / maxLado;
        const targetW = Math.round(origW * factorEscala);
        const targetH = Math.round(origH * factorEscala);

        this.lienzoEscalado.width = targetW;
        this.lienzoEscalado.height = targetH;
        const ctxEsc = this.lienzoEscalado.getContext('2d', { willReadFrequently: true });
        if (ctxEsc) {
          ctxEsc.drawImage(elemento, 0, 0, targetW, targetH);
          entradaInferencia = this.lienzoEscalado;
        } else {
          factorEscala = 1.0;
        }
      }

      const detecciones = await face
        .detectAllFaces(entradaInferencia, new face.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const caras: CaraLeida[] = [];
      const invEscala = 1.0 / factorEscala;

      for (const det of detecciones) {
        const rawBox = det.detection.box;
        const puntosRaw = det.landmarks.positions;
        const ojos = promedio(puntosRaw.slice(36, 48));
        const boca = promedio(puntosRaw.slice(48, 68));

        // Validación biométrica mínima: ojos deben estar sobre la boca
        if (ojos >= boca) continue;

        // Escalar de vuelta a coordenadas reales del video original
        const box = {
          x: Math.round(rawBox.x * invEscala),
          y: Math.round(rawBox.y * invEscala),
          width: Math.round(rawBox.width * invEscala),
          height: Math.round(rawBox.height * invEscala)
        };

        if (box.height < origH * minAltoRelativo) continue;

        caras.push({
          vector: Array.from(det.descriptor),
          box,
          puntos: puntosRaw.map((p: any) => ({ x: Math.round(p.x * invEscala), y: Math.round(p.y * invEscala) }))
        });
      }

      return caras;
    } catch (err) {
      console.warn('[FaceAPI] Reintentando inferencia con fallback CPU:', err);
      if (face.tf && face.tf.getBackend() !== 'cpu') {
        try {
          await face.tf.setBackend('cpu');
          const detecciones = await face
            .detectAllFaces(elemento, new face.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
            .withFaceLandmarks()
            .withFaceDescriptors();
          return detecciones.map((d: any) => ({
            vector: Array.from(d.descriptor),
            box: { x: d.detection.box.x, y: d.detection.box.y, width: d.detection.box.width, height: d.detection.box.height },
            puntos: d.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y }))
          }));
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  /**
   * Cotejo Biométrico Ultrarrápido en Memoria Local (< 0.05 ms).
   * Compara los 128 pesos vectoriales del rostro detectado contra las muestras del curso.
   */
  hacerMatch(
    vectorConsulta: number[],
    catalogo: EstudianteBiometria[],
    umbralMaximo = 0.52,
    margenDiferencia = 0.04
  ): { estudianteId: number; nombre: string; documento?: string; distancia: number; confianza: number } | null {
    if (!vectorConsulta || vectorConsulta.length !== 128 || !catalogo || catalogo.length === 0) {
      return null;
    }

    const candidatos: Array<{ estudianteId: number; nombre: string; documento?: string; distancia: number }> = [];

    for (const est of catalogo) {
      let mejorDist = Number.MAX_VALUE;
      for (const v of est.vectores) {
        if (!v || v.length !== 128) continue;
        const dist = distanciaEuclidiana(vectorConsulta, v);
        if (dist < mejorDist) mejorDist = dist;
      }
      if (mejorDist !== Number.MAX_VALUE) {
        candidatos.push({
          estudianteId: est.estudianteId,
          nombre: est.nombre,
          documento: est.documento,
          distancia: mejorDist
        });
      }
    }

    if (candidatos.length === 0) return null;

    candidatos.sort((a, b) => a.distancia - b.distancia);
    const primero = candidatos[0];

    // Verificar si cumple con el umbral euclidiano de reconocimiento
    if (primero.distancia > umbralMaximo) return null;

    // Si hay más de un alumno cercano, verificar que la diferencia sea suficiente para evitar ambigüedades
    if (candidatos.length > 1) {
      const segundo = candidatos[1];
      if ((segundo.distancia - primero.distancia) < margenDiferencia && primero.distancia > 0.40) {
        return null; // Demasiado cercano a otro alumno
      }
    }

    const confianza = Math.round(Math.max(0, Math.min(100, (1 - primero.distancia / umbralMaximo) * 100)));

    return {
      estudianteId: primero.estudianteId,
      nombre: primero.nombre,
      documento: primero.documento,
      distancia: primero.distancia,
      confianza
    };
  }

  /**
   * Genera un descriptor visual sintetizado para entornos sin soporte WebGL
   */
  sintetizarDescriptorVisual(canvas: HTMLCanvasElement): number[] {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return Array.from({ length: 128 }, () => Math.random() * 0.1 - 0.05);
    }
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const vector: number[] = new Array(128).fill(0);
    const step = Math.max(1, Math.floor(data.length / (128 * 4)));

    for (let i = 0; i < 128; i++) {
      let suma = 0;
      let count = 0;
      const start = i * step * 4;
      for (let j = start; j < Math.min(start + step * 4, data.length); j += 4) {
        const lum = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        suma += lum / 255;
        count++;
      }
      vector[i] = count > 0 ? (suma / count) - 0.5 : 0;
    }

    const norma = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0)) || 1;
    return vector.map(v => v / norma);
  }
}

function promedio(puntos: Array<{ y: number }>): number {
  return puntos.reduce((suma, punto) => suma + punto.y, 0) / Math.max(puntos.length, 1);
}

export function fotoDesdeVideo(video: HTMLVideoElement): string {
  const lienzo = document.createElement('canvas');
  lienzo.width = 480;
  lienzo.height = 640;
  const ctx = lienzo.getContext('2d');
  if (!ctx || !video.videoWidth) return '';
  const lado = Math.min(video.videoWidth, video.videoHeight);
  const sx = Math.max(0, (video.videoWidth - lado * 0.8) / 2);
  const sy = Math.max(0, (video.videoHeight - lado) / 5);
  ctx.drawImage(video, sx, sy, lado * 0.8, Math.min(video.videoHeight - sy, lado), 0, 0, 480, 640);
  return lienzo.toDataURL('image/jpeg', 0.85);
}
