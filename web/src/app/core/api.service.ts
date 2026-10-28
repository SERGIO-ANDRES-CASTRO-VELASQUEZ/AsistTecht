import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Estudiante, Grupo, Marca, Materia, MateriaAcademica, PlanillaAsistencia, PlanillaNotas, SesionDetalle, SesionResumen, HorarioClaseItem, CrearHorarioRequest } from './models';

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
      tieneFoto?: boolean;
      tieneRostro?: boolean;
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
    return this.http.post<{ mensaje: string; debeCambiarPassword?: boolean }>('/api/cuenta/clave', { actual, nueva });
  }

  resetClaveDinamica(estudianteId: number) {
    return this.http.post<{ mensaje: string; claveTemporal: string; estudianteId: number; estudianteNombre: string }>(`/api/estudiantes/${estudianteId}/clave-dinamica`, {});
  }

  // Módulos ERP, Dashboards, IA, Boletín y Convivencia
  dashboardDirector() {
    return this.http.get<import('./models').DashboardDirector>('/api/dashboard/director');
  }

  dashboardProfesor() {
    return this.http.get<import('./models').DashboardProfesor>('/api/dashboard/profesor');
  }

  dashboardAcudiente() {
    return this.http.get<import('./models').DashboardAcudiente>('/api/dashboard/acudiente');
  }

  convivencia(estudianteId?: number, grupoId?: number) {
    let params = '';
    if (estudianteId) params += `?estudianteId=${estudianteId}`;
    if (grupoId) params += `${params ? '&' : '?'}grupoId=${grupoId}`;
    return this.http.get<import('./models').ObservacionConvivencia[]>(`/api/convivencia${params}`);
  }

  crearConvivencia(body: { estudianteId: number; tipo: string; titulo: string; descripcion: string; compromiso?: string; fecha?: string }) {
    return this.http.post<{ mensaje: string; id: number }>('/api/convivencia', body);
  }

  boletin(estudianteId: number) {
    return this.http.get<import('./models').BoletinOficial>(`/api/boletin/${estudianteId}`);
  }

  miBoletin(estudianteId?: number) {
    const params = estudianteId ? `?estudianteId=${estudianteId}` : '';
    return this.http.get<import('./models').BoletinOficial>(`/api/boletin/mi-boletin${params}`);
  }

  boletinCurso(grupoId: number) {
    return this.http.get<{
      grupoId: number;
      grupoNombre: string;
      directorGrupo: string;
      totalEstudiantes: number;
      boletines: import('./models').BoletinOficial[];
    }>(`/api/boletin/curso/${grupoId}`);
  }

  boletinEstudiantes(grupoId?: number) {
    const params = grupoId ? `?grupoId=${grupoId}` : '';
    return this.http.get<Array<{
      id: number;
      nombre: string;
      documento: string;
      grupoId: number;
      grupo: string;
      acudiente: string;
      activo: boolean;
    }>>(`/api/boletin/estudiantes${params}`);
  }

  notificaciones() {
    return this.http.get<import('./models').RespuestaNotificaciones>('/api/notificaciones');
  }

  marcarNotificacionLeida(id: number) {
    return this.http.post<{ exito: boolean }>(`/api/notificaciones/marcar-leida/${id}`, {});
  }

  marcarTodasNotificacionesLeidas() {
    return this.http.post<{ exito: boolean; actualizadas: number }>('/api/notificaciones/marcar-todas', {});
  }

  acudientes() {
    return this.http.get<Array<{ id: number; nombre: string; documento: string; telefono: string; correo: string; estudiantes: any[] }>>('/api/acudientes');
  }

  crearAcudiente(body: { nombre: string; documento: string; telefono?: string; correo?: string; password?: string; estudianteId?: number }) {
    return this.http.post('/api/acudientes', body);
  }

  // =========================================================================
  // SOLICITUD DE CLAVE PÚBLICA Y GESTIÓN ADMINISTRATIVA
  // =========================================================================
  solicitarClave(documento: string, rol: string, mensaje?: string) {
    return this.http.post<{ mensaje: string; nombre: string }>('/api/auth/solicitar-clave', { documento, rol, mensaje });
  }

  adminResumen() {
    return this.http.get<import('./models').ResumenAdmin>('/api/admin/resumen');
  }

  adminSolicitudesClave() {
    return this.http.get<import('./models').SolicitudClave[]>('/api/admin/solicitudes-clave');
  }

  adminAtenderSolicitud(id: number) {
    return this.http.post<{ mensaje: string; claveGenerada: string; documento: string; nombre: string }>(`/api/admin/solicitudes-clave/${id}/atender`, {});
  }

  adminProfesores() {
    return this.http.get<Array<{ id: number; nombre: string; usuario: string; activo: boolean; materiasCount: number; gruposCount: number }>>('/api/admin/profesores');
  }

  adminCrearProfesor(body: { nombre: string; usuario?: string; documento?: string; password?: string }) {
    return this.http.post<{ id: number; nombre: string; usuario: string; claveAsignada: string; activo: boolean }>('/api/admin/profesores', body);
  }

  adminActualizarProfesor(id: number, body: { nombre: string; usuario?: string; documento?: string; password?: string }) {
    return this.http.put<{ mensaje: string; id: number; nombre: string; usuario: string }>(`/api/admin/profesores/${id}`, body);
  }

  adminEliminarProfesor(id: number) {
    return this.http.delete<{ mensaje: string }>(`/api/admin/profesores/${id}`);
  }

  adminCambiarEstadoProfesor(id: number) {
    return this.http.put<{ mensaje: string; activo: boolean }>(`/api/admin/profesores/${id}/estado`, {});
  }

  adminResetClaveProfesor(id: number) {
    return this.http.post<{ mensaje: string; claveGenerada: string; nombre: string }>(`/api/admin/profesores/${id}/clave-dinamica`, {});
  }

  adminEstudiantes(grupoId?: number) {
    const p = grupoId ? `?grupoId=${grupoId}` : '';
    return this.http.get<import('./models').Estudiante[]>(`/api/admin/estudiantes${p}`);
  }

  adminCrearEstudiante(body: { nombre: string; documento: string; grupoId: number; acudienteId?: number; password?: string }) {
    return this.http.post<import('./models').Estudiante & { claveTemporal: string }>('/api/admin/estudiantes', body);
  }

  adminActualizarEstudiante(id: number, body: { nombre: string; documento?: string; grupoId?: number; acudienteId?: number; password?: string }) {
    return this.http.put<{ mensaje: string }>(`/api/admin/estudiantes/${id}`, body);
  }

  adminEliminarEstudiante(id: number) {
    return this.http.delete<{ mensaje: string }>(`/api/admin/estudiantes/${id}`);
  }

  adminGrupos() {
    return this.http.get<import('./models').Grupo[]>('/api/admin/grupos');
  }

  adminCrearGrupo(nombre: string) {
    return this.http.post<{ id: number; nombre: string }>('/api/admin/grupos', { nombre });
  }

  adminCambiarEstadoEstudiante(id: number, motivo?: string, activo?: boolean) {
    return this.http.put<{ mensaje: string; activo: boolean; motivoInactivacion?: string }>(`/api/admin/estudiantes/${id}/estado`, { motivo, activo });
  }

  adminResetClaveEstudiante(id: number) {
    return this.http.post<{ mensaje: string; claveGenerada: string; nombre: string }>(`/api/admin/estudiantes/${id}/clave-dinamica`, {});
  }

  adminAcudientes() {
    return this.http.get<Array<{ id: number; nombre: string; documento: string; telefono: string; correo: string; activo: boolean; estudiantes: any[] }>>('/api/admin/acudientes');
  }

  adminCrearAcudiente(body: { nombre: string; documento: string; telefono?: string; correo?: string; password?: string; estudianteIds?: number[] }) {
    return this.http.post<{ id: number; nombre: string; documento: string; claveAsignada: string; activo: boolean; hijosVinculados: number }>('/api/admin/acudientes', body);
  }

  adminActualizarAcudiente(id: number, body: { nombre: string; documento?: string; telefono?: string; correo?: string; password?: string; estudianteIds?: number[] }) {
    return this.http.put<{ mensaje: string }>(`/api/admin/acudientes/${id}`, body);
  }

  adminEliminarAcudiente(id: number) {
    return this.http.delete<{ mensaje: string }>(`/api/admin/acudientes/${id}`);
  }

  adminCambiarEstadoAcudiente(id: number) {
    return this.http.put<{ mensaje: string; activo: boolean }>(`/api/admin/acudientes/${id}/estado`, {});
  }

  adminResetClaveAcudiente(id: number) {
    return this.http.post<{ mensaje: string; claveGenerada: string; nombre: string }>(`/api/admin/acudientes/${id}/clave-dinamica`, {});
  }

  adminVincularHijo(acudienteId: number, estudianteId: number) {
    return this.http.post<{ mensaje: string }>(`/api/admin/acudientes/${acudienteId}/vincular`, { estudianteId });
  }

  // =========================================================================
  // GESTIÓN DIRECTIVA (DIRECCIÓN INSTITUCIONAL)
  // =========================================================================
  directorDocentes() {
    return this.http.get<Array<{
      id: number;
      nombre: string;
      usuario: string;
      cedula: string;
      activo: boolean;
      materias: Array<{ id: number; nombre: string; grupos: string[] }>;
      grupos: Array<{ id: number; nombre: string }>;
      totalMaterias: number;
      totalGrupos: number;
    }>>('/api/director/docentes');
  }

  directorAsignaturas() {
    return this.http.get<Array<{
      id: number;
      nombre: string;
      profesorId: number;
      profesorNombre: string;
      profesorCedula: string;
      grupos: Array<{ grupoId: number; grupoNombre: string }>;
    }>>('/api/director/asignaturas');
  }

  crearYAmarrarAsignatura(body: { nombre: string; profesorId: number; grupoId: number }) {
    return this.http.post<{
      mensaje: string;
      materiaId: number;
      materiaNombre: string;
      profesorId: number;
      profesorNombre: string;
      grupoId: number;
      grupoNombre: string;
    }>('/api/director/asignaturas', body);
  }

  matricularEstudianteDirector(body: { nombre: string; documento: string; grupoId: number; password?: string }) {
    return this.http.post<{
      mensaje: string;
      id: number;
      nombre: string;
      documento: string;
      grupo: string;
      claveAsignada: string;
    }>('/api/director/estudiantes', body);
  }

  catalogoAcademicoDirector() {
    return this.http.get<{
      grupos: Array<{ id: number; nombre: string; estudiantesCount: number }>;
      docentes: Array<{ id: number; nombre: string; usuario: string }>;
      materiasSugeridas: string[];
    }>('/api/director/catalogo-academico');
  }

  // =========================================================================
  // HORARIOS DE CLASES (UNIVERSAL & DIRECCIÓN)
  // =========================================================================
  obtenerMiHorario() {
    return this.http.get<{
      rol: string;
      usuarioNombre: string;
      grupoId?: number | null;
      grupoNombre?: string;
      totalClases?: number;
      estudiantes?: Array<{ id: number; nombre: string; grupoId?: number; grupoNombre?: string }>;
      clases: HorarioClaseItem[];
    }>('/api/horarios/mi-horario');
  }

  obtenerHorarioCurso(grupoId: number) {
    return this.http.get<{
      grupoId: number;
      grupoNombre: string;
      totalClases: number;
      clases: HorarioClaseItem[];
    }>(`/api/horarios/curso/${grupoId}`);
  }

  listarCursosHorario() {
    return this.http.get<Array<{ id: number; nombre: string; totalClases: number }>>('/api/horarios/cursos');
  }

  directorListarHorarios(grupoId?: number, profesorId?: number, diaSemana?: number) {
    const params: string[] = [];
    if (grupoId) params.push(`grupoId=${grupoId}`);
    if (profesorId) params.push(`profesorId=${profesorId}`);
    if (diaSemana) params.push(`diaSemana=${diaSemana}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<HorarioClaseItem[]>(`/api/director/horarios${qs}`);
  }

  directorMateriasPorCurso(grupoId: number) {
    return this.http.get<{
      grupoId: number;
      grupoNombre: string;
      materias: Array<{
        materiaId: number;
        materiaNombre: string;
        profesorId: number;
        profesorNombre: string;
        profesorCedula: string;
      }>;
    }>(`/api/director/horarios/materias-por-curso/${grupoId}`);
  }

  directorCrearHorario(body: CrearHorarioRequest) {
    return this.http.post<{ mensaje: string } & HorarioClaseItem>('/api/director/horarios', body);
  }

  directorActualizarHorario(id: number, body: CrearHorarioRequest) {
    return this.http.put<{ mensaje: string; id: number }>(`/api/director/horarios/${id}`, body);
  }

  directorEliminarHorario(id: number) {
    return this.http.delete<{ mensaje: string }>(`/api/director/horarios/${id}`);
  }
}
