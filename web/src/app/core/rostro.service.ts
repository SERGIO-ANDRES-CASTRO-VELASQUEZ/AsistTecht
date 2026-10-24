import { Injectable } from '@angular/core';

type FaceModule = typeof import('@vladmandic/face-api');

export interface CaraLeida {
  vector: number[];
  box: { x: number; y: number; width: number; height: number };
}

@Injectable({ providedIn: 'root' })
export class RostroService {
  private face: FaceModule | null = null;
  private carga: Promise<void> | null = null;

  preparar(): Promise<void> {
    this.carga ??= import('@vladmandic/face-api').then(async (face) => {
      this.face = face;
      await face.nets.tinyFaceDetector.loadFromUri('/models');
      await face.nets.faceLandmark68Net.loadFromUri('/models');
      await face.nets.faceRecognitionNet.loadFromUri('/models');
    });
    return this.carga;
  }

  async describir(video: HTMLVideoElement): Promise<CaraLeida | null> {
    const caras = await this.buscar(video, 320, 0.18);
    return caras.sort((a, b) => b.box.height - a.box.height)[0] ?? null;
  }

  describirTodas(video: HTMLVideoElement): Promise<CaraLeida[]> {
    return this.buscar(video, 416, 0.08);
  }

  private async buscar(video: HTMLVideoElement, inputSize: number, minAlto: number): Promise<CaraLeida[]> {
    const face = this.face;
    if (!face || video.readyState < 2 || !video.videoWidth) return [];
    const detecciones = await face
      .detectAllFaces(video, new face.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    const caras: CaraLeida[] = [];
    for (const deteccion of detecciones) {
      const puntos = deteccion.landmarks.positions;
      const ojos = promedio(puntos.slice(36, 48));
      const nariz = puntos[30].y;
      const boca = promedio(puntos.slice(48, 68));
      const ys = puntos.map((punto) => punto.y);
      const alto = Math.max(...ys) - Math.min(...ys);
      const box = deteccion.detection.box;
      if (box.height < video.videoHeight * minAlto) continue;
      if (!(ojos < nariz && nariz < boca)) continue;
      if (alto < box.height * 0.55) continue;
      caras.push({
        vector: Array.from(deteccion.descriptor),
        box: { x: box.x, y: box.y, width: box.width, height: box.height }
      });
    }
    return caras;
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
