import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Estudiante, Grupo } from '../core/models';
import { mensajeError } from '../core/errores';

@Component({
  selector: 'app-estudiantes',
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <section class="pagina">
      <div class="entre" style="margin-bottom: 1.25rem;">
        <div>
          <h1>Directorio de Estudiantes</h1>
          <p class="lead">Matrícula escolar, credenciales de acceso dinámicas, carnetización y biometría.</p>
        </div>

        @if (auth.rol() !== 'Profesor') {
          <button type="button" class="btn-principal" (click)="mostrarRegistro.set(!mostrarRegistro())">
            {{ mostrarRegistro() ? 'Cerrar Formulario' : '+ Matricular Nuevo Estudiante' }}
          </button>
        }
      </div>

      @if (aviso()) { <div class="aviso exito" style="margin-bottom: 1.25rem;">{{ aviso() }}</div> }
      @if (error()) { <div class="aviso error" style="margin-bottom: 1.25rem;">{{ error() }}</div> }

      <!-- Modal de Notificación de Clave Dinámica Generada -->
      @if (modalClave()) {
        <div class="modal-backdrop" (click)="cerrarModalClave()">
          <div class="card" (click)="$event.stopPropagation()" style="max-width: 28rem; width: 92%; margin: 0 auto; text-align: center; border-top: 4px solid var(--primary); box-shadow: var(--shadow-lg);">
            <span style="font-size: 2.75rem; display: block; margin-bottom: 0.5rem;">🔑</span>
            <h2 style="font-size: 1.35rem; margin-bottom: 0.25rem;">Clave Dinámica Generada</h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
              Estudiante: <strong>{{ modalClave()?.nombre }}</strong>
            </p>

            <div style="background: var(--bg-hover); border: 2px dashed var(--primary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                Clave Provisional de Ingreso:
              </span>
              <strong style="font-size: 1.4rem; font-family: monospace; letter-spacing: 0.08em; color: var(--primary);">
                {{ modalClave()?.clave }}
              </strong>
            </div>

            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
              ⚠️ El estudiante ingresará con su documento y esta clave temporal, y el sistema le solicitará <strong>obligatoriamente</strong> cambiarla en su primer inicio de sesión.
            </p>

            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button type="button" class="btn-principal" (click)="copiarClave(modalClave()?.clave || '')">
                📋 {{ copiado() ? '¡Copiada!' : 'Copiar Clave' }}
              </button>
              <button type="button" class="btn-secundario" (click)="cerrarModalClave()">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Formulario de Matrícula Nuevo Estudiante (Solo Dirección / Admin) -->
      @if (auth.rol() !== 'Profesor' && mostrarRegistro()) {
        <div class="card" style="margin-bottom: 1.5rem; border-top: 4px solid var(--primary);">
          <h2>Matricular Estudiante</h2>
          <p class="lead">El sistema genera automáticamente el código QR institucional y una clave dinámica provisional si se deja vacía.</p>

          <form (ngSubmit)="crear()" style="margin-top: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem;">
              <label>Nombre y Apellidos
                <input [(ngModel)]="nombre" name="nombre" required placeholder="Ej. Juan Pérez Gómez" />
              </label>

              <label>Documento de Identidad
                <input [(ngModel)]="documento" name="documento" inputmode="numeric" required placeholder="Ej. 1075302914" />
              </label>

              <label>Grupo Escolar Asignado
                <select [(ngModel)]="grupoId" name="grupoId" required>
                  <option [ngValue]="0">Elige un grupo escolar...</option>
                  @for (grupo of grupos(); track grupo.id) {
                    <option [ngValue]="grupo.id">{{ grupo.nombre }}</option>
                  }
                </select>
              </label>

              <label>
                Clave Inicial (Opcional)
                <div style="display: flex; gap: 0.35rem; margin-top: 0.25rem;">
                  <input [(ngModel)]="password" name="password" placeholder="Dejar en blanco para autogenerar" style="flex: 1;" />
                  <button type="button" class="btn-secundario" (click)="generarClaveAleatoriaLocal()" title="Generar clave dinámica al instante" style="padding: 0 0.65rem;">
                    🎲 Auto
                  </button>
                </div>
              </label>
            </div>

            <div class="acciones" style="margin-top: 1rem;">
              <button class="btn-principal" type="submit">
                <span>✔</span> Guardar Matrícula
              </button>
              <button type="button" class="btn-secundario" (click)="mostrarRegistro.set(false)">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Barra de Filtro y Búsqueda -->
      <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
        <div class="entre" style="gap: 1rem;">
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Filtrar Grupo:</label>
            <div class="segmento-toggle">
              <button type="button" [class.activo]="filtro === 0" (click)="setFiltro(0)">Todos</button>
              @for (g of grupos(); track g.id) {
                <button type="button" [class.activo]="filtro === g.id" (click)="setFiltro(g.id)">{{ g.nombre }}</button>
              }
            </div>
          </div>

          <div style="min-width: 14rem;">
            <input [(ngModel)]="busqueda" name="busqueda" placeholder="🔍 Buscar por nombre o documento..." style="width: 100%;" />
          </div>
        </div>
      </div>

      <!-- Tabla / Roster Institucional de Estudiantes -->
      <div class="gradebook-wrapper">
        <div class="gradebook-table-container">
          <table class="gradebook-table">
            <thead>
              <tr>
                <th class="col-estudiante">Estudiante</th>
                <th>Grupo</th>
                <th>Documento</th>
                <th>Acudiente Registrado</th>
                <th>Estado BD</th>
                <th>Biometría Facial</th>
                <th style="text-align: right; padding-right: 1.5rem;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (est of estudiantesPaginados(); track est.id) {
                <tr>
                  <td class="col-estudiante">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div class="avatar-circulo" style="width: 34px; height: 34px; font-size: 0.85rem; overflow: hidden;">
                        @if (est.tieneFoto) {
                          <img [src]="'/api/estudiantes/' + est.id + '/foto'" alt="" style="width: 100%; height: 100%; object-fit: cover;" (error)="est.tieneFoto = false" />
                        } @else {
                          {{ est.nombre.charAt(0) }}
                        }
                      </div>
                      <div>
                        <strong>{{ est.nombre }}</strong>
                        <span style="display: block; font-size: 0.75rem; color: var(--text-muted);">ID: #{{ est.id }}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span class="chip-grupo">{{ est.grupo || 'Sin grupo' }}</span>
                  </td>

                  <td style="font-family: var(--font-display); font-weight: 600;">
                    {{ est.documento }}
                  </td>

                  <td>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">
                      {{ est.acudiente || 'Sin vincular' }}
                    </span>
                  </td>

                  <td>
                    <span class="badge" [class]="est.activo !== false ? 'badge-verde' : 'badge-rojo'">
                      {{ est.activo !== false ? '🟢 Activo' : '🔴 Inactivo' }}
                    </span>
                  </td>

                  <td>
                    <span class="badge" [class]="est.tieneRostro ? 'badge-verde' : 'badge-amarillo'">
                      {{ est.tieneRostro ? '✔ Rostro Activo' : '⏳ Pendiente' }}
                    </span>
                  </td>

                  <td style="text-align: right; padding-right: 1rem;">
                    <div class="acciones" style="justify-content: flex-end; gap: 0.35rem;">
                      <button
                        type="button"
                        class="btn-secundario"
                        style="font-size: 0.78rem; padding: 0.35rem 0.65rem;"
                        (click)="resetearClave(est)"
                        title="Generar nueva clave dinámica temporal"
                      >
                        🔑 Clave Dinámica
                      </button>

                      <a [routerLink]="['/profesor/estudiantes', est.id, 'rostro']" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" title="Enrolar o ver fotos de rostro">
                        📸 Rostro
                      </a>

                      @if (est.carnet) {
                        <button type="button" class="btn-secundario" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;" (click)="descargarCarnet(est.id, est.documento)" title="Descargar carnet escolar PNG">
                          🪪 Carnet
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                    No se encontraron estudiantes registrados en este grupo o con ese criterio de búsqueda.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Slider de Paginación -->
        @if (estudiantesFiltrados().length > 0) {
          <div class="paginacion-slider-control">
            <span class="pag-info-tag">Página {{ pagina() }} de {{ totalPaginas() }} ({{ estudiantesFiltrados().length }} alumnos)</span>
            <div class="paginacion-slider-track">
              <button type="button" class="btn-pag-nav" [disabled]="pagina() <= 1" (click)="pagina.set(pagina() - 1)">‹</button>
              <input
                type="range"
                class="paginacion-slider-input"
                min="1"
                [max]="totalPaginas()"
                [value]="pagina()"
                (input)="onSliderChange($event)"
              />
              <button type="button" class="btn-pag-nav" [disabled]="pagina() >= totalPaginas()" (click)="pagina.set(pagina() + 1)">›</button>
            </div>
          </div>
        }
      </div>
    </section>
  `
})
export class EstudiantesComponent implements OnInit {
  nombre = '';
  documento = '';
  password = '';
  grupoId = 0;
  filtro = 0;
  busqueda = '';
  grupos = signal<Grupo[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  mostrarRegistro = signal(false);
  aviso = signal('');
  error = signal('');

  modalClave = signal<{ nombre: string; clave: string } | null>(null);
  copiado = signal(false);

  pagina = signal(1);
  elementosPorPagina = signal(10);

  constructor(
    private api: ApiService,
    public auth: AuthService
  ) {}

  totalPaginas = computed(() => {
    const total = this.estudiantesFiltrados().length;
    return Math.max(1, Math.ceil(total / this.elementosPorPagina()));
  });

  estudiantesPaginados = computed(() => {
    const lista = this.estudiantesFiltrados();
    const p = Math.min(this.pagina(), this.totalPaginas());
    const inicio = (p - 1) * this.elementosPorPagina();
    return lista.slice(inicio, inicio + this.elementosPorPagina());
  });

  onSliderChange(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.pagina.set(val);
  }

  ngOnInit(): void {
    this.api.grupos().subscribe((g) => this.grupos.set(g));
    this.cargar();
  }

  setFiltro(gId: number): void {
    this.filtro = gId;
    this.cargar();
  }

  cargar(): void {
    this.api.estudiantes(this.filtro || undefined).subscribe((lista) => this.estudiantes.set(lista));
  }

  estudiantesFiltrados() {
    const lista = this.estudiantes();
    if (!this.busqueda.trim()) return lista;
    const q = this.busqueda.toLowerCase();
    return lista.filter(e => e.nombre.toLowerCase().includes(q) || e.documento.includes(q));
  }

  generarClaveAleatoriaLocal(): void {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%*';
    const p1 = uppers[Math.floor(Math.random() * uppers.length)];
    const p2 = lowers[Math.floor(Math.random() * lowers.length)];
    const p3 = digits[Math.floor(Math.random() * digits.length)];
    const p4 = symbols[Math.floor(Math.random() * symbols.length)];
    const p5 = uppers[Math.floor(Math.random() * uppers.length)];
    const p6 = lowers[Math.floor(Math.random() * lowers.length)];
    const p7 = digits[Math.floor(Math.random() * digits.length)];
    this.password = `Est-${p1}${p2}${p3}${p4}${p5}${p6}${p7}`;
  }

  crear(): void {
    this.aviso.set('');
    this.error.set('');
    if (!this.nombre.trim() || !this.documento.trim() || !this.grupoId) {
      this.error.set('El nombre, documento y grupo son obligatorios.');
      return;
    }
    this.api.crearEstudiante({
      nombre: this.nombre,
      documento: this.documento,
      password: this.password,
      grupoId: this.grupoId
    }).subscribe({
      next: (creado: any) => {
        this.nombre = '';
        this.documento = '';
        this.password = '';
        this.mostrarRegistro.set(false);
        this.cargar();

        // Mostrar modal con la clave dinámica temporal
        if (creado.claveTemporal) {
          this.modalClave.set({
            nombre: creado.nombre,
            clave: creado.claveTemporal
          });
        } else {
          this.aviso.set(`Estudiante ${creado.nombre} matriculado exitosamente.`);
        }
      },
      error: (e) => this.error.set(mensajeError(e))
    });
  }

  resetearClave(est: Estudiante): void {
    this.api.resetClaveDinamica(est.id).subscribe({
      next: (res) => {
        this.modalClave.set({
          nombre: est.nombre,
          clave: res.claveTemporal
        });
      },
      error: (e) => this.error.set(mensajeError(e))
    });
  }

  cerrarModalClave(): void {
    this.modalClave.set(null);
    this.copiado.set(false);
  }

  copiarClave(clave: string): void {
    if (!clave) return;
    navigator.clipboard.writeText(clave).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  descargarCarnet(id: number, doc: string): void {
    this.api.carnetEstudiante(id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carnet-${doc}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
