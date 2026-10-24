namespace AsisQR.Api.Data;

public class Profesor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public List<Materia> Materias { get; set; } = [];
    public List<Grupo> Grupos { get; set; } = [];
}

public class Estudiante
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Documento { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string QrToken { get; set; } = "";
    public int? GrupoId { get; set; }
    public Grupo? Grupo { get; set; }
    public int ProfesorId { get; set; }
    public Profesor? Profesor { get; set; }
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
}

public enum EstadoMarca
{
    Anotado,
    YaRegistrado,
    NoPertenece,
    NoEncontrado
}
