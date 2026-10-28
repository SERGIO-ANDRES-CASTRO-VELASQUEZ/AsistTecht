using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace AsisQR.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDb db)
    {
        if (!db.Administradores.Any())
        {
            db.Administradores.Add(new Administrador
            {
                Nombre = "Administrador del Sistema",
                Usuario = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin2026*")
            });
            db.SaveChanges();
        }

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

        if (!db.Acudientes.Any())
        {
            var acudiente = new Acudiente
            {
                Nombre = "Elena Gómez (Acudiente)",
                Documento = "acudiente",
                Telefono = "3101234567",
                Correo = "elena.gomez@correo.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Acudiente2026")
            };
            db.Acudientes.Add(acudiente);
            db.SaveChanges();

            var primerEst = db.Estudiantes.FirstOrDefault();
            if (primerEst is not null)
            {
                primerEst.AcudienteId = acudiente.Id;
                db.SaveChanges();
            }
        }

        if (db.Profesores.Any())
        {
            CompletarDatosPrueba(db);
            return;
        }

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

        var e1 = Nuevo(profesor.Id, grupo.Id, "Laura Mendoza", "1000000001", "Estudiante2026");
        var e2 = Nuevo(profesor.Id, grupo.Id, "Camilo Rojas", "1000000002", "Estudiante2026");
        db.Estudiantes.AddRange(e1, e2);
        db.SaveChanges();

        var acud = db.Acudientes.FirstOrDefault();
        if (acud is not null)
        {
            e1.AcudienteId = acud.Id;
            db.SaveChanges();
        }

        CompletarDatosPrueba(db);
    }

    private static void CompletarDatosPrueba(AppDb db)
    {
        var e1 = db.Estudiantes.FirstOrDefault(e => e.Documento == "1000000001");
        var e2 = db.Estudiantes.FirstOrDefault(e => e.Documento == "1000000002");
        var profesor = db.Profesores.FirstOrDefault();
        var materia = db.Materias.FirstOrDefault();
        var grupo = db.Grupos.FirstOrDefault();

        if (e1 is null || e2 is null || profesor is null || materia is null || grupo is null)
            return;

        // Asegurar foto y rostros biométricos de prueba para Laura Mendoza (e1)
        if (e1.Foto is null || e1.Foto.Length == 0)
        {
            using var fotoImg = new SixLabors.ImageSharp.Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(250, 320);
            fotoImg.Mutate(ctx =>
            {
                ctx.Fill(SixLabors.ImageSharp.Color.ParseHex("1A382E"));
            });
            using var ms = new MemoryStream();
            fotoImg.SaveAsPng(ms);
            e1.Foto = ms.ToArray();
            e1.FotoTipo = "image/png";
            db.SaveChanges();
        }

        if (!db.Rostros.Any(r => r.EstudianteId == e1.Id))
        {
            foreach (var pose in RostroUtil.Poses)
            {
                var vec = new float[128];
                var rnd = new Random(101 + pose.Length);
                for (int v = 0; v < 128; v++) vec[v] = (float)(rnd.NextDouble() * 2 - 1);
                float norma = (float)Math.Sqrt(vec.Sum(x => x * x));
                for (int v = 0; v < 128; v++) vec[v] /= (norma > 0 ? norma : 1);
                db.Rostros.Add(new Rostro
                {
                    EstudianteId = e1.Id,
                    Pose = pose,
                    Vector = RostroUtil.Guardar(vec)
                });
            }
            db.SaveChanges();
        }

        // Seeder de columnas de notas si no existen
        if (!db.NotaColumnas.Any(c => c.MateriaId == materia.Id && c.GrupoId == grupo.Id))
        {
            var col1 = new NotaColumna { MateriaId = materia.Id, GrupoId = grupo.Id, Nombre = "Taller Álgebra", Orden = 1 };
            var col2 = new NotaColumna { MateriaId = materia.Id, GrupoId = grupo.Id, Nombre = "Evaluación Parcial", Orden = 2 };
            db.NotaColumnas.AddRange(col1, col2);
            db.SaveChanges();

            db.Notas.AddRange(
                new Nota { ColumnaId = col1.Id, EstudianteId = e1.Id, Valor = 4.5m },
                new Nota { ColumnaId = col2.Id, EstudianteId = e1.Id, Valor = 4.2m },
                new Nota { ColumnaId = col1.Id, EstudianteId = e2.Id, Valor = 2.8m },
                new Nota { ColumnaId = col2.Id, EstudianteId = e2.Id, Valor = 2.5m }
            );
            db.SaveChanges();
        }

        // Seeder de convivencia si no existen
        if (!db.ObservacionesConvivencia.Any())
        {
            var hoy = Reloj.Hoy();
            db.ObservacionesConvivencia.AddRange(
                new ObservacionConvivencia
                {
                    EstudianteId = e1.Id,
                    ProfesorId = profesor.Id,
                    Tipo = "Felicitacion",
                    Titulo = "Destacada participación en clase",
                    Descripcion = "Demuestra constante compromiso, liderazgo y excelente comprensión de los temas vistos.",
                    Compromiso = "Continuar motivando a sus compañeros de grupo.",
                    Fecha = hoy.AddDays(-2),
                    NotificadoAcudiente = true
                },
                new ObservacionConvivencia
                {
                    EstudianteId = e2.Id,
                    ProfesorId = profesor.Id,
                    Tipo = "Atencion",
                    Titulo = "Llegada tarde y distracción en clase",
                    Descripcion = "Se presentó con 20 minutos de retraso e interrumpió el desarrollo de la explicación matemática.",
                    Compromiso = "Llegar puntual a la primera hora y entregar actividad de nivelación.",
                    Fecha = hoy.AddDays(-1),
                    NotificadoAcudiente = true
                }
            );
            db.SaveChanges();
        }

        // Seeder de sesiones históricas de asistencia para gráficos
        if (!db.Sesiones.Any(s => s.MateriaId == materia.Id && s.GrupoId == grupo.Id))
        {
            var hoy = Reloj.Hoy();
            for (int i = 5; i >= 1; i--)
            {
                var fechaSesion = hoy.AddDays(-i);
                var sesion = new Sesion
                {
                    MateriaId = materia.Id,
                    GrupoId = grupo.Id,
                    ProfesorId = profesor.Id,
                    Fecha = fechaSesion,
                    CreadaEn = DateTime.UtcNow.AddDays(-i)
                };
                db.Sesiones.Add(sesion);
                db.SaveChanges();

                // e1 asiste siempre, e2 falta a veces para probar alertas de IA
                db.Asistencias.Add(new Asistencia
                {
                    SesionId = sesion.Id,
                    EstudianteId = e1.Id,
                    MarcadaEn = DateTime.UtcNow.AddDays(-i),
                    Origen = "Qr"
                });

                if (i % 2 == 1) // e2 solo vino en días impares
                {
                    db.Asistencias.Add(new Asistencia
                    {
                        SesionId = sesion.Id,
                        EstudianteId = e2.Id,
                        MarcadaEn = DateTime.UtcNow.AddDays(-i),
                        Origen = "Rostro"
                    });
                }
                db.SaveChanges();
            }
        }

        // =========================================================================
        // EXPANDIR DATOS INSTITUCIONALES (PROFESORES, GRUPOS, MATERIAS Y ESTUDIANTES)
        // =========================================================================
        // Profesores adicionales
        var profCarlos = db.Profesores.FirstOrDefault(p => p.Usuario == "carlos.restrepo");
        if (profCarlos is null)
        {
            profCarlos = new Profesor
            {
                Nombre = "Lic. Carlos Restrepo",
                Usuario = "carlos.restrepo",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Profesor2026*")
            };
            db.Profesores.Add(profCarlos);
            db.SaveChanges();
        }

        var profMartha = db.Profesores.FirstOrDefault(p => p.Usuario == "martha.gomez");
        if (profMartha is null)
        {
            profMartha = new Profesor
            {
                Nombre = "Lic. Martha Gómez",
                Usuario = "martha.gomez",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Profesor2026*")
            };
            db.Profesores.Add(profMartha);
            db.SaveChanges();
        }

        var profClaudia = db.Profesores.FirstOrDefault(p => p.Usuario == "claudia.torres");
        if (profClaudia is null)
        {
            profClaudia = new Profesor
            {
                Nombre = "Lic. Claudia Torres",
                Usuario = "claudia.torres",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Profesor2026*")
            };
            db.Profesores.Add(profClaudia);
            db.SaveChanges();
        }

        // Grupos adicionales
        var g10B = db.Grupos.FirstOrDefault(g => g.Nombre == "10B");
        if (g10B is null)
        {
            g10B = new Grupo { Nombre = "10B", ProfesorId = profCarlos.Id };
            db.Grupos.Add(g10B);
            db.SaveChanges();
        }

        var g9A = db.Grupos.FirstOrDefault(g => g.Nombre == "9A");
        if (g9A is null)
        {
            g9A = new Grupo { Nombre = "9A", ProfesorId = profMartha.Id };
            db.Grupos.Add(g9A);
            db.SaveChanges();
        }

        var g11A = db.Grupos.FirstOrDefault(g => g.Nombre == "11A");
        if (g11A is null)
        {
            g11A = new Grupo { Nombre = "11A", ProfesorId = profClaudia.Id };
            db.Grupos.Add(g11A);
            db.SaveChanges();
        }

        // Materias adicionales
        var matFisica = db.Materias.FirstOrDefault(m => m.Nombre == "Física");
        if (matFisica is null)
        {
            matFisica = new Materia { Nombre = "Física", ProfesorId = profCarlos.Id };
            db.Materias.Add(matFisica);
            db.SaveChanges();
        }

        var matCastellano = db.Materias.FirstOrDefault(m => m.Nombre == "Lengua Castellana");
        if (matCastellano is null)
        {
            matCastellano = new Materia { Nombre = "Lengua Castellana", ProfesorId = profMartha.Id };
            db.Materias.Add(matCastellano);
            db.SaveChanges();
        }

        var matQuimica = db.Materias.FirstOrDefault(m => m.Nombre == "Química y Biología");
        if (matQuimica is null)
        {
            matQuimica = new Materia { Nombre = "Química y Biología", ProfesorId = profClaudia.Id };
            db.Materias.Add(matQuimica);
            db.SaveChanges();
        }

        var matTecno = db.Materias.FirstOrDefault(m => m.Nombre == "Tecnología e Informática");
        if (matTecno is null)
        {
            matTecno = new Materia { Nombre = "Tecnología e Informática", ProfesorId = profesor.Id };
            db.Materias.Add(matTecno);
            db.SaveChanges();
        }

        var matIngles = db.Materias.FirstOrDefault(m => m.Nombre == "Inglés Académico");
        if (matIngles is null)
        {
            matIngles = new Materia { Nombre = "Inglés Académico", ProfesorId = profMartha.Id };
            db.Materias.Add(matIngles);
            db.SaveChanges();
        }

        // Vincular materias a los grupos si no existen
        var todosLosGrupos = new[] { grupo, g10B, g9A, g11A };
        var todasLasMaterias = new[] { materia, matFisica, matCastellano, matQuimica, matTecno, matIngles };
        foreach (var grp in todosLosGrupos)
        {
            foreach (var mat in todasLasMaterias)
            {
                if (!db.MateriaGrupos.Any(mg => mg.GrupoId == grp.Id && mg.MateriaId == mat.Id))
                {
                    db.MateriaGrupos.Add(new MateriaGrupo { GrupoId = grp.Id, MateriaId = mat.Id });
                }
            }
        }
        db.SaveChanges();

        // Estudiantes adicionales por grupo
        var estudiantesSeed = new[]
        {
            // 10A
            (grupo.Id, "Valentina Ospina", "1000000003"),
            (grupo.Id, "Andrés Felipe Caicedo", "1000000004"),
            (grupo.Id, "Sofía Rentería", "1000000005"),
            // 10B
            (g10B.Id, "Juan David Morales", "1000000006"),
            (g10B.Id, "Mariana Duque", "1000000007"),
            (g10B.Id, "Mateo Quintero", "1000000008"),
            // 9A
            (g9A.Id, "Isabella Vargas", "1000000009"),
            (g9A.Id, "Samuel Echeverri", "1000000010"),
            (g9A.Id, "Daniel Cardona", "1000000011"),
            // 11A
            (g11A.Id, "Gabriela Henao", "1000000012"),
            (g11A.Id, "Santiago Bermúdez", "1000000013"),
            (g11A.Id, "Manuela Zapata", "1000000014")
        };

        foreach (var (gId, nom, doc) in estudiantesSeed)
        {
            if (!db.Estudiantes.Any(e => e.Documento == doc))
            {
                var est = Nuevo(profesor.Id, gId, nom, doc, "Estudiante2026*");
                db.Estudiantes.Add(est);
            }
        }
        db.SaveChanges();

        // Agregar notas de ejemplo para todas las materias del grupo 10A
        foreach (var mat in todasLasMaterias)
        {
            if (!db.NotaColumnas.Any(c => c.MateriaId == mat.Id && c.GrupoId == grupo.Id))
            {
                var col1 = new NotaColumna { MateriaId = mat.Id, GrupoId = grupo.Id, Nombre = "Actividad 1", Orden = 1 };
                var col2 = new NotaColumna { MateriaId = mat.Id, GrupoId = grupo.Id, Nombre = "Evaluación Parcial", Orden = 2 };
                db.NotaColumnas.AddRange(col1, col2);
                db.SaveChanges();

                var estudiantes10A = db.Estudiantes.Where(e => e.GrupoId == grupo.Id).ToList();
                var rnd = new Random(mat.Id * 17);
                foreach (var est in estudiantes10A)
                {
                    decimal n1 = Math.Round((decimal)(3.0 + rnd.NextDouble() * 2.0), 1);
                    decimal n2 = Math.Round((decimal)(2.8 + rnd.NextDouble() * 2.2), 1);
                    db.Notas.AddRange(
                        new Nota { ColumnaId = col1.Id, EstudianteId = est.Id, Valor = Math.Min(5.0m, n1) },
                        new Nota { ColumnaId = col2.Id, EstudianteId = est.Id, Valor = Math.Min(5.0m, n2) }
                    );
                }
                db.SaveChanges();
            }
        }

        // Seeder de Horarios de Clases si no existen
        if (!db.HorariosClase.Any())
        {
            var horarios = new List<HorarioClase>
            {
                // Grado 10A - Lunes (1)
                new() { GrupoId = grupo.Id, MateriaId = materia.Id, ProfesorId = materia.ProfesorId, DiaSemana = 1, HoraInicio = "07:00", HoraFin = "08:30", Aula = "Aula 101", Notas = "Traer calculadora científica" },
                new() { GrupoId = grupo.Id, MateriaId = matQuimica.Id, ProfesorId = matQuimica.ProfesorId, DiaSemana = 1, HoraInicio = "08:30", HoraFin = "10:00", Aula = "Laboratorio de Ciencias", Notas = "Traer bata blanca" },
                new() { GrupoId = grupo.Id, MateriaId = matCastellano.Id, ProfesorId = matCastellano.ProfesorId, DiaSemana = 1, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Aula 101", Notas = "Lectura obra literaria" },
                new() { GrupoId = grupo.Id, MateriaId = matIngles.Id, ProfesorId = matIngles.ProfesorId, DiaSemana = 1, HoraInicio = "12:30", HoraFin = "14:00", Aula = "Sala de Bilingüismo" },

                // Grado 10A - Martes (2)
                new() { GrupoId = grupo.Id, MateriaId = matFisica.Id, ProfesorId = matFisica.ProfesorId, DiaSemana = 2, HoraInicio = "07:00", HoraFin = "08:30", Aula = "Aula 101" },
                new() { GrupoId = grupo.Id, MateriaId = materia.Id, ProfesorId = materia.ProfesorId, DiaSemana = 2, HoraInicio = "08:30", HoraFin = "10:00", Aula = "Aula 101" },
                new() { GrupoId = grupo.Id, MateriaId = matTecno.Id, ProfesorId = matTecno.ProfesorId, DiaSemana = 2, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Sala de Cómputo 1" },
                new() { GrupoId = grupo.Id, MateriaId = matCastellano.Id, ProfesorId = matCastellano.ProfesorId, DiaSemana = 2, HoraInicio = "12:30", HoraFin = "14:00", Aula = "Aula 101" },

                // Grado 10A - Miércoles (3)
                new() { GrupoId = grupo.Id, MateriaId = matQuimica.Id, ProfesorId = matQuimica.ProfesorId, DiaSemana = 3, HoraInicio = "07:00", HoraFin = "08:30", Aula = "Laboratorio de Ciencias" },
                new() { GrupoId = grupo.Id, MateriaId = matFisica.Id, ProfesorId = matFisica.ProfesorId, DiaSemana = 3, HoraInicio = "08:30", HoraFin = "10:00", Aula = "Aula 101" },
                new() { GrupoId = grupo.Id, MateriaId = materia.Id, ProfesorId = materia.ProfesorId, DiaSemana = 3, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Aula 101" },
                new() { GrupoId = grupo.Id, MateriaId = matTecno.Id, ProfesorId = matTecno.ProfesorId, DiaSemana = 3, HoraInicio = "12:30", HoraFin = "14:00", Aula = "Sala de Cómputo 1" },

                // Grado 10A - Jueves (4)
                new() { GrupoId = grupo.Id, MateriaId = matCastellano.Id, ProfesorId = matCastellano.ProfesorId, DiaSemana = 4, HoraInicio = "07:00", HoraFin = "08:30", Aula = "Aula 101" },
                new() { GrupoId = grupo.Id, MateriaId = matIngles.Id, ProfesorId = matIngles.ProfesorId, DiaSemana = 4, HoraInicio = "08:30", HoraFin = "10:00", Aula = "Sala de Bilingüismo" },
                new() { GrupoId = grupo.Id, MateriaId = matFisica.Id, ProfesorId = matFisica.ProfesorId, DiaSemana = 4, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Laboratorio de Física" },
                new() { GrupoId = grupo.Id, MateriaId = materia.Id, ProfesorId = materia.ProfesorId, DiaSemana = 4, HoraInicio = "12:30", HoraFin = "14:00", Aula = "Aula 101" },

                // Grado 10A - Viernes (5)
                new() { GrupoId = grupo.Id, MateriaId = matTecno.Id, ProfesorId = matTecno.ProfesorId, DiaSemana = 5, HoraInicio = "07:00", HoraFin = "08:30", Aula = "Sala de Cómputo 1" },
                new() { GrupoId = grupo.Id, MateriaId = matQuimica.Id, ProfesorId = matQuimica.ProfesorId, DiaSemana = 5, HoraInicio = "08:30", HoraFin = "10:00", Aula = "Laboratorio de Ciencias" },
                new() { GrupoId = grupo.Id, MateriaId = matCastellano.Id, ProfesorId = matCastellano.ProfesorId, DiaSemana = 5, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Aula 101" },
                new() { GrupoId = grupo.Id, MateriaId = matIngles.Id, ProfesorId = matIngles.ProfesorId, DiaSemana = 5, HoraInicio = "12:30", HoraFin = "14:00", Aula = "Sala de Bilingüismo" },

                // Grado 11A - Lunes (1)
                new() { GrupoId = g11A.Id, MateriaId = matFisica.Id, ProfesorId = matFisica.ProfesorId, DiaSemana = 1, HoraInicio = "08:30", HoraFin = "10:00", Aula = "Aula 201" },
                new() { GrupoId = g11A.Id, MateriaId = matTecno.Id, ProfesorId = matTecno.ProfesorId, DiaSemana = 1, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Sala de Cómputo 2" },
                // Grado 11A - Martes (2)
                new() { GrupoId = g11A.Id, MateriaId = matQuimica.Id, ProfesorId = matQuimica.ProfesorId, DiaSemana = 2, HoraInicio = "07:00", HoraFin = "08:30", Aula = "Laboratorio de Ciencias" },
                new() { GrupoId = g11A.Id, MateriaId = matIngles.Id, ProfesorId = matIngles.ProfesorId, DiaSemana = 2, HoraInicio = "10:30", HoraFin = "12:00", Aula = "Sala de Bilingüismo" }
            };

            db.HorariosClase.AddRange(horarios);
            db.SaveChanges();
        }
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
