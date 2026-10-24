import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-qr',
  imports: [RouterLink],
  template: `
    <section class="pagina centrada">
      <h1>Tu código de asistencia</h1>
      <p class="lead">{{ nombre() }}@if (grupo()) { · {{ grupo() }} }. Muéstralo a la cámara de la clase. No lleva tu nombre ni tu documento: solo un identificador.</p>
      @if (url()) {
        <img class="qr" [src]="url()" alt="Código QR de asistencia" />
        <div class="acciones" style="justify-content: center;">
          <a class="primario enlace" [href]="url()" download="qr-asistencia.png">Descargar QR</a>
          <a class="enlace" routerLink="/estudiante/rostro">Guardar rostro</a>
          @if (carnetListo()) {
            <button type="button" class="texto" (click)="carnet()">Descargar carnet</button>
          }
        </div>
      } @else {
        <p>Preparando el código…</p>
      }
      @if (error()) { <p class="aviso error">{{ error() }}</p> }
    </section>
  `
})
export class QrComponent implements OnInit, OnDestroy {
  url = signal('');
  nombre = signal('');
  grupo = signal('');
  carnetListo = signal(false);
  error = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.perfil().subscribe((perfil) => {
      this.nombre.set(perfil.nombre);
      this.grupo.set(perfil.grupo ?? '');
      this.carnetListo.set(!!perfil.carnet);
    });
    this.api.qr().subscribe((blob) => this.url.set(URL.createObjectURL(blob)));
  }

  carnet(): void {
    this.api.carnetPropio().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'carnet.png';
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
