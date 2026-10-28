using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/horarios")]
public class HorariosController : ControllerBase
{
    private readonly AppDb _db;

    public HorariosController(AppDb db) => _db = db;

    // =========================================================================
    // HORARIO PERSONALIZADO SEGÚN EL ROL DEL USUARIO
    // =========================================================================
    [HttpGet("mi-horario")]
    public async Task<IActionResult> MiHorario()
    {
        var id = UsuarioId();

        if (User.IsInRole("Estudiante"))
        {
            var estudiante = await _db.Estudiantes
                .Include(e => e.Grupo)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (estudiante is null || !estudiante.GrupoId.HasValue)
            {
                return Ok(new
                {
                    rol = "Estudiante",
                    usuarioNombre = estudiante?.Nombre ?? "",
                    grupoId = (int?)null,
                    grupoNombre = "Sin curso asignado",
                    clases = Array.Empty<object>()
                });
            }

            var clases = await _db.HorariosClase
                .Where(h => h.GrupoId == estudiante.GrupoId.Value)
                .Include(h => h.Materia)
                .Include(h => h.Profesor)
                .OrderBy(h => h.DiaSemana)
                .ThenBy(h => h.HoraInicio)
                .Select(h => new
                {
                    h.Id,
                    h.GrupoId,
                    grupoNombre = estudiante.Grupo!.Nombre,
                    h.MateriaId,
                    materiaNombre = h.Materia != null ? h.Materia.Nombre : "",
                    h.ProfesorId,
                    profesorNombre = h.Profesor != null ? h.Profesor.Nombre : "Sin docente",
                    profesorCedula = h.Profesor != null ? h.Profesor.Usuario : "",
                    h.DiaSemana,
                    diaNombre = ObtenerNombreDia(h.DiaSemana),
                    h.HoraInicio,
                    h.HoraFin,
                    h.Aula,
                    h.Notas
                })
                .ToListAsync();

            return Ok(new
            {
                rol = "Estudiante",
                usuarioNombre = estudiante.Nombre,
                grupoId = estudiante.GrupoId,
                grupoNombre = estudiante.Grupo?.Nombre,
                clases
            });
        }

        if (User.IsInRole("Profesor"))
        {
            var profesor = await _db.Profesores.FindAsync(id);
            if (profesor is null)
                return Unauthorized();

            var clases = await _db.HorariosClase
                .Where(h => h.ProfesorId == id)
                .Include(h => h.Grupo)
                .Include(h => h.Materia)
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
                    profesorNombre = profesor.Nombre,
                    profesorCedula = profesor.Usuario,
                    h.DiaSemana,
                    diaNombre = ObtenerNombreDia(h.DiaSemana),
                    h.HoraInicio,
                    h.HoraFin,
                    h.Aula,
                    h.Notas
                })
                .ToListAsync();

            return Ok(new
            {
                rol = "Profesor",
                usuarioNombre = profesor.Nombre,
                totalClases = clases.Count,
                clases
            });
        }

        if (User.IsInRole("Acudiente"))
        {
            var acudiente = await _db.Acudientes
                .Include(a => a.Estudiantes)
                    .ThenInclude(e => e.Grupo)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (acudiente is null)
                return Unauthorized();

            var grupoIds = acudiente.Estudiantes
                .Where(e => e.GrupoId.HasValue)
                .Select(e => e.GrupoId!.Value)
                .Distinct()
                .ToList();

            var clases = await _db.HorariosClase
                .Where(h => grupoIds.Contains(h.GrupoId))
                .Include(h => h.Grupo)
                .Include(h => h.Materia)
                .Include(h => h.Profesor)
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
                    h.DiaSemana,
                    diaNombre = ObtenerNombreDia(h.DiaSemana),
                    h.HoraInicio,
                    h.HoraFin,
                    h.Aula,
                    h.Notas
                })
                .ToListAsync();

            return Ok(new
            {
                rol = "Acudiente",
                usuarioNombre = acudiente.Nombre,
                estudiantes = acudiente.Estudiantes.Select(e => new { e.Id, e.Nombre, e.GrupoId, grupoNombre = e.Grupo?.Nombre }).ToList(),
                clases
            });
        }

        // Para Director o Admin: retornar el horario del primer grupo por defecto o todos
        var primerGrupo = await _db.Grupos.OrderBy(g => g.Nombre).FirstOrDefaultAsync();
        if (primerGrupo is null)
            return Ok(new { rol = "Director", clases = Array.Empty<object>() });

        return await HorarioPorCurso(primerGrupo.Id);
    }

    [HttpGet("curso/{grupoId:int}")]
    public async Task<IActionResult> HorarioPorCurso(int grupoId)
    {
        var grupo = await _db.Grupos.FindAsync(grupoId);
        if (grupo is null)
            return NotFound(new { mensaje = "Grupo no encontrado." });

        var clases = await _db.HorariosClase
            .Where(h => h.GrupoId == grupoId)
            .Include(h => h.Materia)
            .Include(h => h.Profesor)
            .OrderBy(h => h.DiaSemana)
            .ThenBy(h => h.HoraInicio)
            .Select(h => new
            {
                h.Id,
                h.GrupoId,
                grupoNombre = grupo.Nombre,
                h.MateriaId,
                materiaNombre = h.Materia != null ? h.Materia.Nombre : "",
                h.ProfesorId,
                profesorNombre = h.Profesor != null ? h.Profesor.Nombre : "Sin docente",
                profesorCedula = h.Profesor != null ? h.Profesor.Usuario : "",
                h.DiaSemana,
                diaNombre = ObtenerNombreDia(h.DiaSemana),
                h.HoraInicio,
                h.HoraFin,
                h.Aula,
                h.Notas
            })
            .ToListAsync();

        return Ok(new
        {
            grupoId = grupo.Id,
            grupoNombre = grupo.Nombre,
            totalClases = clases.Count,
            clases
        });
    }

    [HttpGet("cursos")]
    public async Task<IActionResult> ListarCursos()
    {
        var cursos = await _db.Grupos
            .OrderBy(g => g.Nombre)
            .Select(g => new
            {
                g.Id,
                g.Nombre,
                totalClases = _db.HorariosClase.Count(h => h.GrupoId == g.Id)
            })
            .ToListAsync();

        return Ok(cursos);
    }

    private int UsuarioId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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

