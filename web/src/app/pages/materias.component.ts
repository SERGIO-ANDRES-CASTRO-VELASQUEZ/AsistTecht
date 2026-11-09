import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { Materia } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-materias',
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <section class="pagina">
      <div class="entre" style="margin-bottom: 1.25rem;">
        <div>
          <h1>Gestión de Asignaturas</h1>
          <p class="lead">Catálogo curricular institucional. Agrega materias y asígnalas a los diferentes grupos del colegio.</p>
        </div>
      </div>

      <!-- Barra de Creación Rápida -->
      <div class="card" style="padding: 1.15rem; margin-bottom: 1.5rem;">
        <form class="fila" (ngSubmit)="crear()" style="gap: 0.85rem;">
          <input [(ngModel)]="nombre" name="nombre" placeholder="Nombre de la nueva asignatura (Ej. Matemáticas, Física, Ciencias Naturales...)" required style="flex: 1;" />
          <button class="btn-principal" type="submit" [disabled]="!nombre.trim()">
            <span>+</span> Agregar Asignatura
          </button>
        </form>
      </div>

      @if (error()) { <p class="aviso error">{{ error() }}</p> }

      <!-- Grilla de Tarjetas de Materias -->
      <div class="cards-grid">
        @for (materia of materias(); track materia.id) {
          <div class="card card-materia">
            <div>
              <div class="card-materia-top">
                <div class="icono-materia">📚</div>
                <button type="button" class="btn-salir" (click)="borrar(materia)" title="Eliminar materia">
                  🗑️
                </button>
              </div>

              <h3>{{ materia.nombre }}</h3>
              <p class="sub">Asignatura Curricular</p>

              <div style="margin: 0.8rem 0;">
                <span style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem;">
                  Grupos que ven esta materia:
                </span>
                <div class="chips-grupos">
                  @for (g of materia.grupos; track g) {
                    <span class="chip-grupo">Grupo {{ g }}</span>
                  } @empty {
                    <span style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Sin grupos vinculados</span>
                  }
                </div>
              </div>
            </div>

            <div style="padding-top: 1rem; border-top: 1px solid var(--border); display: flex; gap: 0.5rem;">
              <a routerLink="/profesor/planilla" class="btn-secundario" style="font-size: 0.82rem; flex: 1; justify-content: center;">
                📝 Calificar
              </a>
              <a routerLink="/profesor/clase" class="btn-principal" style="font-size: 0.82rem; flex: 1; justify-content: center;">
                📷 Asistencia
              </a>
            </div>
          </div>
        } @empty {
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <p class="lead">Aún no has registrado materias. Escribe el nombre en el recuadro superior para comenzar.</p>
          </div>
        }
      </div>
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
    if (!this.nombre.trim()) return;
    this.error.set('');
    this.api.crearMateria(this.nombre.trim()).subscribe({
      next: () => { this.nombre = ''; this.cargar(); },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  borrar(materia: Materia): void {
    if (!confirm(`¿Eliminar la materia ${materia.nombre}?`)) return;
    this.api.borrarMateria(materia.id).subscribe({
      next: () => this.cargar(),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }
}
