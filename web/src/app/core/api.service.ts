import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Estudiante, Grupo, Marca, Materia, SesionDetalle, SesionResumen } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  resumen() {
    return this.http.get<{ materias: number; grupos: number; estudiantes: number; sesionesHoy: number }>('/api/resumen');
  }

  materias() {
    return this.http.get<Materia[]>('/api/materias');
  }

  crearMateria(nombre: string) {
    return this.http.post('/api/materias', { nombre });
  }

  borrarMateria(id: number) {
    return this.http.delete(`/api/materias/${id}`);
  }

  grupos() {
    return this.http.get<Grupo[]>('/api/grupos');
  }

  crearGrupo(nombre: string) {
    return this.http.post('/api/grupos', { nombre });
  }

  asignarMaterias(grupoId: number, materiaIds: number[]) {
    return this.http.put(`/api/grupos/${grupoId}/materias`, { materiaIds });
  }

  borrarGrupo(id: number) {
    return this.http.delete(`/api/grupos/${id}`);
  }

  estudiantes(grupoId?: number) {
    const params = grupoId ? `?grupoId=${grupoId}` : '';
    return this.http.get<Estudiante[]>(`/api/estudiantes${params}`);
  }

  crearEstudiante(body: { nombre: string; documento: string; password: string; grupoId: number }) {
    return this.http.post('/api/estudiantes', body);
  }

  actualizarEstudiante(id: number, body: { nombre: string; grupoId: number; password?: string }) {
    return this.http.put(`/api/estudiantes/${id}`, body);
  }

  sesiones() {
    return this.http.get<SesionResumen[]>('/api/sesiones');
  }

  abrirSesion(materiaId: number, grupoId: number) {
    return this.http.post<SesionDetalle>('/api/sesiones', { materiaId, grupoId });
  }

  sesion(id: number) {
    return this.http.get<SesionDetalle>(`/api/sesiones/${id}`);
  }

  marcar(sesionId: number, token: string) {
    return this.http.post<Marca>(`/api/sesiones/${sesionId}/marcar`, { token });
  }

  perfil() {
    return this.http.get<{ nombre: string; rol: string; usuario?: string; documento?: string; grupo?: string | null }>('/api/cuenta');
  }

  qr() {
    return this.http.get('/api/cuenta/qr', { responseType: 'blob' });
  }

  cambiarClave(actual: string, nueva: string) {
    return this.http.post('/api/cuenta/clave', { actual, nueva });
  }
}
