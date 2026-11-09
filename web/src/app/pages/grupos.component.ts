import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { Grupo, Materia } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-grupos',
  imports: [FormsModule, CommonModule],
  template: `
    <section class="pagina">
      <div class="entre" style="margin-bottom: 1.25rem;">
        <div>
          <h1>Grupos y Cursos Escolares</h1>
          <p class="lead">Administra los salones y asigna qué materias ve cada grupo escolar durante el año lectivo.</p>
        </div>
      </div>

      <!-- Barra de Creación Rápida -->
      <div class="card" style="padding: 1.15rem; margin-bottom: 1.5rem;">
        <form class="fila" (ngSubmit)="crear()" style="gap: 0.85rem;">
          <input [(ngModel)]="nombre" name="nombre" placeholder="Nombre del nuevo grupo (Ej. 10A, 11B, Sexto 2...)" required style="flex: 1;" />
          <button class="btn-principal" type="submit" [disabled]="!nombre.trim()">
            <span>+</span> Crear Grupo
          </button>
        </form>
      </div>

      @if (error()) { <p class="aviso error">{{ error() }}</p> }
      @if (exito()) { <p class="aviso">{{ exito() }}</p> }

      <!-- Grilla de Tarjetas de Grupos -->
      <div class="cards-grid">
        @for (grupo of grupos(); track grupo.id) {
          <div class="card card-materia">
            <div>
              <div class="card-materia-top">
                <div class="icono-materia" style="background: var(--grade-alto-bg); color: var(--grade-alto);">👥</div>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <span class="badge badge-verde">{{ grupo.estudiantes }} Alumnos</span>
                  @if (grupo.propio) {
                    <button type="button" class="btn-salir" (click)="borrar(grupo)" title="Eliminar grupo">
                      🗑️
                    </button>
                  }
                </div>
              </div>

              <h3>Grupo {{ grupo.nombre }}</h3>
              <p class="sub">Salón Escolar Oficial</p>

              <!-- Selector de Materias con Chips Interactivos -->
              <div style="margin: 1rem 0;">
                <span style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">
                  Materias asignadas a este grupo:
                </span>
                <div style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
                  @for (materia of materias(); track materia.id) {
                    <button type="button"
                      [style.background]="grupo.materiaIds.includes(materia.id) ? 'var(--primary-light)' : 'var(--bg-hover)'"
                      [style.color]="grupo.materiaIds.includes(materia.id) ? 'var(--primary)' : 'var(--text-secondary)'"
                      [style.border-color]="grupo.materiaIds.includes(materia.id) ? 'var(--primary)' : 'var(--border)'"
                      (click)="alternar(grupo, materia.id)"
                      style="border: 1px solid; border-radius: var(--radius-pill); padding: 0.3rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">
                      {{ grupo.materiaIds.includes(materia.id) ? '✔' : '+' }} {{ materia.nombre }}
                    </button>
                  } @empty {
                    <span style="font-size: 0.85rem; color: var(--text-muted);">Primero crea asignaturas en la pestaña Materias.</span>
                  }
                </div>
              </div>
            </div>

            <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
              <button type="button" class="btn-principal" (click)="guardar(grupo)" style="width: 100%; justify-content: center; font-size: 0.85rem;">
                💾 Guardar Asignaciones
              </button>
            </div>
          </div>
        } @empty {
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <p class="lead">Aún no hay grupos creados. Escribe el nombre (ej. 10A) para comenzar.</p>
          </div>
        }
      </div>
    </section>
  `
})
export class GruposComponent implements OnInit {
  nombre = '';
  grupos = signal<Grupo[]>([]);
  materias = signal<Materia[]>([]);
  error = signal('');
  exito = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.api.grupos().subscribe((lista) => this.grupos.set(lista));
    this.api.materias().subscribe((lista) => this.materias.set(lista));
  }

  crear(): void {
    if (!this.nombre.trim()) return;
    this.error.set('');
    this.api.crearGrupo(this.nombre.trim()).subscribe({
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
      next: () => {
        this.exito.set(`Materias de ${grupo.nombre} guardadas con éxito.`);
        this.cargar();
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  borrar(grupo: Grupo): void {
    if (!confirm(`¿Eliminar el grupo ${grupo.nombre}?`)) return;
    this.api.borrarGrupo(grupo.id).subscribe({
      next: () => this.cargar(),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }
}
