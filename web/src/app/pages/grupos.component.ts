import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Grupo, Materia } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-grupos',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Grupos</h1>
      <form class="fila" (ngSubmit)="crear()">
        <input [(ngModel)]="nombre" name="nombre" placeholder="Ej. 10A" required />
        <button class="primario" type="submit">Agregar</button>
      </form>
      @if (error()) { <p class="aviso error">{{ error() }}</p> }
      @for (grupo of grupos(); track grupo.id) {
        <article class="card bloque">
          <header class="entre">
            <div>
              <h2>{{ grupo.nombre }}</h2>
              <p>{{ grupo.estudiantes }} estudiantes</p>
            </div>
            @if (grupo.propio) {
              <button type="button" class="texto" (click)="borrar(grupo)">Quitar</button>
            }
          </header>
          <fieldset>
            <legend>Materias de este grupo</legend>
            @for (materia of materias(); track materia.id) {
              <label class="check">
                <input type="checkbox" [checked]="grupo.materiaIds.includes(materia.id)" (change)="alternar(grupo, materia.id)" />
                {{ materia.nombre }}
              </label>
            } @empty {
              <p>Primero crea una materia.</p>
            }
          </fieldset>
          <button type="button" class="primario" (click)="guardar(grupo)">Guardar materias</button>
        </article>
      }
    </section>
  `
})
export class GruposComponent implements OnInit {
  nombre = '';
  grupos = signal<Grupo[]>([]);
  materias = signal<Materia[]>([]);
  error = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.api.grupos().subscribe((lista) => this.grupos.set(lista));
    this.api.materias().subscribe((lista) => this.materias.set(lista));
  }

  crear(): void {
    this.error.set('');
    this.api.crearGrupo(this.nombre).subscribe({
      next: () => { this.nombre = ''; this.cargar(); },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  alternar(grupo: Grupo, materiaId: number): void {
    grupo.materiaIds = grupo.materiaIds.includes(materiaId)
      ? grupo.materiaIds.filter((id) => id !== materiaId)
      : [...grupo.materiaIds, materiaId];
  }

  guardar(grupo: Grupo): void {
    this.error.set('');
    this.api.asignarMaterias(grupo.id, grupo.materiaIds).subscribe({
      next: () => this.cargar(),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  borrar(grupo: Grupo): void {
    this.api.borrarGrupo(grupo.id).subscribe({
      next: () => this.cargar(),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }
}
