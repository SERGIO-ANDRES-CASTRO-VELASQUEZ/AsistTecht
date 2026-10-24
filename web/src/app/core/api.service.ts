import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Estudiante, Grupo, Marca, Materia, MateriaAcademica, PlanillaAsistencia, PlanillaNotas, SesionDetalle, SesionResumen } from './models';

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
    return this.http.get<{
      nombre: string;
      rol: string;
      usuario?: string;
      documento?: string;
      grupo?: string | null;
      carnet?: boolean;
    }>('/api/cuenta');
  }

  academico() {
    return this.http.get<{ materias: MateriaAcademica[] }>('/api/cuenta/academico');
  }

  guardarFotoPropia(imagen: string) {
    return this.http.put('/api/cuenta/foto', { imagen });
  }

  guardarRostroPropio(muestras: Array<{ pose: string; vector: number[] }>) {
    return this.http.put('/api/cuenta/rostro', { muestras });
  }

  carnetPropio() {
    return this.http.get('/api/cuenta/carnet', { responseType: 'blob' });
  }

  guardarFoto(estudianteId: number, imagen: string) {
    return this.http.put(`/api/estudiantes/${estudianteId}/foto`, { imagen });
  }

  guardarRostro(estudianteId: number, muestras: Array<{ pose: string; vector: number[] }>) {
    return this.http.put(`/api/estudiantes/${estudianteId}/rostro`, { muestras });
  }

  carnetEstudiante(estudianteId: number) {
    return this.http.get(`/api/estudiantes/${estudianteId}/carnet`, { responseType: 'blob' });
  }

  planillaAsistencia(materiaId: number, grupoId: number) {
    return this.http.get<PlanillaAsistencia>(`/api/planilla/asistencia?materiaId=${materiaId}&grupoId=${grupoId}`);
  }

  celdaAsistencia(body: { materiaId: number; grupoId: number; fecha: string; estudianteId: number; presente: boolean }) {
    return this.http.put('/api/planilla/asistencia', body);
  }

  planillaNotas(materiaId: number, grupoId: number) {
    return this.http.get<PlanillaNotas>(`/api/planilla/notas?materiaId=${materiaId}&grupoId=${grupoId}`);
  }

  crearColumna(materiaId: number, grupoId: number, nombre: string) {
    return this.http.post('/api/planilla/notas/columnas', { materiaId, grupoId, nombre });
  }

  guardarNota(columnaId: number, estudianteId: number, valor: number | null) {
    return this.http.put('/api/planilla/notas', { columnaId, estudianteId, valor });
  }

  profesores() {
    return this.http.get<Array<{ id: number; nombre: string; usuario: string }>>('/api/profesores');
  }

  crearProfesor(body: { nombre: string; usuario: string; password: string }) {
    return this.http.post('/api/profesores', body);
  }

  reconocer(sesionId: number, vector: number[], confirmar: boolean, ancho: number) {
    return this.http.post<Marca>(`/api/sesiones/${sesionId}/reconocer`, { vector, confirmar, ancho });
  }

  qr() {
    return this.http.get('/api/cuenta/qr', { responseType: 'blob' });
  }

  cambiarClave(actual: string, nueva: string) {
    return this.http.post('/api/cuenta/clave', { actual, nueva });
  }
}
