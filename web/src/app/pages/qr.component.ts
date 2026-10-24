import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-qr',
  template: `
    <section class="pagina centrada">
      <h1>Tu código de asistencia</h1>
      <p class="lead">{{ nombre() }}@if (grupo()) { · {{ grupo() }} }. Muéstralo a la cámara de la clase. No lleva tu nombre ni tu documento: solo un identificador.</p>
      @if (url()) {
        <img class="qr" [src]="url()" alt="Código QR de asistencia" />
        <a class="primario enlace" [href]="url()" download="qr-asistencia.png">Descargar QR</a>
      } @else {
        <p>Preparando el código…</p>
      }
    </section>
  `
})
export class QrComponent implements OnInit, OnDestroy {
  url = signal('');
  nombre = signal('');
  grupo = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.perfil().subscribe((perfil) => {
      this.nombre.set(perfil.nombre);
      this.grupo.set(perfil.grupo ?? '');
    });
    this.api.qr().subscribe((blob) => this.url.set(URL.createObjectURL(blob)));
  }

  ngOnDestroy(): void {
    const actual = this.url();
    if (actual) URL.revokeObjectURL(actual);
  }
}
