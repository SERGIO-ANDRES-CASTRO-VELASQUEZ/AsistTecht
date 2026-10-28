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
}

public record DirectorAsignaturaRequest(string? Nombre, int ProfesorId, int GrupoId);
public record DirectorMatriculaRequest(string? Nombre, string? Documento, int GrupoId, string? Password);
