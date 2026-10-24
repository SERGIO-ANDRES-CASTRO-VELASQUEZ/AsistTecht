import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { MateriaAcademica } from '../core/models';

@Component({
  selector: 'app-academico',
  template: `
    <section class="pagina">
      <h1>Notas y asistencia</h1>
      <p class="lead">Ves las materias de tu grupo. No se pueden editar desde aquí.</p>
      @for (materia of materias(); track materia.materia) {
        <article class="card bloque">
          <header class="entre">
            <h2>{{ materia.materia }}</h2>
            <span>{{ materia.ausencias }} ausencia{{ materia.ausencias === 1 ? '' : 's' }}</span>
          </header>
          <div class="desborde">
            <table class="planilla">
              <thead>
                <tr>
                  <th>Nota</th>
                  @for (columna of materia.columnas; track columna.nombre) {
                    <th>{{ columna.nombre }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Valor</td>
                  @for (columna of materia.columnas; track columna.nombre) {
                    <td>{{ columna.valor ?? '—' }}</td>
                  }
                </tr>
              </tbody>
            </table>
          </div>
          @if (materia.fechas.length) {
            <div class="desborde">
              <table class="planilla">
                <thead>
                  <tr>
                    <th>Asistencia</th>
                    @for (fecha of materia.fechas; track fecha.fecha) {
                      <th>{{ fecha.fecha }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Estado</td>
                    @for (fecha of materia.fechas; track fecha.fecha) {
                      <td>{{ fecha.presente ? 'Sí' : 'No' }}</td>
                    }
                  </tr>
                </tbody>
              </table>
            </div>
          }
        </article>
      } @empty {
        <p class="lead">Tu grupo todavía no tiene materias.</p>
      }
    </section>
  `
})
export class AcademicoComponent implements OnInit {
  materias = signal<MateriaAcademica[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.academico().subscribe((datos) => this.materias.set(datos.materias));
  }
}
