import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <h1>Hoy en el aula</h1>
      <p class="lead">Prepara materias y grupos una vez. El día de clase solo abres la cámara.</p>
      <div class="cifras">
        <article><strong>{{ resumen()?.materias ?? '–' }}</strong><span>Materias</span></article>
        <article><strong>{{ resumen()?.grupos ?? '–' }}</strong><span>Grupos</span></article>
        <article><strong>{{ resumen()?.estudiantes ?? '–' }}</strong><span>Estudiantes</span></article>
        <article><strong>{{ resumen()?.sesionesHoy ?? '–' }}</strong><span>Clases de hoy</span></article>
      </div>
      <ol class="pasos">
        <li><a routerLink="/profesor/materias">Crea la materia</a></li>
        <li><a routerLink="/profesor/grupos">Crea el grupo y asígnale materias</a></li>
        <li><a routerLink="/profesor/estudiantes">Registra a cada estudiante</a> para que descargue su QR y guarde su rostro</li>
        <li><a routerLink="/profesor/clase">Abre la clase</a> y deja la cámara viendo los códigos o las caras</li>
        <li><a routerLink="/profesor/planilla">Revisa la planilla</a> si hay que anotar a mano o cargar notas</li>
      </ol>
    </section>
  `
})
export class InicioComponent implements OnInit {
  resumen = signal<{ materias: number; grupos: number; estudiantes: number; sesionesHoy: number } | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.resumen().subscribe((datos) => this.resumen.set(datos));
  }
}
