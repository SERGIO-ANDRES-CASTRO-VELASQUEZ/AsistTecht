using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Profesor")]
[Route("api")]
public class CatalogoController : ControllerBase
{
    private readonly AppDb _db;

    public CatalogoController(AppDb db) => _db = db;

    [HttpGet("resumen")]
    public async Task<IActionResult> Resumen()
    {
        var id = ProfesorId();
        var hoy = Reloj.Hoy();
        return Ok(new
        {
            materias = await _db.Materias.CountAsync(m => m.ProfesorId == id),
            grupos = await _db.Grupos.CountAsync(g => g.ProfesorId == id),
            estudiantes = await _db.Estudiantes.CountAsync(e => e.ProfesorId == id),
            sesionesHoy = await _db.Sesiones.CountAsync(s => s.ProfesorId == id && s.Fecha == hoy)
        });
    }

    [HttpGet("materias")]
    public async Task<IActionResult> Materias()
    {
        var id = ProfesorId();
        var materias = await _db.Materias
            .Where(m => m.ProfesorId == id)
            .OrderBy(m => m.Nombre)
            .Select(m => new
            {
                m.Id,
                m.Nombre,
                grupos = m.Grupos.Select(g => g.Grupo!.Nombre).OrderBy(n => n).ToList()
            })
            .ToListAsync();
        return Ok(materias);
    }

    [HttpPost("materias")]
    public async Task<IActionResult> CrearMateria([FromBody] NombreRequest body)
    {
        var nombre = LimpiarNombre(body.Nombre, 120);
        if (nombre is null)
            return BadRequest(new { mensaje = "Escribe el nombre de la materia." });

        var id = ProfesorId();
        if (await _db.Materias.AnyAsync(m => m.ProfesorId == id && m.Nombre == nombre))
            return BadRequest(new { mensaje = "Ya tienes una materia con ese nombre." });

        var materia = new Materia { Nombre = nombre, ProfesorId = id };
        _db.Materias.Add(materia);
        await _db.SaveChangesAsync();
        return Ok(new { materia.Id, materia.Nombre });
    }

    [HttpDelete("materias/{materiaId:int}")]
    public async Task<IActionResult> BorrarMateria(int materiaId)
    {
        var materia = await MateriaPropia(materiaId);
        if (materia is null) return NotFound(new { mensaje = "No se encontró la materia." });
        if (await _db.Sesiones.AnyAsync(s => s.MateriaId == materiaId))
            return BadRequest(new { mensaje = "La materia ya tiene clases registradas." });

        _db.Materias.Remove(materia);
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Materia eliminada." });
    }

    [HttpGet("grupos")]
    public async Task<IActionResult> Grupos()
    {
        var id = ProfesorId();
        var grupos = await _db.Grupos
            .Where(g => g.ProfesorId == id)
            .OrderBy(g => g.Nombre)
            .Select(g => new
            {
                g.Id,
                g.Nombre,
                estudiantes = g.Estudiantes.Count,
                materiaIds = g.Materias.Select(m => m.MateriaId).ToList(),
                materias = g.Materias.Select(m => m.Materia!.Nombre).OrderBy(n => n).ToList()
            })
            .ToListAsync();
        return Ok(grupos);
    }

    [HttpPost("grupos")]
    public async Task<IActionResult> CrearGrupo([FromBody] NombreRequest body)
    {
        var nombre = LimpiarNombre(body.Nombre, 80);
        if (nombre is null)
            return BadRequest(new { mensaje = "Escribe el nombre del grupo." });

        var id = ProfesorId();
        if (await _db.Grupos.AnyAsync(g => g.ProfesorId == id && g.Nombre == nombre))
            return BadRequest(new { mensaje = "Ya tienes un grupo con ese nombre." });

        var grupo = new Grupo { Nombre = nombre, ProfesorId = id };
        _db.Grupos.Add(grupo);
        await _db.SaveChangesAsync();
        return Ok(new { grupo.Id, grupo.Nombre });
    }

    [HttpPut("grupos/{grupoId:int}/materias")]
    public async Task<IActionResult> AsignarMaterias(int grupoId, [FromBody] MateriasGrupoRequest body)
    {
        var grupo = await GrupoPropio(grupoId);
        if (grupo is null) return NotFound(new { mensaje = "No se encontró el grupo." });

        var ids = (body.MateriaIds ?? []).Distinct().ToList();
        var propias = await _db.Materias
            .Where(m => m.ProfesorId == ProfesorId() && ids.Contains(m.Id))
            .Select(m => m.Id)
            .ToListAsync();
        if (propias.Count != ids.Count)
            return BadRequest(new { mensaje = "Hay una materia que no te pertenece." });

        var actuales = await _db.MateriaGrupos.Where(x => x.GrupoId == grupoId).ToListAsync();
        _db.MateriaGrupos.RemoveRange(actuales);
        foreach (var materiaId in propias)
            _db.MateriaGrupos.Add(new MateriaGrupo { GrupoId = grupoId, MateriaId = materiaId });

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Materias del grupo actualizadas." });
    }

    [HttpDelete("grupos/{grupoId:int}")]
    public async Task<IActionResult> BorrarGrupo(int grupoId)
    {
        var grupo = await GrupoPropio(grupoId);
        if (grupo is null) return NotFound(new { mensaje = "No se encontró el grupo." });
        if (await _db.Estudiantes.AnyAsync(e => e.GrupoId == grupoId))
            return BadRequest(new { mensaje = "El grupo todavía tiene estudiantes." });
        if (await _db.Sesiones.AnyAsync(s => s.GrupoId == grupoId))
            return BadRequest(new { mensaje = "El grupo ya tiene clases registradas." });

        _db.Grupos.Remove(grupo);
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Grupo eliminado." });
    }

    private int ProfesorId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<Materia?> MateriaPropia(int id) =>
        await _db.Materias.FirstOrDefaultAsync(m => m.Id == id && m.ProfesorId == ProfesorId());

    private async Task<Grupo?> GrupoPropio(int id) =>
        await _db.Grupos.FirstOrDefaultAsync(g => g.Id == id && g.ProfesorId == ProfesorId());

    private static string? LimpiarNombre(string? valor, int max)
    {
        var nombre = (valor ?? "").Trim();
        if (nombre.Length == 0 || nombre.Length > max) return null;
        return nombre;
    }
}

public record NombreRequest(string? Nombre);
public record MateriasGrupoRequest(List<int>? MateriaIds);
