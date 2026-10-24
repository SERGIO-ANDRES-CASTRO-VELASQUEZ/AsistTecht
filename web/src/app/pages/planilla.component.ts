import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Grupo, Materia, PlanillaAsistencia, PlanillaNotas } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-planilla',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Planillas</h1>
      <p class="lead">Una hoja por materia y grupo. La asistencia se puede marcar a mano. Las notas van de 0 a 5.</p>
      <div class="acciones">
        <button type="button" [class.activo]="vista() === 'asistencia'" (click)="vista.set('asistencia')">Asistencia</button>
        <button type="button" [class.activo]="vista() === 'notas'" (click)="vista.set('notas')">Notas</button>
      </div>
      <form class="grilla" (ngSubmit)="cargar()">
        <label>Materia
          <select [(ngModel)]="materiaId" name="materiaId">
            <option [ngValue]="0">Elige</option>
            @for (materia of materias(); track materia.id) {
              <option [ngValue]="materia.id">{{ materia.nombre }}</option>
            }
          </select>
        </label>
        <label>Grupo
          <select [(ngModel)]="grupoId" name="grupoId">
            <option [ngValue]="0">Elige</option>
            @for (grupo of gruposDeLaMateria(); track grupo.id) {
              <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
            }
          </select>
        </label>
        <button class="primario" type="submit">Abrir hoja</button>
      </form>
      @if (error()) { <p class="aviso error">{{ error() }}</p> }

      @if (vista() === 'asistencia' && asistencia()) {
        <form class="fila" (ngSubmit)="agregarFecha()">
          <input [(ngModel)]="fechaNueva" name="fechaNueva" type="date" required />
          <button class="primario" type="submit">Agregar fecha</button>
        </form>
        <div class="desborde">
          <table class="planilla">
            <thead>
              <tr>
                <th>Estudiante</th>
                @for (fecha of asistencia()!.fechas; track fecha.fecha) {
                  <th>{{ fecha.fecha }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (estudiante of asistencia()!.estudiantes; track estudiante.id) {
                <tr>
                  <td>{{ estudiante.nombre }}</td>
                  @for (fecha of asistencia()!.fechas; track fecha.fecha) {
                    <td>
                      <button type="button" class="celda" [attr.data-presente]="presente(fecha, estudiante.id)" (click)="alternar(fecha, estudiante.id)">
                        {{ presente(fecha, estudiante.id) ? 'Sí' : 'No' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (vista() === 'notas' && notas()) {
        <form class="fila" (ngSubmit)="agregarColumna()">
          <input [(ngModel)]="columnaNueva" name="columnaNueva" placeholder="Ej. Corte 1" required />
          <button class="primario" type="submit">Agregar columna</button>
        </form>
        <div class="desborde">
          <table class="planilla">
            <thead>
              <tr>
                <th>Estudiante</th>
                @for (columna of notas()!.columnas; track columna.id) {
                  <th>{{ columna.nombre }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (estudiante of notas()!.estudiantes; track estudiante.id) {
                <tr>
                  <td>{{ estudiante.nombre }}</td>
                  @for (columna of notas()!.columnas; track columna.id) {
                    <td>
                      <input class="nota" type="number" min="0" max="5" step="0.1"
                        [value]="valor(columna, estudiante.id)"
                        (change)="guardarNota(columna.id, estudiante.id, $event)" />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `
})
export class PlanillaComponent implements OnInit {
  materias = signal<Materia[]>([]);
  grupos = signal<Grupo[]>([]);
  vista = signal<'asistencia' | 'notas'>('asistencia');
  asistencia = signal<PlanillaAsistencia | null>(null);
  notas = signal<PlanillaNotas | null>(null);
  error = signal('');
  materiaId = 0;
  grupoId = 0;
  fechaNueva = '';
  columnaNueva = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.materias().subscribe((lista) => this.materias.set(lista));
    this.api.grupos().subscribe((lista) => this.grupos.set(lista));
  }

  gruposDeLaMateria(): Grupo[] {
    return this.grupos().filter((grupo) => grupo.materiaIds.includes(this.materiaId));
  }

  cargar(): void {
    this.error.set('');
    if (!this.materiaId || !this.grupoId) {
      this.error.set('Elige materia y grupo.');
      return;
    }
    this.api.planillaAsistencia(this.materiaId, this.grupoId).subscribe({
      next: (hoja) => this.asistencia.set(hoja),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
    this.api.planillaNotas(this.materiaId, this.grupoId).subscribe({
      next: (hoja) => this.notas.set(hoja),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  presente(fecha: { presentes: number[] }, estudianteId: number): boolean {
    return fecha.presentes.includes(estudianteId);
  }

  alternar(fecha: { fecha: string; presentes: number[] }, estudianteId: number): void {
    const presente = !this.presente(fecha, estudianteId);
    this.api.celdaAsistencia({
      materiaId: this.materiaId,
      grupoId: this.grupoId,
      fecha: fecha.fecha,
      estudianteId,
      presente
    }).subscribe({
      next: () => {
        fecha.presentes = presente
          ? [...fecha.presentes, estudianteId]
          : fecha.presentes.filter((id) => id !== estudianteId);
        this.asistencia.set({ ...this.asistencia()! });
      },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  agregarFecha(): void {
    const hoja = this.asistencia();
    if (!hoja || !this.fechaNueva) return;
    if (hoja.fechas.some((fecha) => fecha.fecha === this.fechaNueva)) return;
    hoja.fechas = [...hoja.fechas, { id: 0, fecha: this.fechaNueva, presentes: [] }]
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.asistencia.set({ ...hoja });
    this.fechaNueva = '';
  }

  valor(columna: PlanillaNotas['columnas'][number], estudianteId: number): string {
    const nota = columna.notas.find((item) => item.estudianteId === estudianteId);
    return nota ? String(nota.valor) : '';
  }

  guardarNota(columnaId: number, estudianteId: number, evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value.trim();
    const valor = texto === '' ? null : Number(texto);
    this.api.guardarNota(columnaId, estudianteId, valor).subscribe({
      next: () => this.cargar(),
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }

  agregarColumna(): void {
    if (!this.materiaId || !this.grupoId || !this.columnaNueva.trim()) return;
    this.api.crearColumna(this.materiaId, this.grupoId, this.columnaNueva.trim()).subscribe({
      next: () => {
        this.columnaNueva = '';
        this.cargar();
      },
      error: (error: unknown) => this.error.set(mensajeError(error))
    });
  }
}
