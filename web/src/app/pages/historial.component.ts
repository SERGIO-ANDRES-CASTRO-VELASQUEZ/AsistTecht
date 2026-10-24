import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { SesionDetalle, SesionResumen } from '../core/models';

@Component({
  selector: 'app-historial',
  imports: [DatePipe],
  template: `
    <section class="pagina">
      <h1>Historial</h1>
      <ul class="lista">
        @for (sesion of sesiones(); track sesion.id) {
          <li>
            <button type="button" class="fila-btn" (click)="ver(sesion.id)">
              <strong>{{ sesion.materia }} · {{ sesion.grupo }}</strong>
              <span>{{ sesion.fecha }} · {{ sesion.presentes }} de {{ sesion.total }}</span>
            </button>
          </li>
        } @empty {
          <li class="vacio">Aún no hay clases registradas.</li>
        }
      </ul>
      @if (detalle()) {
        <article class="card bloque">
          <h2>{{ detalle()!.materia }} · {{ detalle()!.grupo }}</h2>
          <p>{{ detalle()!.fecha }} · {{ detalle()!.presentes }} de {{ detalle()!.total }}</p>
          <ul class="lista">
            @for (estudiante of detalle()!.estudiantes; track estudiante.id) {
              <li>
                <strong>{{ estudiante.nombre }}</strong>
                <span>{{ estudiante.estado === 'Anotado' ? (estudiante.marcadaEn | date:'HH:mm') : 'Pendiente' }}</span>
              </li>
            }
          </ul>
        </article>
      }
    </section>
  `
})
export class HistorialComponent implements OnInit {
  sesiones = signal<SesionResumen[]>([]);
  detalle = signal<SesionDetalle | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.sesiones().subscribe((lista) => this.sesiones.set(lista));
  }

  ver(id: number): void {
    this.api.sesion(id).subscribe((datos) => this.detalle.set(datos));
  }
}
