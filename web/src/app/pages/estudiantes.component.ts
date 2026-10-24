import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Estudiante, Grupo } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-estudiantes',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Estudiantes</h1>
      <p class="lead">Al guardar, el sistema crea el QR. El estudiante entra con su documento y lo descarga.</p>
      <form class="grilla" (ngSubmit)="crear()">
        <label>Nombre<input [(ngModel)]="nombre" name="nombre" required /></label>
        <label>Documento<input [(ngModel)]="documento" name="documento" inputmode="numeric" required /></label>
        <label>Clave inicial<input [(ngModel)]="password" name="password" type="password" required /></label>
        <label>Grupo
          <select [(ngModel)]="grupoId" name="grupoId" required>
            <option [ngValue]="0">Elige un grupo</option>
            @for (grupo of grupos(); track grupo.id) {
              <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
            }
          </select>
        </label>
        <button class="primario" type="submit">Registrar</button>
      </form>
      @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }

      <label class="filtro">Ver grupo
        <select [(ngModel)]="filtro" name="filtro" (ngModelChange)="cargar()">
          <option [ngValue]="0">Todos</option>
          @for (grupo of grupos(); track grupo.id) {
            <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
          }
        </select>
      </label>

      <ul class="lista">
        @for (estudiante of estudiantes(); track estudiante.id) {
          <li>
            <div>
              <strong>{{ estudiante.nombre }}</strong>
              <span>{{ estudiante.documento }} · {{ estudiante.grupo || 'Sin grupo' }}</span>
            </div>
          </li>
        } @empty {
          <li class="vacio">No hay estudiantes en esta vista.</li>
        }
      </ul>
    </section>
  `
})
export class EstudiantesComponent implements OnInit {
  nombre = '';
  documento = '';
  password = '';
  grupoId = 0;
  filtro = 0;
  grupos = signal<Grupo[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  aviso = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.grupos().subscribe((lista) => this.grupos.set(lista));
    this.cargar();
  }

  cargar(): void {
    this.api.estudiantes(this.filtro || undefined).subscribe((lista) => this.estudiantes.set(lista));
  }

  crear(): void {
    this.aviso.set('');
    if (!this.grupoId) {
      this.aviso.set('Elige un grupo.');
      return;
    }
    this.api.crearEstudiante({
      nombre: this.nombre,
      documento: this.documento.trim(),
      password: this.password,
      grupoId: this.grupoId
    }).subscribe({
      next: () => {
        this.nombre = '';
        this.documento = '';
        this.password = '';
        this.aviso.set('Estudiante registrado. Ya puede entrar y descargar su QR.');
        this.cargar();
      },
      error: (error: unknown) => this.aviso.set(mensajeError(error))
    });
  }
}
