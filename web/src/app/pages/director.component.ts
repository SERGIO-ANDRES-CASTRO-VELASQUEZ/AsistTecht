import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-director',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Profesores</h1>
      <p class="lead">La dirección crea las cuentas de los docentes. Desde aquí no se toman asistencias ni se editan notas.</p>
      <form class="grilla" (ngSubmit)="crear()">
        <label>Nombre<input [(ngModel)]="nombre" name="nombre" required /></label>
        <label>Usuario<input [(ngModel)]="usuario" name="usuario" autocomplete="off" required /></label>
        <label>Clave inicial<input [(ngModel)]="password" name="password" type="password" required /></label>
        <button class="primario" type="submit">Crear profesor</button>
      </form>
      @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }
      <ul class="lista">
        @for (profesor of profesores(); track profesor.id) {
          <li>
            <div>
              <strong>{{ profesor.nombre }}</strong>
              <span>{{ profesor.usuario }}</span>
            </div>
          </li>
        } @empty {
          <li class="vacio">Todavía no hay profesores.</li>
        }
      </ul>
    </section>
  `
})
export class DirectorComponent implements OnInit {
  nombre = '';
  usuario = '';
  password = '';
  aviso = signal('');
  profesores = signal<Array<{ id: number; nombre: string; usuario: string }>>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.api.profesores().subscribe((lista) => this.profesores.set(lista));
  }

  crear(): void {
    this.aviso.set('');
    this.api.crearProfesor({
      nombre: this.nombre.trim(),
      usuario: this.usuario.trim(),
      password: this.password
    }).subscribe({
      next: () => {
        this.nombre = '';
        this.usuario = '';
        this.password = '';
        this.aviso.set('Profesor creado. Ya puede entrar con ese usuario.');
        this.cargar();
      },
      error: (error: unknown) => this.aviso.set(mensajeError(error))
    });
  }
}
