export interface SesionUsuario {
  token: string;
  rol: 'Profesor' | 'Estudiante';
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
}
