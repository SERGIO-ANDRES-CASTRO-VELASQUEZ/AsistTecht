using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Profesor")]
[Route("api/sesiones")]
public class SesionesController : ControllerBase
{
    private readonly AppDb _db;

    public SesionesController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var id = ProfesorId();
        var sesiones = await _db.Sesiones
            .Where(s => s.ProfesorId == id)
            .OrderByDescending(s => s.Fecha)
            .ThenByDescending(s => s.Id)
            .Select(s => new
            {
                s.Id,
                fecha = s.Fecha.ToString("yyyy-MM-dd"),
                materia = s.Materia!.Nombre,
                grupo = s.Grupo!.Nombre,
                presentes = s.Asistencias.Count,
                total = s.Grupo!.Estudiantes.Count
            })
            .ToListAsync();
        return Ok(sesiones);
    }

    [HttpPost]
    public async Task<IActionResult> Abrir([FromBody] AbrirSesionRequest body)
    {
        var profesorId = ProfesorId();
        var materia = await _db.Materias.FirstOrDefaultAsync(m => m.Id == body.MateriaId && m.ProfesorId == profesorId);
        var grupo = await _db.Grupos.FirstOrDefaultAsync(g => g.Id == body.GrupoId);
        if (materia is null || grupo is null)
            return BadRequest(new { mensaje = "Elige una materia y un grupo." });

        var vinculada = await _db.MateriaGrupos.AnyAsync(x => x.MateriaId == materia.Id && x.GrupoId == grupo.Id);
        if (!vinculada)
            return BadRequest(new { mensaje = "Esa materia no está asignada a ese grupo." });

        var hoy = Reloj.Hoy();
        var sesion = await _db.Sesiones.FirstOrDefaultAsync(s =>
            s.MateriaId == materia.Id && s.GrupoId == grupo.Id && s.Fecha == hoy);
        if (sesion is null)
        {
            sesion = new Sesion
            {
                MateriaId = materia.Id,
                GrupoId = grupo.Id,
                ProfesorId = profesorId,
                Fecha = hoy,
                CreadaEn = DateTime.UtcNow
            };
            _db.Sesiones.Add(sesion);
            await _db.SaveChangesAsync();
        }

        return Ok(await Detalle(sesion.Id, profesorId));
    }

    [HttpGet("{sesionId:int}")]
    public async Task<IActionResult> Obtener(int sesionId)
    {
        var detalle = await Detalle(sesionId, ProfesorId());
        return detalle is null ? NotFound(new { mensaje = "No se encontró la clase." }) : Ok(detalle);
    }

    [HttpPost("{sesionId:int}/marcar")]
    public async Task<IActionResult> Marcar(int sesionId, [FromBody] MarcarRequest body)
    {
        var token = (body.Token ?? "").Trim().ToLowerInvariant();
        var sesion = await _db.Sesiones
            .Include(s => s.Grupo)
            .FirstOrDefaultAsync(s => s.Id == sesionId && s.ProfesorId == ProfesorId());
        if (sesion is null)
            return NotFound(new { mensaje = "No se encontró la clase." });

        var estudiante = await _db.Estudiantes.FirstOrDefaultAsync(e => e.QrToken == token || e.Documento == token);
        if (estudiante is null)
            return Ok(new { estado = EstadoMarca.NoEncontrado, nombre = (string?)null, documento = (string?)null });

        if (estudiante.GrupoId != sesion.GrupoId)
            return Ok(new { estado = EstadoMarca.NoPertenece, nombre = estudiante.Nombre, documento = estudiante.Documento, estudianteId = estudiante.Id });

        var ya = await _db.Asistencias
            .FirstOrDefaultAsync(a => a.SesionId == sesion.Id && a.EstudianteId == estudiante.Id);
        if (ya is not null)
            return Ok(new { estado = EstadoMarca.YaRegistrado, nombre = estudiante.Nombre, documento = estudiante.Documento, estudianteId = estudiante.Id });

        _db.Asistencias.Add(new Asistencia
        {
            SesionId = sesion.Id,
            EstudianteId = estudiante.Id,
            MarcadaEn = DateTime.UtcNow,
            Origen = "Qr"
        });

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Ok(new { estado = EstadoMarca.YaRegistrado, nombre = estudiante.Nombre, documento = estudiante.Documento, estudianteId = estudiante.Id });
        }

        return Ok(new { estado = EstadoMarca.Anotado, nombre = estudiante.Nombre, documento = estudiante.Documento, estudianteId = estudiante.Id });
    }

    [HttpPost("{sesionId:int}/reconocer")]
    public async Task<IActionResult> Reconocer(int sesionId, [FromBody] ReconocerRequest body)
    {
        var sesion = await _db.Sesiones
            .FirstOrDefaultAsync(s => s.Id == sesionId && s.ProfesorId == ProfesorId());
        if (sesion is null)
            return NotFound(new { mensaje = "No se encontró la clase." });

        float[] vector;
        try
        {
            vector = body.Vector ?? [];
            RostroUtil.Guardar(vector);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { mensaje = "La lectura de la cara no es válida." });
        }

        if (body.Ancho < 0.08)
            return Ok(new { estado = EstadoMarca.NoEncontrado, nombre = (string?)null, estudianteId = (int?)null, seguro = false });

        var muestras = await _db.Rostros
            .Where(r => r.Estudiante!.GrupoId == sesion.GrupoId)
            .Select(r => new { r.EstudianteId, Nombre = r.Estudiante!.Nombre, r.Vector })
            .ToListAsync();
        var mejor = RostroUtil.Mejor(vector, muestras.Select(m => (m.EstudianteId, m.Nombre, m.Vector)));
        if (mejor is null)
            return Ok(new { estado = EstadoMarca.NoEncontrado, nombre = (string?)null, estudianteId = (int?)null, seguro = false });

        if (!body.Confirmar)
            return Ok(new
            {
                estado = "Candidato",
                nombre = mejor.Value.Nombre,
                estudianteId = (int?)mejor.Value.EstudianteId,
                seguro = true,
                distancia = Math.Round(mejor.Value.Distancia, 3)
            });

        var ya = await _db.Asistencias
            .FirstOrDefaultAsync(a => a.SesionId == sesion.Id && a.EstudianteId == mejor.Value.EstudianteId);
        if (ya is not null)
            return Ok(new { estado = EstadoMarca.YaRegistrado, nombre = mejor.Value.Nombre, estudianteId = (int?)mejor.Value.EstudianteId, seguro = true });

        _db.Asistencias.Add(new Asistencia
        {
            SesionId = sesion.Id,
            EstudianteId = mejor.Value.EstudianteId,
            MarcadaEn = DateTime.UtcNow,
            Origen = "Rostro"
        });
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Ok(new { estado = EstadoMarca.YaRegistrado, nombre = mejor.Value.Nombre, estudianteId = (int?)mejor.Value.EstudianteId, seguro = true });
        }

        return Ok(new { estado = EstadoMarca.Anotado, nombre = mejor.Value.Nombre, estudianteId = (int?)mejor.Value.EstudianteId, seguro = true });
    }

    private async Task<object?> Detalle(int sesionId, int profesorId)
    {
        var sesion = await _db.Sesiones
            .Include(s => s.Materia)
            .Include(s => s.Grupo)
            .FirstOrDefaultAsync(s => s.Id == sesionId && s.ProfesorId == profesorId);
        if (sesion is null) return null;

        var asistencias = await _db.Asistencias
            .Where(a => a.SesionId == sesion.Id)
            .ToDictionaryAsync(a => a.EstudianteId, a => a.MarcadaEn);

        var estudiantes = await _db.Estudiantes
            .Where(e => e.GrupoId == sesion.GrupoId)
            .OrderBy(e => e.Nombre)
            .Select(e => new { e.Id, e.Nombre })
            .ToListAsync();

        return new
        {
            sesion.Id,
            fecha = sesion.Fecha.ToString("yyyy-MM-dd"),
            materia = sesion.Materia!.Nombre,
            grupo = sesion.Grupo!.Nombre,
            materiaId = sesion.MateriaId,
            grupoId = sesion.GrupoId,
            presentes = asistencias.Count,
            total = estudiantes.Count,
            estudiantes = estudiantes.Select(e => new
            {
                e.Id,
                e.Nombre,
                estado = asistencias.ContainsKey(e.Id) ? "Anotado" : "Pendiente",
                marcadaEn = asistencias.TryGetValue(e.Id, out var hora) ? hora : (DateTime?)null
            })
        };
    }

    private int ProfesorId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public record AbrirSesionRequest(int MateriaId, int GrupoId);
public record MarcarRequest(string? Token);
public record ReconocerRequest(float[]? Vector, bool Confirmar, double Ancho);
