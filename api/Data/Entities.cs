namespace AsisQR.Api.Data;

public class Administrador
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "Administrador del Sistema";
    public string Usuario { get; set; } = "admin";
    public string PasswordHash { get; set; } = "";
}

public class Profesor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public bool Activo { get; set; } = true;
    public List<Materia> Materias { get; set; } = [];
    public List<Grupo> Grupos { get; set; } = [];
}

public class Director
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string PasswordHash { get; set; } = "";
}

public class Estudiante
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Documento { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string QrToken { get; set; } = "";
    public bool DebeCambiarPassword { get; set; } = false;
    public bool Activo { get; set; } = true;
    public string? MotivoInactivacion { get; set; }
    public byte[]? Foto { get; set; }
    public string? FotoTipo { get; set; }
    public int? GrupoId { get; set; }
    public Grupo? Grupo { get; set; }
    public int ProfesorId { get; set; }
    public Profesor? Profesor { get; set; }
    public int? AcudienteId { get; set; }
    public Acudiente? Acudiente { get; set; }
    public List<Rostro> Rostros { get; set; } = [];
    public List<ObservacionConvivencia> Observaciones { get; set; } = [];
}

public class Rostro
{
    public int Id { get; set; }
    public int EstudianteId { get; set; }
    public Estudiante? Estudiante { get; set; }
    public string Pose { get; set; } = "";
    public string Vector { get; set; } = "";
}

public class NotaColumna
{
    public int Id { get; set; }
    public int MateriaId { get; set; }
    public Materia? Materia { get; set; }
    public int GrupoId { get; set; }
    public Grupo? Grupo { get; set; }
    public string Nombre { get; set; } = "";
    public int Orden { get; set; }
    public List<Nota> Notas { get; set; } = [];
}

public class Nota
{
    public int Id { get; set; }
    public int ColumnaId { get; set; }
    public NotaColumna? Columna { get; set; }
    public int EstudianteId { get; set; }
    public Estudiante? Estudiante { get; set; }
    public decimal Valor { get; set; }
}

public class Materia
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int ProfesorId { get; set; }
    public Profesor? Profesor { get; set; }
    public List<MateriaGrupo> Grupos { get; set; } = [];
}

public class Grupo
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int ProfesorId { get; set; }
    public Profesor? Profesor { get; set; }
    public List<MateriaGrupo> Materias { get; set; } = [];
    public List<Estudiante> Estudiantes { get; set; } = [];
}

public class MateriaGrupo
{
    public int MateriaId { get; set; }
    public Materia? Materia { get; set; }
    public int GrupoId { get; set; }
    public Grupo? Grupo { get; set; }
}

public class Sesion
{
    public int Id { get; set; }
    public int MateriaId { get; set; }
    public Materia? Materia { get; set; }
    public int GrupoId { get; set; }
    public Grupo? Grupo { get; set; }
    public int ProfesorId { get; set; }
    public DateOnly Fecha { get; set; }
    public DateTime CreadaEn { get; set; }
    public List<Asistencia> Asistencias { get; set; } = [];
}

public class Asistencia
{
    public int Id { get; set; }
    public int SesionId { get; set; }
    public Sesion? Sesion { get; set; }
    public int EstudianteId { get; set; }
    public Estudiante? Estudiante { get; set; }
    public DateTime MarcadaEn { get; set; }
    public string Origen { get; set; } = "Qr";
}

public enum EstadoMarca
{
    Anotado,
    YaRegistrado,
    NoPertenece,
    NoEncontrado
}

public class Acudiente
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Documento { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Correo { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public bool Activo { get; set; } = true;
    public List<Estudiante> Estudiantes { get; set; } = [];
}

public class ObservacionConvivencia
{
    public int Id { get; set; }
    public int EstudianteId { get; set; }
    public Estudiante? Estudiante { get; set; }
    public int ProfesorId { get; set; }
    public Profesor? Profesor { get; set; }
    public string Tipo { get; set; } = "Atencion"; // "Felicitacion", "Atencion", "FaltaLeve", "FaltaGrave"
    public string Titulo { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string? Compromiso { get; set; }
    public DateOnly Fecha { get; set; }
    public bool NotificadoAcudiente { get; set; } = false;
}

public class Notificacion
{
    public int Id { get; set; }
    public string RolDestinatario { get; set; } = "Todos"; // "Estudiante", "Profesor", "Acudiente", "Director", "Admin", "Todos"
    public int? UsuarioDestinatarioId { get; set; }
    public string Titulo { get; set; } = "";
    public string Mensaje { get; set; } = "";
    public string Tipo { get; set; } = "Info"; // "Academica", "Asistencia", "Convivencia", "AlertaIa"
    public string? Link { get; set; }
    public bool Leida { get; set; } = false;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}

public class SolicitudClave
{
    public int Id { get; set; }
    public string Documento { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Rol { get; set; } = "Estudiante"; // "Estudiante", "Profesor", "Acudiente"
    public string Mensaje { get; set; } = "";
    public string Estado { get; set; } = "Pendiente"; // "Pendiente", "Atendida"
    public string? ClaveGenerada { get; set; }
    public DateTime CreadaEn { get; set; } = DateTime.UtcNow;
    public DateTime? AtendidaEn { get; set; }
}



