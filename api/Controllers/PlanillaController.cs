using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Profesor")]
[Route("api/planilla")]
public class PlanillaController : ControllerBase
{
    private readonly AppDb _db;

    public PlanillaController(AppDb db) => _db = db;

    [HttpGet("asistencia")]
    public async Task<IActionResult> Asistencia([FromQuery] int materiaId, [FromQuery] int grupoId)
    {
        if (!await Propio(materiaId, grupoId))
            return BadRequest(new { mensaje = "Elige una materia y un grupo tuyos." });

        var estudiantes = await Estudiantes(grupoId);
        var sesiones = await _db.Sesiones
            .Where(s => s.MateriaId == materiaId && s.GrupoId == grupoId)
            .OrderBy(s => s.Fecha)
            .Select(s => new { s.Id, s.Fecha, presentes = s.Asistencias.Select(a => a.EstudianteId).ToList() })
            .ToListAsync();

        return Ok(new
        {
            estudiantes,
            fechas = sesiones.Select(s => new
            {
                s.Id,
                fecha = s.Fecha.ToString("yyyy-MM-dd"),
                presentes = s.presentes
            })
        });
    }

    [HttpPut("asistencia")]
    public async Task<IActionResult> MarcarCelda([FromBody] CeldaAsistencia body)
    {
        if (!await Propio(body.MateriaId, body.GrupoId))
            return BadRequest(new { mensaje = "Elige una materia y un grupo tuyos." });
        if (!DateOnly.TryParse(body.Fecha, out var fecha))
            return BadRequest(new { mensaje = "La fecha no es válida." });

        var estudiante = await _db.Estudiantes
            .FirstOrDefaultAsync(e => e.Id == body.EstudianteId && e.GrupoId == body.GrupoId);
        if (estudiante is null)
            return BadRequest(new { mensaje = "Ese estudiante no está en el grupo." });

        var sesion = await _db.Sesiones.FirstOrDefaultAsync(s =>
            s.MateriaId == body.MateriaId && s.GrupoId == body.GrupoId && s.Fecha == fecha);
        if (sesion is null)
        {
            sesion = new Sesion
            {
                MateriaId = body.MateriaId,
                GrupoId = body.GrupoId,
                ProfesorId = ProfesorId(),
                Fecha = fecha,
                CreadaEn = DateTime.UtcNow
            };
            _db.Sesiones.Add(sesion);
            await _db.SaveChangesAsync();
        }

        var asistencia = await _db.Asistencias
            .FirstOrDefaultAsync(a => a.SesionId == sesion.Id && a.EstudianteId == estudiante.Id);
        if (body.Presente && asistencia is null)
        {
            _db.Asistencias.Add(new Asistencia
            {
                SesionId = sesion.Id,
                EstudianteId = estudiante.Id,
                MarcadaEn = DateTime.UtcNow,
                Origen = "Manual"
            });
        }
        else if (!body.Presente && asistencia is not null)
        {
            _db.Asistencias.Remove(asistencia);
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Celda actualizada.", sesionId = sesion.Id });
    }

    [HttpGet("notas")]
    public async Task<IActionResult> Notas([FromQuery] int materiaId, [FromQuery] int grupoId)
    {
        if (!await Propio(materiaId, grupoId))
            return BadRequest(new { mensaje = "Elige una materia y un grupo tuyos." });

        var estudiantes = await Estudiantes(grupoId);
        var columnas = await _db.NotaColumnas
            .Where(c => c.MateriaId == materiaId && c.GrupoId == grupoId)
            .OrderBy(c => c.Orden).ThenBy(c => c.Id)
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                notas = c.Notas.Select(n => new { n.EstudianteId, n.Valor })
            })
            .ToListAsync();
        return Ok(new { estudiantes, columnas });
    }

    [HttpPost("notas/columnas")]
    public async Task<IActionResult> CrearColumna([FromBody] ColumnaRequest body)
    {
        if (!await Propio(body.MateriaId, body.GrupoId))
            return BadRequest(new { mensaje = "Elige una materia y un grupo tuyos." });
        var nombre = (body.Nombre ?? "").Trim();
        if (nombre.Length is 0 or > 80)
            return BadRequest(new { mensaje = "Escribe el nombre de la columna." });
        if (await _db.NotaColumnas.AnyAsync(c =>
                c.MateriaId == body.MateriaId && c.GrupoId == body.GrupoId && c.Nombre == nombre))
            return BadRequest(new { mensaje = "Esa columna ya existe." });

        var orden = await _db.NotaColumnas.CountAsync(c => c.MateriaId == body.MateriaId && c.GrupoId == body.GrupoId);
        var columna = new NotaColumna
        {
            MateriaId = body.MateriaId,
            GrupoId = body.GrupoId,
            Nombre = nombre,
            Orden = orden + 1
        };
        _db.NotaColumnas.Add(columna);
        await _db.SaveChangesAsync();
        return Ok(new { columna.Id, columna.Nombre });
    }

    [HttpPut("notas")]
    public async Task<IActionResult> GuardarNota([FromBody] NotaRequest body)
    {
        var columna = await _db.NotaColumnas
            .Include(c => c.Materia)
            .FirstOrDefaultAsync(c => c.Id == body.ColumnaId && c.Materia!.ProfesorId == ProfesorId());
        if (columna is null)
            return NotFound(new { mensaje = "No se encontró la columna." });
        var estudiante = await _db.Estudiantes
            .FirstOrDefaultAsync(e => e.Id == body.EstudianteId && e.GrupoId == columna.GrupoId);
        if (estudiante is null)
            return BadRequest(new { mensaje = "Ese estudiante no está en el grupo." });
        if (body.Valor is < 0 or > 5)
            return BadRequest(new { mensaje = "La nota va de 0 a 5." });

        var nota = await _db.Notas
            .FirstOrDefaultAsync(n => n.ColumnaId == columna.Id && n.EstudianteId == estudiante.Id);
        if (body.Valor is null)
        {
            if (nota is not null) _db.Notas.Remove(nota);
        }
        else if (nota is null)
        {
            _db.Notas.Add(new Nota
            {
                ColumnaId = columna.Id,
                EstudianteId = estudiante.Id,
                Valor = body.Valor.Value
            });
        }
        else
        {
            nota.Valor = body.Valor.Value;
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Nota guardada." });
    }

    private async Task<List<object>> Estudiantes(int grupoId)
    {
        return await _db.Estudiantes
            .Where(e => e.GrupoId == grupoId)
            .OrderBy(e => e.Nombre)
            .Select(e => (object)new { e.Id, e.Nombre })
            .ToListAsync();
    }

    private async Task<bool> Propio(int materiaId, int grupoId)
    {
        var id = ProfesorId();
        var materia = await _db.Materias.AnyAsync(m => m.Id == materiaId && m.ProfesorId == id);
        var grupo = await _db.Grupos.AnyAsync(g => g.Id == grupoId);
        var vinculo = await _db.MateriaGrupos.AnyAsync(x => x.MateriaId == materiaId && x.GrupoId == grupoId);
        return materia && grupo && vinculo;
    }

    private int ProfesorId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public record CeldaAsistencia(int MateriaId, int GrupoId, string? Fecha, int EstudianteId, bool Presente);
public record ColumnaRequest(int MateriaId, int GrupoId, string? Nombre);
public record NotaRequest(int ColumnaId, int EstudianteId, decimal? Valor);
