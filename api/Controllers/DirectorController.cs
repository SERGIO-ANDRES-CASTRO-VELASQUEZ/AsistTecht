using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QRCoder;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Director")]
[Route("api/director")]
public class DirectorController : ControllerBase
{
    private readonly AppDb _db;

    public DirectorController(AppDb db) => _db = db;

    // =========================================================================
    // REVISIÓN DE DOCENTES CREADOS POR EL ADMINISTRADOR
    // =========================================================================
    [HttpGet("docentes")]
    public async Task<IActionResult> ListarDocentes()
    {
        var lista = await _db.Profesores
            .OrderBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Usuario,
                cedula = p.Usuario,
                p.Activo,
                materias = p.Materias.Select(m => new
                {
                    m.Id,
                    m.Nombre,
                    grupos = m.Grupos.Select(g => g.Grupo != null ? g.Grupo.Nombre : "").ToList()
                }).ToList(),
                grupos = p.Grupos.Select(g => new { g.Id, g.Nombre }).ToList(),
                totalMaterias = p.Materias.Count,
                totalGrupos = p.Grupos.Count
            })
            .ToListAsync();

        return Ok(lista);
    }

    // =========================================================================
    // GESTIÓN DE ASIGNATURAS Y CURSOS (DIRECCIÓN CREA Y AMARRA AL DOCENTE Y CURSO)
    // =========================================================================
    [HttpGet("asignaturas")]
    public async Task<IActionResult> ListarAsignaturas()
    {
        var lista = await _db.Materias
            .Include(m => m.Profesor)
            .Include(m => m.Grupos)
                .ThenInclude(mg => mg.Grupo)
            .OrderBy(m => m.Nombre)
            .Select(m => new
            {
                m.Id,
                m.Nombre,
                m.ProfesorId,
                profesorNombre = m.Profesor != null ? m.Profesor.Nombre : "Sin docente",
                profesorCedula = m.Profesor != null ? m.Profesor.Usuario : "",
                grupos = m.Grupos.Select(g => new
                {
                    grupoId = g.GrupoId,
                    grupoNombre = g.Grupo != null ? g.Grupo.Nombre : ""
                }).ToList()
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpPost("asignaturas")]
    public async Task<IActionResult> CrearYAmarrarAsignatura([FromBody] DirectorAsignaturaRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        if (string.IsNullOrEmpty(nombre))
            return BadRequest(new { mensaje = "El nombre de la asignatura es obligatorio." });

        var profesor = await _db.Profesores.FindAsync(body.ProfesorId);
        if (profesor is null)
            return BadRequest(new { mensaje = "El docente seleccionado no existe en el sistema." });

        var grupo = await _db.Grupos.FindAsync(body.GrupoId);
        if (grupo is null)
            return BadRequest(new { mensaje = "El grupo o grado escolar seleccionado no existe." });

        // Buscar si ya existe la materia asignada a ese profesor o crearla
        var materia = await _db.Materias
            .FirstOrDefaultAsync(m => m.ProfesorId == body.ProfesorId && m.Nombre.ToLower() == nombre.ToLower());

        if (materia is null)
        {
            materia = new Materia
            {
                Nombre = nombre,
                ProfesorId = body.ProfesorId
            };
            _db.Materias.Add(materia);
            await _db.SaveChangesAsync();
        }

        // Amarrar la materia al grupo si aún no está vinculada
        var yaVinculado = await _db.MateriaGrupos
            .AnyAsync(mg => mg.MateriaId == materia.Id && mg.GrupoId == body.GrupoId);

        if (!yaVinculado)
        {
            _db.MateriaGrupos.Add(new MateriaGrupo
            {
                MateriaId = materia.Id,
                GrupoId = body.GrupoId
            });
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            mensaje = $"Asignatura '{nombre}' creada y amarrada con éxito al docente {profesor.Nombre} en el grado {grupo.Nombre}.",
            materiaId = materia.Id,
            materiaNombre = materia.Nombre,
            profesorId = profesor.Id,
            profesorNombre = profesor.Nombre,
            grupoId = grupo.Id,
            grupoNombre = grupo.Nombre
        });
    }

    // =========================================================================
    // MATRÍCULA DE ESTUDIANTES DESDE DIRECCIÓN (EL PROFESOR NO MATRICULA)
    // =========================================================================
    [HttpPost("estudiantes")]
    public async Task<IActionResult> MatricularEstudiante([FromBody] DirectorMatriculaRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var documento = (body.Documento ?? "").Trim();
        var password = (body.Password ?? "").Trim();

        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre y apellidos completos del estudiante." });

        if (documento.Length is < 5 or > 20 || !documento.All(char.IsDigit))
            return BadRequest(new { mensaje = "El documento del estudiante debe ser numérico y tener entre 5 y 20 dígitos." });

        var grupo = await _db.Grupos.Include(g => g.Profesor).FirstOrDefaultAsync(g => g.Id == body.GrupoId);
        if (grupo is null)
            return BadRequest(new { mensaje = "Debes seleccionar un grado escolar válido para matricular al estudiante." });

        if (await _db.Estudiantes.AnyAsync(e => e.Documento == documento))
            return BadRequest(new { mensaje = "Ya existe un estudiante matriculado con ese número de documento." });

        if (string.IsNullOrWhiteSpace(password))
            password = PasswordPolicy.GenerarClaveDinamica();
        else
        {
            var (valida, error) = PasswordPolicy.Validar(password);
            if (!valida) return BadRequest(new { mensaje = error });
        }

        var qrToken = Guid.NewGuid().ToString("N");

        var estudiante = new Estudiante
        {
            Nombre = nombre,
            Documento = documento,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            QrToken = qrToken,
            GrupoId = grupo.Id,
            ProfesorId = grupo.ProfesorId,
            DebeCambiarPassword = true,
            Activo = true
        };

        _db.Estudiantes.Add(estudiante);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            mensaje = $"Estudiante {estudiante.Nombre} matriculado exitosamente en el grado {grupo.Nombre}.",
            id = estudiante.Id,
            nombre = estudiante.Nombre,
            documento = estudiante.Documento,
            grupo = grupo.Nombre,
            claveAsignada = password
        });
    }

    // =========================================================================
    // CATÁLOGO DE GRUPOS Y MATERIAS BASE PARA SELECCIÓN EN DIRECCIÓN
    // =========================================================================
    [HttpGet("catalogo-academico")]
    public async Task<IActionResult> CatalogoAcademico()
    {
        var grupos = await _db.Grupos
            .OrderBy(g => g.Nombre)
            .Select(g => new { g.Id, g.Nombre, estudiantesCount = g.Estudiantes.Count })
            .ToListAsync();

        var docentes = await _db.Profesores
            .Where(p => p.Activo)
            .OrderBy(p => p.Nombre)
            .Select(p => new { p.Id, p.Nombre, p.Usuario })
            .ToListAsync();

        var materiasSugeridas = await _db.Materias
            .Select(m => m.Nombre)
            .Distinct()
            .OrderBy(n => n)
            .ToListAsync();

        return Ok(new
        {
            grupos,
            docentes,
            materiasSugeridas
        });
    }

    // =========================================================================
    // GESTIÓN DE HORARIOS DE CLASES POR CURSO Y MATERIAS (DIRECCIÓN)
    // =========================================================================
    [HttpGet("horarios")]
    public async Task<IActionResult> ListarHorarios([FromQuery] int? grupoId, [FromQuery] int? profesorId, [FromQuery] int? diaSemana)
    {
        var query = _db.HorariosClase
            .Include(h => h.Grupo)
            .Include(h => h.Materia)
            .Include(h => h.Profesor)
            .AsQueryable();

        if (grupoId.HasValue)
            query = query.Where(h => h.GrupoId == grupoId.Value);
        if (profesorId.HasValue)
            query = query.Where(h => h.ProfesorId == profesorId.Value);
        if (diaSemana.HasValue)
            query = query.Where(h => h.DiaSemana == diaSemana.Value);

        var lista = await query
            .OrderBy(h => h.DiaSemana)
            .ThenBy(h => h.HoraInicio)
            .Select(h => new
            {
                h.Id,
                h.GrupoId,
                grupoNombre = h.Grupo != null ? h.Grupo.Nombre : "",
                h.MateriaId,
                materiaNombre = h.Materia != null ? h.Materia.Nombre : "",
                h.ProfesorId,
                profesorNombre = h.Profesor != null ? h.Profesor.Nombre : "",
                profesorCedula = h.Profesor != null ? h.Profesor.Usuario : "",
                h.DiaSemana,
                diaNombre = ObtenerNombreDia(h.DiaSemana),
                h.HoraInicio,
                h.HoraFin,
                h.Aula,
                h.Notas
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("horarios/materias-por-curso/{grupoId:int}")]
    public async Task<IActionResult> MateriasPorCurso(int grupoId)
    {
        var grupo = await _db.Grupos.FindAsync(grupoId);
        if (grupo is null)
            return NotFound(new { mensaje = "Grupo no encontrado." });

        var materias = await _db.MateriaGrupos
            .Where(mg => mg.GrupoId == grupoId)
            .Include(mg => mg.Materia)
                .ThenInclude(m => m!.Profesor)
            .Select(mg => new
            {
                materiaId = mg.MateriaId,
                materiaNombre = mg.Materia != null ? mg.Materia.Nombre : "",
                profesorId = mg.Materia != null ? mg.Materia.ProfesorId : 0,
                profesorNombre = mg.Materia != null && mg.Materia.Profesor != null ? mg.Materia.Profesor.Nombre : "Sin docente",
                profesorCedula = mg.Materia != null && mg.Materia.Profesor != null ? mg.Materia.Profesor.Usuario : ""
            })
            .ToListAsync();

        return Ok(new
        {
            grupoId = grupo.Id,
            grupoNombre = grupo.Nombre,
            materias
        });
    }

    [HttpPost("horarios")]
    public async Task<IActionResult> CrearHorario([FromBody] DirectorHorarioRequest body)
    {
        if (body.DiaSemana is < 1 or > 6)
            return BadRequest(new { mensaje = "El día debe estar entre 1 (Lunes) y 6 (Sábado)." });

        var horaInicio = (body.HoraInicio ?? "").Trim();
        var horaFin = (body.HoraFin ?? "").Trim();
        if (string.IsNullOrEmpty(horaInicio) || string.IsNullOrEmpty(horaFin))
            return BadRequest(new { mensaje = "Debes ingresar hora de inicio y hora de fin." });

        if (string.Compare(horaInicio, horaFin) >= 0)
            return BadRequest(new { mensaje = "La hora de inicio debe ser anterior a la hora de fin." });

        var grupo = await _db.Grupos.FindAsync(body.GrupoId);
        if (grupo is null)
            return BadRequest(new { mensaje = "El grupo/curso no existe." });

        var materia = await _db.Materias.Include(m => m.Profesor).FirstOrDefaultAsync(m => m.Id == body.MateriaId);
        if (materia is null)
            return BadRequest(new { mensaje = "La materia no existe." });

        var profesorId = body.ProfesorId > 0 ? body.ProfesorId : materia.ProfesorId;
        var profesor = await _db.Profesores.FindAsync(profesorId);
        if (profesor is null)
            return BadRequest(new { mensaje = "El docente seleccionado no existe." });

        // Asegurar que la materia esté vinculada al grupo
        var yaVinculada = await _db.MateriaGrupos.AnyAsync(mg => mg.GrupoId == body.GrupoId && mg.MateriaId == body.MateriaId);
        if (!yaVinculada)
        {
            _db.MateriaGrupos.Add(new MateriaGrupo { GrupoId = body.GrupoId, MateriaId = body.MateriaId });
            await _db.SaveChangesAsync();
        }

        // Validación de conflictos de horario para el GRUPO
        var conflictoGrupo = await _db.HorariosClase
            .Include(h => h.Materia)
            .FirstOrDefaultAsync(h => h.GrupoId == body.GrupoId &&
                                      h.DiaSemana == body.DiaSemana &&
                                      string.Compare(h.HoraInicio, horaFin) < 0 &&
                                      string.Compare(h.HoraFin, horaInicio) > 0);

        if (conflictoGrupo is not null)
        {
            return BadRequest(new { mensaje = $"El curso {grupo.Nombre} ya tiene programada la clase de {conflictoGrupo.Materia?.Nombre} el {ObtenerNombreDia(body.DiaSemana)} de {conflictoGrupo.HoraInicio} a {conflictoGrupo.HoraFin}." });
        }

        // Validación de conflictos de horario para el PROFESOR
        var conflictoProfesor = await _db.HorariosClase
            .Include(h => h.Grupo)
            .Include(h => h.Materia)
            .FirstOrDefaultAsync(h => h.ProfesorId == profesorId &&
                                      h.DiaSemana == body.DiaSemana &&
                                      string.Compare(h.HoraInicio, horaFin) < 0 &&
                                      string.Compare(h.HoraFin, horaInicio) > 0);

        if (conflictoProfesor is not null)
        {
            return BadRequest(new { mensaje = $"El docente {profesor.Nombre} ya está ocupado dictando {conflictoProfesor.Materia?.Nombre} al grado {conflictoProfesor.Grupo?.Nombre} el {ObtenerNombreDia(body.DiaSemana)} de {conflictoProfesor.HoraInicio} a {conflictoProfesor.HoraFin}." });
        }

        var horario = new HorarioClase
        {
            GrupoId = body.GrupoId,
            MateriaId = body.MateriaId,
            ProfesorId = profesorId,
            DiaSemana = body.DiaSemana,
            HoraInicio = horaInicio,
            HoraFin = horaFin,
            Aula = string.IsNullOrWhiteSpace(body.Aula) ? "Aula Regular" : body.Aula.Trim(),
            Notas = string.IsNullOrWhiteSpace(body.Notas) ? null : body.Notas.Trim()
        };

        _db.HorariosClase.Add(horario);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            mensaje = $"Horario programado: {materia.Nombre} con {profesor.Nombre} en grado {grupo.Nombre} los {ObtenerNombreDia(body.DiaSemana)} de {horaInicio} a {horaFin}.",
            horario.Id,
            horario.GrupoId,
            grupoNombre = grupo.Nombre,
            horario.MateriaId,
            materiaNombre = materia.Nombre,
            horario.ProfesorId,
            profesorNombre = profesor.Nombre,
            horario.DiaSemana,
            diaNombre = ObtenerNombreDia(horario.DiaSemana),
            horario.HoraInicio,
            horario.HoraFin,
            horario.Aula,
            horario.Notas
        });
    }

    [HttpPut("horarios/{id:int}")]
    public async Task<IActionResult> ActualizarHorario(int id, [FromBody] DirectorHorarioRequest body)
    {
        var horario = await _db.HorariosClase.FindAsync(id);
        if (horario is null)
            return NotFound(new { mensaje = "Bloque de horario no encontrado." });

        var horaInicio = (body.HoraInicio ?? "").Trim();
        var horaFin = (body.HoraFin ?? "").Trim();
        if (string.Compare(horaInicio, horaFin) >= 0)
            return BadRequest(new { mensaje = "La hora de inicio debe ser anterior a la hora de fin." });

        var profesorId = body.ProfesorId > 0 ? body.ProfesorId : horario.ProfesorId;

        var conflictoGrupo = await _db.HorariosClase
            .Include(h => h.Materia)
            .FirstOrDefaultAsync(h => h.Id != id &&
                                      h.GrupoId == body.GrupoId &&
                                      h.DiaSemana == body.DiaSemana &&
                                      string.Compare(h.HoraInicio, horaFin) < 0 &&
                                      string.Compare(h.HoraFin, horaInicio) > 0);
        if (conflictoGrupo is not null)
            return BadRequest(new { mensaje = $"El curso ya tiene la clase de {conflictoGrupo.Materia?.Nombre} en ese horario." });

        var conflictoProf = await _db.HorariosClase
            .Include(h => h.Grupo)
            .FirstOrDefaultAsync(h => h.Id != id &&
                                      h.ProfesorId == profesorId &&
                                      h.DiaSemana == body.DiaSemana &&
                                      string.Compare(h.HoraInicio, horaFin) < 0 &&
                                      string.Compare(h.HoraFin, horaInicio) > 0);
        if (conflictoProf is not null)
            return BadRequest(new { mensaje = $"El docente ya tiene clase con {conflictoProf.Grupo?.Nombre} en ese horario." });

        horario.GrupoId = body.GrupoId;
        horario.MateriaId = body.MateriaId;
        horario.ProfesorId = profesorId;
        horario.DiaSemana = body.DiaSemana;
        horario.HoraInicio = horaInicio;
        horario.HoraFin = horaFin;
        horario.Aula = string.IsNullOrWhiteSpace(body.Aula) ? "Aula Regular" : body.Aula.Trim();
        horario.Notas = body.Notas?.Trim();

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Horario actualizado exitosamente.", horario.Id });
    }

    [HttpDelete("horarios/{id:int}")]
    public async Task<IActionResult> EliminarHorario(int id)
    {
        var horario = await _db.HorariosClase.FindAsync(id);
        if (horario is null)
            return NotFound(new { mensaje = "Horario no encontrado." });

        _db.HorariosClase.Remove(horario);
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Bloque de horario eliminado con éxito." });
    }

    private static string ObtenerNombreDia(int dia) => dia switch
    {
        1 => "Lunes",
        2 => "Martes",
        3 => "Miércoles",
        4 => "Jueves",
        5 => "Viernes",
        6 => "Sábado",
        _ => "Día"
    };
}

public record DirectorAsignaturaRequest(string? Nombre, int ProfesorId, int GrupoId);
public record DirectorMatriculaRequest(string? Nombre, string? Documento, int GrupoId, string? Password);
public record DirectorHorarioRequest(int GrupoId, int MateriaId, int ProfesorId, int DiaSemana, string? HoraInicio, string? HoraFin, string? Aula, string? Notas);
