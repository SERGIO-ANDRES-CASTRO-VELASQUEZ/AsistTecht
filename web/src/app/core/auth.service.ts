import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Rol, SesionUsuario } from './models';

const CLAVE = 'asisqr-sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly sesion = signal<SesionUsuario | null>(this.leer());

  constructor(private http: HttpClient) {}

  rol(): Rol | null {
    return this.sesion()?.rol ?? null;
  }

  login(usuario: string, password: string, rol: Rol) {
    return this.http
      .post<SesionUsuario>('/api/auth/login', { usuario, password, rol })
      .pipe(tap((sesion) => this.guardar(sesion)));
  }

  salir(): void {
    localStorage.removeItem(CLAVE);
    this.sesion.set(null);
  }

  private guardar(sesion: SesionUsuario): void {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
    this.sesion.set(sesion);
  }

  private leer(): SesionUsuario | null {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as SesionUsuario;
    } catch {
      return null;
    }
  }
}
