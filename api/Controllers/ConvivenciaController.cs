using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/convivencia")]
public class ConvivenciaController : ControllerBase
{
    private readonly AppDb _db;

    public ConvivenciaController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? estudianteId, [FromQuery] int? grupoId)
    {
        var query = _db.ObservacionesConvivencia
            .Include(o => o.Estudiante)
            .Include(o => o.Profesor)
            .AsQueryable();

        if (User.IsInRole("Estudiante"))
        {
            var id = UsuarioId();
            query = query.Where(o => o.EstudianteId == id);
        }
        else if (User.IsInRole("Acudiente"))
        {
            var id = UsuarioId();
            query = query.Where(o => o.Estudiante!.AcudienteId == id);
        }
        else if (User.IsInRole("Profesor"))
        {
            var id = UsuarioId();
            query = query.Where(o => o.ProfesorId == id || o.Estudiante!.Grupo!.ProfesorId == id || o.Estudiante!.Grupo!.Materias.Any(m => m.Materia!.ProfesorId == id));
        }

        if (estudianteId.HasValue)
            query = query.Where(o => o.EstudianteId == estudianteId.Value);

        if (grupoId.HasValue)
            query = query.Where(o => o.Estudiante!.GrupoId == grupoId.Value);

        var lista = await query
            .OrderByDescending(o => o.Fecha)
            .ThenByDescending(o => o.Id)
            .Select(o => new
            {
                o.Id,
                o.EstudianteId,
                estudianteNombre = o.Estudiante!.Nombre,
                estudianteDocumento = o.Estudiante.Documento,
                grupo = o.Estudiante.Grupo != null ? o.Estudiante.Grupo.Nombre : "Sin grupo",
                profesorNombre = o.Profesor!.Nombre,
                o.Tipo,
                o.Titulo,
                o.Descripcion,
                o.Compromiso,
                fecha = o.Fecha.ToString("yyyy-MM-dd"),
                o.NotificadoAcudiente
            })
            .ToListAsync();

        return Ok(lista);
    }

    [Authorize(Policy = "Profesor")]
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] ObservacionRequest body)
    {
        var estudiante = await _db.Estudiantes.FirstOrDefaultAsync(e => e.Id == body.EstudianteId);
        if (estudiante is null)
            return BadRequest(new { mensaje = "No se encontró el estudiante." });

        var titulo = (body.Titulo ?? "").Trim();
        var descripcion = (body.Descripcion ?? "").Trim();
        var tipo = (body.Tipo ?? "Atencion").Trim();

        if (string.IsNullOrEmpty(titulo) || string.IsNullOrEmpty(descripcion))
            return BadRequest(new { mensaje = "El título y la descripción son obligatorios." });

        var observacion = new ObservacionConvivencia
        {
            EstudianteId = estudiante.Id,
            ProfesorId = UsuarioId(),
            Tipo = tipo,
            Titulo = titulo,
            Descripcion = descripcion,
            Compromiso = string.IsNullOrWhiteSpace(body.Compromiso) ? null : body.Compromiso.Trim(),
            Fecha = DateOnly.TryParse(body.Fecha, out var f) ? f : Reloj.Hoy(),
            NotificadoAcudiente = true // Notificación activa por defecto para acudientes
        };

        _db.ObservacionesConvivencia.Add(observacion);

        // Notificación automática para el Estudiante
        _db.Notificaciones.Add(new Notificacion
        {
            RolDestinatario = "Estudiante",
            UsuarioDestinatarioId = estudiante.Id,
            Titulo = $"⚖️ Anotación en Observador: {tipo}",
            Mensaje = $"El docente ha registrado una observación formativa: \"{titulo}\". Ingresa al observador escolar para revisar el compromiso.",
            Tipo = "Convivencia",
            Link = "/estudiante/convivencia",
            Fecha = DateTime.UtcNow
        });

        // Notificación automática para la Familia / Acudiente
        if (estudiante.AcudienteId.HasValue)
        {
            _db.Notificaciones.Add(new Notificacion
            {
                RolDestinatario = "Acudiente",
                UsuarioDestinatarioId = estudiante.AcudienteId.Value,
                Titulo = $"⚖️ Observador Escolar: {estudiante.Nombre}",
                Mensaje = $"Se ha registrado una observación de convivencia ({tipo}) para su hijo(a) {estudiante.Nombre}: \"{titulo}\".",
                Tipo = "Convivencia",
                Link = "/acudiente/convivencia",
                Fecha = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new { mensaje = "Anotación registrada en el observador escolar y notificada al estudiante y su familia con éxito.", id = observacion.Id });
    }

    private int UsuarioId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public record ObservacionRequest(int EstudianteId, string? Tipo, string? Titulo, string? Descripcion, string? Compromiso, string? Fecha);
