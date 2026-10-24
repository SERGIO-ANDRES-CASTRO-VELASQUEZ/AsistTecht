export type Rol = 'Director' | 'Profesor' | 'Estudiante';

export interface SesionUsuario {
  token: string;
  rol: Rol;
  nombre: string;
  usuario: string;
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
  tieneFoto: boolean;
  tieneRostro: boolean;
  carnet: boolean;
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
  estudiantes: Array<{ id: number; nombre: string }>;
  fechas: Array<{ id: number; fecha: string; presentes: number[] }>;
}

export interface PlanillaNotas {
  estudiantes: Array<{ id: number; nombre: string }>;
  columnas: Array<{ id: number; nombre: string; notas: Array<{ estudianteId: number; valor: number }> }>;
}

export interface MateriaAcademica {
  materia: string;
  ausencias: number;
  columnas: Array<{ nombre: string; valor: number | null }>;
  fechas: Array<{ fecha: string; presente: boolean }>;
}
