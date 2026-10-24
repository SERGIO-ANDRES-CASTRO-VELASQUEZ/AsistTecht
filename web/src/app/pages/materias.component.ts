import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Materia } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-materias',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Materias</h1>
      <form class="fila" (ngSubmit)="crear()">
        <input [(ngModel)]="nombre" name="nombre" placeholder="Ej. Matemáticas" required />
        <button class="primario" type="submit">Agregar</button>
      </form>
      @if (error()) { <p class="aviso error">{{ error() }}</p> }
      <ul class="lista">
        @for (materia of materias(); track materia.id) {
          <li>
            <div>
              <strong>{{ materia.nombre }}</strong>
              <span>{{ materia.grupos.length ? materia.grupos.join(', ') : 'Sin grupos' }}</span>
            </div>
            <button type="button" class="texto" (click)="borrar(materia)">Quitar</button>
          </li>
        } @empty {
          <li class="vacio">Todavía no hay materias.</li>
        }
      </ul>
    </section>
  `
})
export class MateriasComponent implements OnInit {
  nombre = '';
  materias = signal<Materia[]>([]);
  error = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.api.materias().subscribe((lista) => this.materias.set(lista));
  }

  crear(): void {
    this.error.set('');
    this.api.crearMateria(this.nombre).subscribe({
      next: () => { this.nombre = ''; this.cargar(); },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  borrar(materia: Materia): void {
    this.api.borrarMateria(materia.id).subscribe({
      next: () => this.cargar(),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }
}
