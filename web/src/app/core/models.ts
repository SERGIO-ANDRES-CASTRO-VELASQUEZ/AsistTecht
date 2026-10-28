export type Rol = 'Admin' | 'Director' | 'Profesor' | 'Estudiante' | 'Acudiente';

export interface SesionUsuario {
  token: string;
  rol: Rol;
  nombre: string;
  usuario: string;
  debeCambiarPassword?: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  grupos: string[];
}

export interface Grupo {
  id: number;
  nombre: string;
  propio: boolean;
  estudiantes: number;
  materiaIds: number[];
  materias: string[];
}

export interface Estudiante {
  id: number;
  nombre: string;
  documento: string;
  grupoId: number | null;
  grupo: string | null;
  acudiente?: string | null;
  acudienteId?: number | null;
  acudienteDocumento?: string | null;
  activo?: boolean;
  motivoInactivacion?: string | null;
  debeCambiarPassword?: boolean;
  tieneFoto: boolean;
  tieneRostro: boolean;
  carnet: boolean;
}

export interface SolicitudClave {
  id: number;
  documento: string;
  nombre: string;
  rol: string;
  mensaje: string;
  estado: string;
  claveGenerada?: string;
  creadaEn: string;
  atendidaEn?: string;
}

export interface ResumenAdmin {
  profesores: { total: number; activos: number; inactivos: number };
  estudiantes: { total: number; activos: number; inactivos: number };
  acudientes: { total: number; activos: number; inactivos: number };
  solicitudesPendientes: number;
  totalGrupos: number;
  totalMaterias: number;
}

export interface EstudianteClase {
  id: number;
  nombre: string;
  estado: 'Anotado' | 'Pendiente';
  marcadaEn: string | null;
}

export interface SesionDetalle {
  id: number;
  fecha: string;
  materia: string;
  grupo: string;
  materiaId: number;
  grupoId: number;
  presentes: number;
  total: number;
  estudiantes: EstudianteClase[];
}

export interface SesionResumen {
  id: number;
  fecha: string;
  materia: string;
  grupo: string;
  presentes: number;
  total: number;
}

export type EstadoMarca = 'Anotado' | 'YaRegistrado' | 'NoPertenece' | 'NoEncontrado' | 'Consultando';

export interface Marca {
  estado: Exclude<EstadoMarca, 'Consultando'>;
  nombre: string | null;
  estudianteId?: number | null;
  seguro?: boolean;
}

export interface PlanillaAsistencia {
  estudiantes: Array<{ id: number; nombre: string; documento: string }>;
  fechas: Array<{ id: number; fecha: string; presentes: number[] }>;
}

export interface PlanillaNotas {
  estudiantes: Array<{ id: number; nombre: string; documento: string }>;
  columnas: Array<{ id: number; nombre: string; notas: Array<{ estudianteId: number; valor: number }> }>;
}

export interface MateriaAcademica {
  materia: string;
  ausencias: number;
  columnas: Array<{ nombre: string; valor: number | null }>;
  fechas: Array<{ fecha: string; presente: boolean }>;
}

// Modelos para Sistema de Gestión, IA y Nuevos Módulos
export interface DiagnosticoRiesgoIa {
  estudianteId: number;
  nombre: string;
  documento: string;
  grupo: string;
  nivel: 'Bajo' | 'Medio' | 'Alto' | 'Critico';
  scoreRiesgo: number;
  promedioNotas: number;
  porcentajeAsistencia: number;
  faltasAcumuladas: number;
  llamadosConvivencia: number;
  factores: string[];
  recomendacionPedagogica: string;
}

export interface HistoricoDia {
  fecha: string;
  diaNombre: string;
  presentes: number;
  esperados: number;
  porcentaje: number;
}

export interface DashboardDirector {
  kpis: {
    totalEstudiantes: number;
    totalProfesores: number;
    totalMaterias: number;
    totalGrupos: number;
    asistenciaHoy: number;
    presentesHoy: number;
    promedioGeneral: number;
    estudiantesEnRiesgo: number;
    totalConvivencia?: number;
  };
  historicoSemanal: HistoricoDia[];
  distribucionNotas: {
    aprobados: number;
    reprobados: number;
    total: number;
  };
  alertasIa: DiagnosticoRiesgoIa[];
  observacionesRecientes?: ObservacionConvivencia[];
}

export interface DashboardProfesor {
  kpis: {
    totalMaterias: number;
    totalGrupos: number;
    totalEstudiantes: number;
    asistenciaHoy: number;
    presentesHoy: number;
    estudiantesEnRiesgo: number;
    totalConvivencia?: number;
  };
  distribucionNotas: {
    aprobados: number;
    reprobados: number;
    total: number;
  };
  alertasIa: DiagnosticoRiesgoIa[];
  observacionesRecientes?: ObservacionConvivencia[];
}

export interface ObservacionConvivencia {
  id: number;
  estudianteId: number;
  estudianteNombre: string;
  estudianteDocumento: string;
  grupo: string;
  profesorNombre: string;
  tipo: 'Felicitacion' | 'Atencion' | 'FaltaLeve' | 'FaltaGrave';
  titulo: string;
  descripcion: string;
  compromiso?: string | null;
  fecha: string;
  notificadoAcudiente: boolean;
}

export interface DashboardAcudiente {
  acudiente: {
    nombre: string;
    documento: string;
    telefono: string;
    correo: string;
  };
  hijos: Array<{
    id: number;
    nombre: string;
    documento: string;
    grupo: string;
    asistenciaHoy: {
      clasesHoy: number;
      asistio: boolean;
      detalle: Array<{ materia: string; hora: string; origen: string }>;
    };
    estadisticas: {
      porcentajeAsistencia: number;
      fallasAcumuladas: number;
      promedioGeneral: number;
    };
    observaciones: Array<{
      id: number;
      tipo: string;
      titulo: string;
      descripcion: string;
      compromiso?: string;
      fecha: string;
    }>;
    diagnosticoIa: DiagnosticoRiesgoIa;
  }>;
}

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'Info' | 'Academica' | 'Asistencia' | 'AlertaIa' | 'Convivencia' | 'Sistema';
  link?: string | null;
  leida: boolean;
  fecha: string;
}

export interface RespuestaNotificaciones {
  total: number;
  noLeidas: number;
  notificaciones: Notificacion[];
}

export interface BoletinOficial {
  institucion: {
    nombre: string;
    resolucion: string;
    dane: string;
    nit: string;
    ciudad: string;
    sede?: string;
    periodo: string;
    fechaExpedicion: string;
    rector?: string;
    coordinador?: string;
  };
  estudiante: {
    id: number;
    nombre: string;
    documento: string;
    grupo: string;
    directorGrupo: string;
    acudiente: string;
    puesto: number | string;
    totalAlumnosGrupo: number;
    promedioGeneral: number;
    escalaGeneral?: string;
    totalFallas: number;
    estadoAcademico?: string;
  };
  materias: Array<{
    materiaId: number;
    nombre: string;
    nombreCorto?: string;
    area: string;
    ihs: number;
    profesor: string;
    notas: Array<{ columna: string; valor: number }>;
    definitiva: number;
    escala: 'SUPERIOR' | 'ALTO' | 'BÁSICO' | 'BAJO' | string;
    promedioGrupo?: number;
    fallas: number;
    juicioIa: string;
  }>;
  conceptoGeneralDirector?: string;
  observacionesConvivencia: Array<{
    tipo: string;
    titulo: string;
    descripcion: string;
    compromiso?: string;
    fecha: string;
  }>;
  escalaInstitucional?: Array<{
    nivel: string;
    rango: string;
    descripcion: string;
  }>;
}



export interface HorarioClaseItem {
  id: number;
  grupoId: number;
  grupoNombre: string;
  materiaId: number;
  materiaNombre: string;
  profesorId: number;
  profesorNombre: string;
  profesorCedula?: string;
  diaSemana: number;
  diaNombre: string;
  horaInicio: string;
  horaFin: string;
  aula?: string;
  notas?: string;
}

export interface CrearHorarioRequest {
  grupoId: number;
  materiaId: number;
  profesorId?: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  aula?: string;
  notas?: string;
}
