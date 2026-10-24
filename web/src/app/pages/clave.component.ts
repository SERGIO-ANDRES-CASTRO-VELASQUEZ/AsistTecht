import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-clave',
  imports: [FormsModule],
  template: `
    <section class="pagina">
      <h1>Cambiar clave</h1>
      <form class="grilla estrecha" (ngSubmit)="guardar()">
        <label>Clave actual<input [(ngModel)]="actual" name="actual" type="password" required /></label>
        <label>Clave nueva<input [(ngModel)]="nueva" name="nueva" type="password" required /></label>
        <button class="primario" type="submit">Guardar</button>
      </form>
      @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }
    </section>
  `
})
export class ClaveComponent {
  actual = '';
  nueva = '';
  aviso = signal('');

  constructor(private api: ApiService) {}

  guardar(): void {
    this.api.cambiarClave(this.actual, this.nueva).subscribe({
      next: () => {
        this.actual = '';
        this.nueva = '';
        this.aviso.set('Clave actualizada.');
      },
      error: (error: unknown) => this.aviso.set(mensajeError(error))
    });
  }
}
