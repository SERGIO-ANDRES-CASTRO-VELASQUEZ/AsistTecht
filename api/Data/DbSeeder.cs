namespace AsisQR.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDb db)
    {
        if (!db.Directores.Any())
        {
            db.Directores.Add(new Director
            {
                Nombre = "Dirección",
                Usuario = "director",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("AsisTecht2026")
            });
            db.SaveChanges();
        }

        if (db.Profesores.Any())
            return;

        var profesor = new Profesor
        {
            Nombre = "Docente de prueba",
            Usuario = "profesor",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("AsisQR2026")
        };
        db.Profesores.Add(profesor);
        db.SaveChanges();

        var grupo = new Grupo { Nombre = "10A", ProfesorId = profesor.Id };
        var materia = new Materia { Nombre = "Matemáticas", ProfesorId = profesor.Id };
        db.Grupos.Add(grupo);
        db.Materias.Add(materia);
        db.SaveChanges();

        db.MateriaGrupos.Add(new MateriaGrupo { MateriaId = materia.Id, GrupoId = grupo.Id });

        db.Estudiantes.AddRange(
            Nuevo(profesor.Id, grupo.Id, "Laura Mendoza", "1000000001", "Estudiante2026"),
            Nuevo(profesor.Id, grupo.Id, "Camilo Rojas", "1000000002", "Estudiante2026"));
        db.SaveChanges();
    }

    public static Estudiante Nuevo(int profesorId, int? grupoId, string nombre, string documento, string password)
    {
        return new Estudiante
        {
            ProfesorId = profesorId,
            GrupoId = grupoId,
            Nombre = nombre.Trim(),
            Documento = documento.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            QrToken = "aqr_" + Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLowerInvariant()
        };
    }
}

public static class Reloj
{
    public static DateOnly Hoy()
    {
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Bogota");
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz));
    }
}
