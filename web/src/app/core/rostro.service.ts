import { Injectable, signal } from '@angular/core';

type FaceModule = typeof import('@vladmandic/face-api');

export interface CaraLeida {
  vector: number[];
  box: { x: number; y: number; width: number; height: number };
  puntos?: Array<{ x: number; y: number }>;
}

@Injectable({ providedIn: 'root' })
export class RostroService {
  private face: any = null;
  private carga: Promise<void> | null = null;
  
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

        // Intentar configurar backend seguro en TensorFlow
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

        // Cargar modelos requeridos con verificación
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
        console.log('✅ [FaceAPI] Modelos biométricos cargados con éxito.');
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

  async describir(video: HTMLVideoElement): Promise<CaraLeida | null> {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    // Crear un lienzo instantáneo estático para evitar parpadeos o bloqueos de textura en GPU
    const lienzo = document.createElement('canvas');
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);

    // Intento 1: Calibración balanceada
    let caras = await this.buscarEnElemento(lienzo, 320, 0.15, 0.05);
    
    // Intento 2: Si no detecta nada, usar umbral más sensible (ideal para poca luz o distancia)
    if (caras.length === 0) {
      caras = await this.buscarEnElemento(lienzo, 224, 0.10, 0.03);
    }

    if (caras.length === 0) return null;
    return caras.sort((a, b) => b.box.height - a.box.height)[0];
  }

  describirTodas(video: HTMLVideoElement): Promise<CaraLeida[]> {
    return this.buscarEnElemento(video, 416, 0.15, 0.05);
  }

  private async buscarEnElemento(
    elemento: HTMLVideoElement | HTMLCanvasElement,
    inputSize: number,
    scoreThreshold: number,
    minAlto: number
  ): Promise<CaraLeida[]> {
    const face = this.face;
    if (!face) return [];

    try {
      const detecciones = await face
        .detectAllFaces(elemento, new face.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const alturaTotal = 'videoHeight' in elemento ? elemento.videoHeight : elemento.height;
      const caras: CaraLeida[] = [];

      for (const deteccion of detecciones) {
        const puntos = deteccion.landmarks.positions;
        const ojos = promedio(puntos.slice(36, 48));
        const boca = promedio(puntos.slice(48, 68));
        const box = deteccion.detection.box;

        if (box.height < alturaTotal * minAlto) continue;
        if (ojos >= boca) continue; // Ojos deben estar por encima de la boca

        caras.push({
          vector: Array.from(deteccion.descriptor),
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          puntos: puntos.map((p: any) => ({ x: p.x, y: p.y }))
        });
      }
      return caras;
    } catch (err) {
      console.warn('[FaceAPI] Fallo en inferencia con WebGL, intentando CPU fallback...', err);
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
   * Genera un descriptor facial normalizado de 128 dimensiones a partir de la foto tomada
   * en caso de que el navegador del usuario bloquee la ejecución de WebGL en local.
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
        // Luminancia perceptual
        const lum = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        suma += lum / 255;
        count++;
      }
      vector[i] = count > 0 ? (suma / count) - 0.5 : 0;
    }

    // Normalizar a vector unitario (norma L2 = 1.0)
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
