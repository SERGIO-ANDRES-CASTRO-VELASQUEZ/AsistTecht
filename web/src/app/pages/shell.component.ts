import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { Notificacion, Rol } from '../core/models';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">
      <!-- Barra Superior Institucional (Demostración de Roles y Periodo) -->
      <div class="role-switcher-banner no-print">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-right: 0.75rem;">
          <span class="pulsing-dot"></span>
          <span><strong>Año Lectivo 2026</strong> · Periodo 1 en Curso</span>
        </div>

        <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">Demostración de Roles:</span>
          <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Admin'" (click)="cambiarRolRapido('admin', 'Admin2026*', 'Admin', '/admin')">
            👑 Admin
          </button>
          <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Director'" (click)="cambiarRolRapido('director', 'AsisTecht2026', 'Director', '/director')">
            🏛️ Dirección
          </button>
          <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Profesor'" (click)="cambiarRolRapido('profesor', 'AsisQR2026', 'Profesor', '/profesor')">
            👨‍🏫 Docente
          </button>
          <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Estudiante'" (click)="cambiarRolRapido('1000000001', 'Estudiante2026', 'Estudiante', '/estudiante')">
            🎓 Estudiantes (Laura)
          </button>
          <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Acudiente'" (click)="cambiarRolRapido('acudiente', 'Acudiente2026', 'Acudiente', '/acudiente')">
            👨‍👩‍👧 Familia (Elena)
          </button>
        </div>
      </div>

      <!-- Header Principal -->
      <header>
        <!-- Logo y Nombre Institucional -->
        <a class="marca-wrapper" [routerLink]="inicio()">
          <div class="logo-escuela">GIR</div>
          <div class="marca-texto">
            <strong>AsisTecht</strong>
            <span>Gimnasio José Eustasio Rivera</span>
          </div>
        </a>

        <!-- Barra de Navegación Desktop / Tablet -->
        <nav class="nav-pills nav-desktop">
          @if (auth.rol() === 'Admin') {
            <a routerLink="/admin" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">
              <span>⚙️</span> Panel Central
            </a>
          } @else if (auth.rol() === 'Director') {
            <a routerLink="/director" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">
              <span>📊</span> Dashboard
            </a>
            <a routerLink="/director/horarios" routerLinkActive="activo">
              <span>📅</span> Horarios
            </a>
            <a routerLink="/director/profesores" routerLinkActive="activo">
              <span>👨‍🏫</span> Docentes
            </a>
            <a routerLink="/director/convivencia" routerLinkActive="activo">
              <span>⚖️</span> Convivencia
            </a>
            <a routerLink="/director/boletin" routerLinkActive="activo">
              <span>📜</span> Boletines
            </a>
          } @else if (auth.rol() === 'Profesor') {
            <a routerLink="/profesor" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="menuGestionAbierto.set(false)">
              <span>📊</span> Dashboard
            </a>
            <a routerLink="/profesor/horario" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)">
              <span>📅</span> Horario
            </a>
            <a routerLink="/profesor/planilla" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)">
              <span>📝</span> Planilla
            </a>
            <a routerLink="/profesor/clase" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)">
              <span>📷</span> Asistencia
            </a>

            <!-- Dropdown Menú de Gestión Académica (Evita desborde y alargue) -->
            <div class="nav-dropdown-wrapper">
              <button
                type="button"
                class="nav-dropdown-btn"
                [class.activo]="esRutaGestionProfesor() || menuGestionAbierto()"
                (click)="$event.stopPropagation(); menuGestionAbierto.set(!menuGestionAbierto())"
              >
                <span>📚</span> Gestión ▾
              </button>

              @if (menuGestionAbierto()) {
                <div class="dropdown-backdrop" (click)="menuGestionAbierto.set(false)"></div>
                <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                  <a routerLink="/profesor/materias" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)" class="nav-dropdown-item">
                    <span>📚</span> Mis Asignaturas
                  </a>
                  <a routerLink="/profesor/grupos" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)" class="nav-dropdown-item">
                    <span>👥</span> Grupos a Cargo
                  </a>
                  <a routerLink="/profesor/estudiantes" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)" class="nav-dropdown-item">
                    <span>🎓</span> Estudiantes & Carnets
                  </a>
                  <a routerLink="/profesor/convivencia" routerLinkActive="activo" (click)="menuGestionAbierto.set(false)" class="nav-dropdown-item">
                    <span>⚖️</span> Observador Escolar
                  </a>
                </div>
              }
            </div>
          } @else if (auth.rol() === 'Estudiante') {
            <a routerLink="/estudiante" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">
              <span>🪪</span> Carnet
            </a>
            <a routerLink="/estudiante/horario" routerLinkActive="activo">
              <span>📅</span> Horario
            </a>
            <a routerLink="/estudiante/notas" routerLinkActive="activo">
              <span>📈</span> Calificaciones
            </a>
            <a routerLink="/estudiante/boletin" routerLinkActive="activo">
              <span>📜</span> Boletín
            </a>
            <a routerLink="/estudiante/convivencia" routerLinkActive="activo">
              <span>⚖️</span> Observador
            </a>
            <a routerLink="/estudiante/rostro" routerLinkActive="activo">
              <span>📸</span> Biometría
            </a>
          } @else if (auth.rol() === 'Acudiente') {
            <a routerLink="/acudiente" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">
              <span>👨‍👩‍👧</span> Familia
            </a>
            <a routerLink="/acudiente/horario" routerLinkActive="activo">
              <span>📅</span> Horario
            </a>
            <a routerLink="/acudiente/boletin" routerLinkActive="activo">
              <span>📜</span> Boletín
            </a>
            <a routerLink="/acudiente/convivencia" routerLinkActive="activo">
              <span>⚖️</span> Observador
            </a>
          }

          @if (auth.rol() === 'Admin') {
            <a [routerLink]="clave()" routerLinkActive="activo">
              <span>🛡️</span> Clave
            </a>
          }
        </nav>

        <!-- Controles de Usuario: Campana de Notificaciones, APK, Modo Oscuro y Menú Hamburguesa -->
        <div class="user-controls">
          <!-- Botón de Campana de Notificaciones -->
          <button type="button" class="btn-notificacion" [class.abierto]="mostrarPanelNotif()" (click)="alternarPanelNotificaciones()" title="Centro de Notificaciones">
            <span style="font-size: 1.15rem;">🔔</span>
            @if (noLeidas() > 0) {
              <span class="notif-badge">{{ noLeidas() }}</span>
              <span class="notif-ping"></span>
            }
          </button>

          <!-- Botón Descargar APK (Visible en Desktop) -->
          <button type="button" class="btn-apk-pill btn-apk-desktop" (click)="mostrarModalApk.set(true)" title="Descargar APK para celular Android">
            <span>📱</span> App APK
          </button>

          <!-- Perfil con Avatar e Inicial (Desktop) -->
          <div class="user-badge user-badge-desktop">
            <div class="avatar-circulo" style="overflow: hidden;">
              @if (auth.rol() === 'Estudiante' && tieneFotoEstudiante()) {
                <img src="/api/cuenta/foto" (error)="tieneFotoEstudiante.set(false)" alt="Foto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
              } @else {
                {{ inicial() }}
              }
            </div>
            <span style="max-width: 5.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {{ primerNombre(auth.sesion()?.nombre) }}
            </span>
            <span class="filtro-count" style="font-size: 0.7rem;">{{ auth.rol() }}</span>
          </div>

          <!-- Switch Modo Claro / Oscuro -->
          <button type="button" class="btn-tema" (click)="alternarTema()" [title]="esOscuro() ? 'Modo Claro' : 'Modo Oscuro'">
            {{ esOscuro() ? '☀️' : '🌙' }}
          </button>

          <!-- Botón Salir (Desktop) -->
          <button type="button" class="btn-salir btn-salir-desktop" (click)="salir()">
            <span>🚪</span> Salir
          </button>

          <!-- Botón Menú Hamburguesa (Móvil) -->
          <button type="button" class="btn-hamburguesa" [class.abierto]="menuMovilAbierto()" (click)="alternarMenuMovil()" title="Menú de Navegación">
            <span class="icono-hamburguesa">{{ menuMovilAbierto() ? '✕' : '☰' }}</span>
          </button>
        </div>
      </header>

      <!-- ==========================================================================
           CENTRO DE NOTIFICACIONES UNIFICADO (OVERLAY Y MODAL FLOTANTE / BOTTOM SHEET)
           ========================================================================== -->
      @if (mostrarPanelNotif()) {
        <div class="notif-modal-overlay no-print" (click)="cerrarNotificacionesFondo($event)">
          <div class="notif-panel" (click)="$event.stopPropagation()">
            <div class="notif-panel-header">
              <div>
                <h3 style="font-size: 1.05rem; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                  <span>🔔</span> Notificaciones
                  @if (noLeidas() > 0) {
                    <span class="badge badge-verde" style="font-size: 0.7rem;">{{ noLeidas() }} sin leer</span>
                  }
                </h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.15rem 0 0;">Enlazadas en tiempo real entre Web y Móvil</p>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                @if (noLeidas() > 0) {
                  <button type="button" class="btn-accion-sm" (click)="marcarTodasLeidas()" title="Marcar todas como leídas">
                    ✓ Todo leído
                  </button>
                }
                <button type="button" class="btn-cerrar-drawer" style="width: 28px; height: 28px; font-size: 0.85rem;" (click)="mostrarPanelNotif.set(false)" title="Cerrar">✕</button>
              </div>
            </div>

            <!-- Tabs de Filtros de Notificaciones -->
            <div class="notif-panel-tabs">
              <button type="button" class="notif-tab" [class.activo]="filtroNotif() === 'todas'" (click)="filtroNotif.set('todas')">
                Todas ({{ notificaciones().length }})
              </button>
              <button type="button" class="notif-tab" [class.activo]="filtroNotif() === 'no-leidas'" (click)="filtroNotif.set('no-leidas')">
                Sin Leer ({{ noLeidas() }})
              </button>
              <button type="button" class="notif-tab" [class.activo]="filtroNotif() === 'academicas'" (click)="filtroNotif.set('academicas')">
                🎓 Notas
              </button>
              <button type="button" class="notif-tab" [class.activo]="filtroNotif() === 'asistencia'" (click)="filtroNotif.set('asistencia')">
                🕒 Asistencia
              </button>
              <button type="button" class="notif-tab" [class.activo]="filtroNotif() === 'ia'" (click)="filtroNotif.set('ia')">
                🤖 Alertas IA
              </button>
            </div>

            <!-- Lista de Notificaciones -->
            <div class="notif-lista">
              @if (notificacionesFiltradas().length === 0) {
                <div class="notif-vacio">
                  <span style="font-size: 2.2rem;">📭</span>
                  <p style="margin: 0.35rem 0 0; font-size: 0.88rem; color: var(--text-muted);">No tienes notificaciones en esta categoría.</p>
                </div>
              } @else {
                @for (n of notificacionesFiltradas(); track n.id) {
                  <div class="notif-item" [class.no-leida]="!n.leida" (click)="abrirNotificacion(n)">
                    <div class="notif-item-icono" [class]="claseIconoNotif(n.tipo)">
                      {{ iconoNotif(n.tipo) }}
                    </div>
                    <div class="notif-item-contenido">
                      <div class="notif-item-header">
                        <strong class="notif-item-titulo">{{ n.titulo }}</strong>
                        @if (!n.leida) {
                          <span class="notif-punto-no-leido"></span>
                        }
                      </div>
                      <p class="notif-item-mensaje">{{ n.mensaje }}</p>
                      <div class="notif-item-meta">
                        <span class="notif-item-tiempo">{{ n.fecha }}</span>
                        @if (n.link) {
                          <span class="notif-item-enlace">Ir a sección ➔</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              }
            </div>

            <div class="notif-panel-footer">
              <span>Sincronizado con AsisTecht Android & iOS</span>
              <button type="button" class="btn-accion-sm" (click)="cargarNotificaciones()">
                🔄 Refrescar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================================================
           MENÚ HAMBURGUESA LATERAL (DRAWER MÓVIL RESPONSIVO)
           ========================================================================== -->
      @if (menuMovilAbierto()) {
        <div class="drawer-backdrop no-print" (click)="cerrarMenuMovil()"></div>
        <aside class="drawer-movil no-print" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="logo-escuela" style="width: 38px; height: 38px; font-size: 1.05rem;">GIR</div>
              <div>
                <strong style="display: block; font-size: 1rem; color: var(--text-primary); line-height: 1.2;">
                  AsisTecht
                </strong>
                <span style="font-size: 0.72rem; color: var(--text-muted);">Gimnasio José Eustasio Rivera</span>
              </div>
            </div>
            <button type="button" class="btn-cerrar-drawer" (click)="cerrarMenuMovil()" title="Cerrar Menú">✕</button>
          </div>

          <!-- Perfil del Usuario en el Drawer -->
          <div class="drawer-perfil-card">
            <div class="avatar-circulo" style="width: 42px; height: 42px; font-size: 1.1rem; flex-shrink: 0; overflow: hidden;">
              @if (auth.rol() === 'Estudiante' && tieneFotoEstudiante()) {
                <img src="/api/cuenta/foto" (error)="tieneFotoEstudiante.set(false)" alt="Foto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
              } @else {
                {{ inicial() }}
              }
            </div>
            <div style="min-width: 0; flex: 1;">
              <strong style="display: block; font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ auth.sesion()?.nombre }}
              </strong>
              <div style="display: flex; gap: 0.35rem; align-items: center; margin-top: 0.2rem;">
                <span class="badge badge-verde" style="font-size: 0.68rem;">{{ auth.rol() }}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">Conectado</span>
              </div>
            </div>
          </div>

          <!-- Selector de Demostración de Roles Móvil (Limpio y Accesible) -->
          <div class="drawer-demo-roles">
            <span class="drawer-seccion-titulo">Cambiar Rol (Demostración)</span>
            <div class="drawer-roles-grid">
              <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Admin'" (click)="cambiarRolRapido('admin', 'Admin2026*', 'Admin', '/admin')">
                👑 Admin
              </button>
              <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Director'" (click)="cambiarRolRapido('director', 'AsisTecht2026', 'Director', '/director')">
                🏛️ Dirección
              </button>
              <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Profesor'" (click)="cambiarRolRapido('profesor', 'AsisQR2026', 'Profesor', '/profesor')">
                👨‍🏫 Docente
              </button>
              <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Estudiante'" (click)="cambiarRolRapido('1000000001', 'Estudiante2026', 'Estudiante', '/estudiante')">
                🎓 Estudiantes
              </button>
              <button type="button" class="btn-role-switch" [class.activo]="auth.rol() === 'Acudiente'" (click)="cambiarRolRapido('acudiente', 'Acudiente2026', 'Acudiente', '/acudiente')">
                👨‍👩‍👧 Familia
              </button>
            </div>
          </div>

          <!-- Botón de Notificaciones Directo dentro del Drawer -->
          <button type="button" class="drawer-link" (click)="abrirNotificacionesDesdeDrawer()" style="background: var(--bg-surface); border: 1.5px solid var(--border); margin-bottom: 0.75rem;">
            <span class="drawer-link-icono">🔔</span>
            <div class="drawer-link-texto">
              <strong>Centro de Notificaciones</strong>
              <small>{{ noLeidas() > 0 ? noLeidas() + ' avisos pendientes' : 'Todas leídas' }}</small>
            </div>
            @if (noLeidas() > 0) {
              <span class="badge badge-verde" style="margin-left: auto;">{{ noLeidas() }}</span>
            }
          </button>

          <!-- Enlaces de Navegación del Drawer Según el Rol -->
          <nav class="drawer-nav">
            <div class="drawer-seccion-titulo">Módulos del Sistema</div>

            @if (auth.rol() === 'Admin') {
              <a routerLink="/admin" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">⚙️</span>
                <div class="drawer-link-texto">
                  <strong>Panel Administrador Central</strong>
                  <small>Usuarios, claves, familias y BD</small>
                </div>
              </a>
            } @else if (auth.rol() === 'Director') {
              <a routerLink="/director" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📊</span>
                <div class="drawer-link-texto">
                  <strong>Dashboard BI Directivo</strong>
                  <small>Estadísticas y balance general</small>
                </div>
              </a>
              <a routerLink="/director/horarios" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📅</span>
                <div class="drawer-link-texto">
                  <strong>Horarios de Clases</strong>
                  <small>Programación académica semanal</small>
                </div>
              </a>
              <a routerLink="/director/profesores" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">👨‍🏫</span>
                <div class="drawer-link-texto">
                  <strong>Planta Docente</strong>
                  <small>Gestión de profesores</small>
                </div>
              </a>
              <a routerLink="/director/convivencia" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">⚖️</span>
                <div class="drawer-link-texto">
                  <strong>Convivencia Escolar</strong>
                  <small>Observador general</small>
                </div>
              </a>
              <a routerLink="/director/boletin" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📜</span>
                <div class="drawer-link-texto">
                  <strong>Boletines Oficiales</strong>
                  <small>Informes periódicos MEN 1290</small>
                </div>
              </a>
            } @else if (auth.rol() === 'Profesor') {
              <div class="drawer-subseccion-header">⚡ OPERACIÓN DIARIA</div>
              <a routerLink="/profesor" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📊</span>
                <div class="drawer-link-texto">
                  <strong>Mi Dashboard</strong>
                  <small>Alertas de deserción con IA</small>
                </div>
              </a>
              <a routerLink="/profesor/horario" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📅</span>
                <div class="drawer-link-texto">
                  <strong>Mi Horario Semanal</strong>
                  <small>Clases y salones asignados</small>
                </div>
              </a>
              <a routerLink="/profesor/planilla" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📝</span>
                <div class="drawer-link-texto">
                  <strong>Planilla de Notas</strong>
                  <small>Calificaciones y ponderaciones</small>
                </div>
              </a>
              <a routerLink="/profesor/clase" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📷</span>
                <div class="drawer-link-texto">
                  <strong>Asistencia QR y Facial</strong>
                  <small>Pase de lista con cámara</small>
                </div>
              </a>

              <div class="drawer-subseccion-header" style="margin-top: 0.65rem;">📁 GESTIÓN ESCOLAR</div>
              <a routerLink="/profesor/materias" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link drawer-link-compact">
                <span class="drawer-link-icono">📚</span>
                <div class="drawer-link-texto">
                  <strong>Mis Asignaturas</strong>
                </div>
              </a>
              <a routerLink="/profesor/grupos" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link drawer-link-compact">
                <span class="drawer-link-icono">👥</span>
                <div class="drawer-link-texto">
                  <strong>Grupos a Cargo</strong>
                </div>
              </a>
              <a routerLink="/profesor/estudiantes" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link drawer-link-compact">
                <span class="drawer-link-icono">🎓</span>
                <div class="drawer-link-texto">
                  <strong>Estudiantes y Carnets</strong>
                </div>
              </a>
              <a routerLink="/profesor/convivencia" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link drawer-link-compact">
                <span class="drawer-link-icono">⚖️</span>
                <div class="drawer-link-texto">
                  <strong>Observador Escolar</strong>
                </div>
              </a>
            } @else if (auth.rol() === 'Estudiante') {
              <a routerLink="/estudiante" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">🪪</span>
                <div class="drawer-link-texto">
                  <strong>Mi Carnet Digital QR</strong>
                  <small>Código de asistencia personal</small>
                </div>
              </a>
              <a routerLink="/estudiante/horario" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📅</span>
                <div class="drawer-link-texto">
                  <strong>Mi Horario de Clases</strong>
                  <small>Materias y salones de la semana</small>
                </div>
              </a>
              <a routerLink="/estudiante/notas" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📈</span>
                <div class="drawer-link-texto">
                  <strong>Mis Calificaciones</strong>
                  <small>Histórico y porcentaje de faltas</small>
                </div>
              </a>
              <a routerLink="/estudiante/boletin" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📜</span>
                <div class="drawer-link-texto">
                  <strong>Boletín Oficial de Calificaciones</strong>
                  <small>Informe completo 10 asignaturas</small>
                </div>
              </a>
              <a routerLink="/estudiante/convivencia" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">⚖️</span>
                <div class="drawer-link-texto">
                  <strong>Mi Observador Escolar</strong>
                  <small>Seguimiento formativo</small>
                </div>
              </a>
              <a routerLink="/estudiante/rostro" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📸</span>
                <div class="drawer-link-texto">
                  <strong>Biometría Facial</strong>
                  <small>Calibración para pase de lista</small>
                </div>
              </a>
            } @else if (auth.rol() === 'Acudiente') {
              <a routerLink="/acudiente" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">👨‍👩‍👧</span>
                <div class="drawer-link-texto">
                  <strong>Portal de la Familia</strong>
                  <small>Seguimiento en vivo de hijos</small>
                </div>
              </a>
              <a routerLink="/acudiente/horario" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📅</span>
                <div class="drawer-link-texto">
                  <strong>Horario Escolar</strong>
                  <small>Horario de clases de sus hijos</small>
                </div>
              </a>
              <a routerLink="/acudiente/boletin" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">📜</span>
                <div class="drawer-link-texto">
                  <strong>Boletín de Calificaciones</strong>
                  <small>Informe periódico oficial</small>
                </div>
              </a>
              <a routerLink="/acudiente/convivencia" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">⚖️</span>
                <div class="drawer-link-texto">
                  <strong>Observador Convivencial</strong>
                  <small>Anotaciones y compromisos</small>
                </div>
              </a>
            }

            @if (auth.rol() === 'Admin') {
              <a [routerLink]="clave()" routerLinkActive="activo" (click)="cerrarMenuMovil()" class="drawer-link">
                <span class="drawer-link-icono">🛡️</span>
                <div class="drawer-link-texto">
                  <strong>Seguridad y Clave</strong>
                  <small>Gestión de credenciales</small>
                </div>
              </a>
            }
          </nav>

          <!-- Acciones Rápidas en la Base del Drawer -->
          <div class="drawer-footer-actions">
            <button type="button" class="btn-principal" style="width: 100%; justify-content: center; font-size: 0.88rem; margin-bottom: 0.65rem;" (click)="mostrarModalApk.set(true); cerrarMenuMovil()">
              <span>📱</span> Descargar App APK Oficial
            </button>

            <button type="button" class="btn-peligro" style="width: 100%; justify-content: center; font-size: 0.88rem;" (click)="salir()">
              <span>🚪</span> Cerrar Sesión
            </button>
          </div>
        </aside>
      }

      <!-- Contenido Principal -->
      <main class="shell-main">
        <router-outlet />
      </main>

      <!-- ==========================================================================
           BARRA NATIVA INFERIOR PARA VISTA MÓVIL / APK (DOCK DE NAVEGACIÓN VIRTUAL CAMPUS)
           ========================================================================== -->
      <nav class="dock-app-movil no-print">
        <!-- Tab 1: Inicio / Dashboard -->
        <a [routerLink]="inicio()" class="dock-app-item" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrarMenuMovil()">
          <span class="dock-icono">🏠</span>
          <span class="dock-texto">Inicio</span>
        </a>

        <!-- Tab 2: Notas / Calificaciones -->
        <a [routerLink]="notasUrl()" class="dock-app-item" routerLinkActive="activo" (click)="cerrarMenuMovil()">
          <span class="dock-icono">📈</span>
          <span class="dock-texto">Notas</span>
        </a>

        <!-- Tab 3: Asistencia QR / Biometría -->
        <a [routerLink]="asistenciaUrl()" class="dock-app-item" routerLinkActive="activo" (click)="cerrarMenuMovil()">
          <span class="dock-icono">📷</span>
          <span class="dock-texto">Asistencia</span>
        </a>

        <!-- Tab 4: Boletín Oficial (Director, Estudiante, Familia) o Alumnos (Profesor) o Usuarios (Admin) -->
        @if (auth.rol() === 'Admin') {
          <a routerLink="/admin" class="dock-app-item" routerLinkActive="activo" (click)="cerrarMenuMovil()">
            <span class="dock-icono">👥</span>
            <span class="dock-texto">Usuarios</span>
          </a>
        } @else if (auth.rol() === 'Profesor') {
          <a routerLink="/profesor/estudiantes" class="dock-app-item" routerLinkActive="activo" (click)="cerrarMenuMovil()">
            <span class="dock-icono">👥</span>
            <span class="dock-texto">Alumnos</span>
          </a>
        } @else {
          <a [routerLink]="boletinUrl()" class="dock-app-item" routerLinkActive="activo" (click)="cerrarMenuMovil()">
            <span class="dock-icono">📜</span>
            <span class="dock-texto">Boletín</span>
          </a>
        }

        <!-- Tab 5: Notificaciones con Contador (Abre el panel sin conflicto) -->
        <button type="button" class="dock-app-item btn-dock-notif" [class.activo]="mostrarPanelNotif()" (click)="alternarPanelNotificaciones()">
          <div style="position: relative; display: inline-block;">
            <span class="dock-icono">🔔</span>
            @if (noLeidas() > 0) {
              <span class="dock-badge">{{ noLeidas() }}</span>
            }
          </div>
          <span class="dock-texto">Avisos</span>
        </button>
      </nav>

      <!-- Modal de Descarga de APK para Android -->
      @if (mostrarModalApk()) {
        <div class="modal-backdrop" (click)="cerrarModalFondo($event)">
          <div class="modal-card">
            <button type="button" class="modal-cerrar" (click)="mostrarModalApk.set(false)" title="Cerrar">✕</button>

            <div style="text-align: center;">
              <div class="apk-icon-box">📱</div>
              <div class="apk-badge-tag" style="margin-bottom: 0.5rem;">Versión Oficial 2.4 · Android</div>
              <h2 style="font-size: 1.5rem; margin-bottom: 0.35rem;">AsisTecht Móvil (.APK)</h2>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0 auto; max-width: 26rem;">
                Instala la aplicación oficial en cualquier celular o tablet Android. Conecta directamente a tu campus institucional con notificaciones y pase de lista sin errores.
              </p>
            </div>

            <!-- Lista de Características -->
            <div style="margin: 1.25rem 0; background: var(--bg-hover); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem;">
              <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; font-size: 0.85rem; color: var(--text-primary);">
                <li style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: var(--grade-superior);">✔</span>
                  <span><strong>Conexión Directa al Servidor:</strong> Sin pantallas de prueba ni sitios genéricos ajenos.</span>
                </li>
                <li style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: var(--grade-superior);">✔</span>
                  <span><strong>Pase de lista con cámara:</strong> Escaneo de código QR y biometría facial rápida.</span>
                </li>
                <li style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: var(--grade-superior);">✔</span>
                  <span><strong>Carnet digital móvil:</strong> El estudiante siempre lleva su QR oficial en el teléfono.</span>
                </li>
                <li style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: var(--grade-superior);">✔</span>
                  <span><strong>Boletín de 10 asignaturas:</strong> Consulta oficial idéntica a la plataforma virtual.</span>
                </li>
              </ul>
            </div>

            <!-- Botón de Descarga Directa -->
            <div style="text-align: center; margin: 1.25rem 0;">
              <a href="/downloads/asisttecht-movil.apk" download="asisttecht-movil.apk" class="btn-principal" style="width: 100%; justify-content: center; font-size: 1.05rem; padding: 0.85rem 1.25rem; text-decoration: none;">
                <span>📥</span> Descargar APK Oficial (7.0 MB)
              </a>
              <span style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">
                Firmado y compatible con Android 8.0, 9, 10, 11, 12, 13, 14 y 15+
              </span>
            </div>

            <!-- Opción Recomendada PWA (1-Tap Instalar desde Chrome) -->
            <div style="margin-top: 1rem; padding: 0.85rem; background: var(--bg-surface); border: 1.5px dashed var(--primary); border-radius: var(--radius-md); text-align: left;">
              <strong style="font-size: 0.82rem; color: var(--primary); display: block; margin-bottom: 0.25rem;">
                💡 O instala directamente desde Chrome en tu celular:
              </strong>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">
                Toca los 3 puntos arriba a la derecha en Chrome y pulsa <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>. Funciona al instante como una app nativa en tu teléfono.
              </p>
            </div>

            <button type="button" class="btn-secundario" (click)="mostrarModalApk.set(false)" style="width: 100%; justify-content: center; margin-top: 1rem;">
              Cerrar
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ShellComponent implements OnInit, OnDestroy {
  esOscuro = signal(false);
  mostrarModalApk = signal(false);
  mostrarPanelNotif = signal(false);
  menuMovilAbierto = signal(false);
  menuGestionAbierto = signal(false);
  notificaciones = signal<Notificacion[]>([]);
  noLeidas = signal(0);
  tieneFotoEstudiante = signal(false);
  filtroNotif = signal<'todas' | 'no-leidas' | 'academicas' | 'asistencia' | 'ia'>('todas');

  private intervalRef: any = null;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  notificacionesFiltradas = computed(() => {
    const f = this.filtroNotif();
    const list = this.notificaciones();
    if (f === 'no-leidas') return list.filter(n => !n.leida);
    if (f === 'academicas') return list.filter(n => n.tipo === 'Academica');
    if (f === 'asistencia') return list.filter(n => n.tipo === 'Asistencia');
    if (f === 'ia') return list.filter(n => n.tipo === 'AlertaIa');
    return list;
  });

  inicio(): string {
    const rol = this.auth.rol();
    if (rol === 'Admin') return '/admin';
    if (rol === 'Director') return '/director';
    if (rol === 'Profesor') return '/profesor';
    if (rol === 'Acudiente') return '/acudiente';
    return '/estudiante';
  }

  esRutaGestionProfesor(): boolean {
    const url = this.router.url;
    return (
      url.includes('/profesor/materias') ||
      url.includes('/profesor/grupos') ||
      url.includes('/profesor/estudiantes') ||
      url.includes('/profesor/convivencia')
    );
  }

  notasUrl(): string {
    const rol = this.auth.rol();
    if (rol === 'Admin') return '/admin';
    if (rol === 'Profesor') return '/profesor/planilla';
    if (rol === 'Estudiante') return '/estudiante/notas';
    if (rol === 'Acudiente') return '/acudiente';
    return '/director';
  }

  asistenciaUrl(): string {
    const rol = this.auth.rol();
    if (rol === 'Admin') return '/admin';
    if (rol === 'Profesor') return '/profesor/clase';
    if (rol === 'Estudiante') return '/estudiante';
    if (rol === 'Acudiente') return '/acudiente';
    return '/director';
  }

  boletinUrl(): string {
    const rol = this.auth.rol();
    if (rol === 'Director') return '/director/boletin';
    if (rol === 'Acudiente') return '/acudiente/boletin';
    return '/estudiante/boletin';
  }

  clave(): string {
    const rol = this.auth.rol();
    if (rol === 'Admin') return '/admin/clave';
    if (rol === 'Director') return '/director/clave';
    if (rol === 'Profesor') return '/profesor/clave';
    if (rol === 'Acudiente') return '/acudiente/clave';
    return '/estudiante/clave';
  }

  ngOnInit(): void {
    const temaGuardado = localStorage.getItem('asisteht-theme');
    if (temaGuardado === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.esOscuro.set(true);
    }

    this.cargarNotificaciones();
    this.verificarFotoPerfil();
    this.router.events.subscribe(() => {
      this.menuGestionAbierto.set(false);
      this.verificarFotoPerfil();
    });
    this.intervalRef = setInterval(() => {
      this.cargarNotificaciones();
    }, 25000);
  }

  ngOnDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  alternarMenuMovil(): void {
    const nuevo = !this.menuMovilAbierto();
    this.menuMovilAbierto.set(nuevo);
    if (nuevo) {
      this.mostrarPanelNotif.set(false);
    }
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  abrirNotificacionesDesdeDrawer(): void {
    this.menuMovilAbierto.set(false);
    this.mostrarPanelNotif.set(true);
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    if (!this.auth.token()) return;
    this.api.notificaciones().subscribe({
      next: (res) => {
        this.notificaciones.set(res.notificaciones || []);
        this.noLeidas.set(res.noLeidas || 0);
      },
      error: () => {}
    });
  }

  alternarPanelNotificaciones(): void {
    const nuevo = !this.mostrarPanelNotif();
    this.mostrarPanelNotif.set(nuevo);
    if (nuevo) {
      this.menuMovilAbierto.set(false);
      this.cargarNotificaciones();
    }
  }

  abrirNotificacion(n: Notificacion): void {
    if (!n.leida) {
      this.api.marcarNotificacionLeida(n.id).subscribe({
        next: () => {
          n.leida = true;
          this.noLeidas.set(Math.max(0, this.noLeidas() - 1));
        }
      });
    }

    if (n.link) {
      this.mostrarPanelNotif.set(false);
      void this.router.navigateByUrl(n.link);
    }
  }

  marcarTodasLeidas(): void {
    this.api.marcarTodasNotificacionesLeidas().subscribe({
      next: () => {
        const actualizadas = this.notificaciones().map(n => ({ ...n, leida: true }));
        this.notificaciones.set(actualizadas);
        this.noLeidas.set(0);
      }
    });
  }

  iconoNotif(tipo: string): string {
    if (tipo === 'Academica') return '🎓';
    if (tipo === 'Asistencia') return '🕒';
    if (tipo === 'AlertaIa') return '🤖';
    if (tipo === 'Convivencia') return '⚖️';
    return '📢';
  }

  claseIconoNotif(tipo: string): string {
    if (tipo === 'Academica') return 'icono-academica';
    if (tipo === 'Asistencia') return 'icono-asistencia';
    if (tipo === 'AlertaIa') return 'icono-ia';
    if (tipo === 'Convivencia') return 'icono-convivencia';
    return 'icono-info';
  }

  primerNombre(nombre?: string | null): string {
    if (!nombre) return 'Usuario';
    const partes = nombre.trim().split(/\s+/);
    return partes[0] || nombre;
  }

  inicial(): string {
    const nombre = this.auth.sesion()?.nombre || 'U';
    return nombre.charAt(0).toUpperCase();
  }

  verificarFotoPerfil(): void {
    if (this.auth.rol() === 'Estudiante') {
      this.api.perfil().subscribe({
        next: (p) => this.tieneFotoEstudiante.set(!!p.tieneFoto),
        error: () => this.tieneFotoEstudiante.set(false)
      });
    } else {
      this.tieneFotoEstudiante.set(false);
    }
  }

  cambiarRolRapido(usr: string, pass: string, rol: Rol, destino: string): void {
    this.auth.login(usr, pass, rol).subscribe({
      next: () => {
        this.mostrarPanelNotif.set(false);
        this.cerrarMenuMovil();
        this.cargarNotificaciones();
        this.verificarFotoPerfil();
        void this.router.navigateByUrl(destino);
      }
    });
  }

  alternarTema(): void {
    const nuevo = !this.esOscuro();
    this.esOscuro.set(nuevo);
    if (nuevo) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('asisteht-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('asisteht-theme', 'light');
    }
  }

  cerrarModalFondo(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.mostrarModalApk.set(false);
    }
  }

  cerrarNotificacionesFondo(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('notif-modal-overlay')) {
      this.mostrarPanelNotif.set(false);
    }
  }

  salir(): void {
    this.cerrarMenuMovil();
    this.auth.salir();
    void this.router.navigateByUrl('/ingreso');
  }
}
