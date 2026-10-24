using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Profesor")]
[Route("api/estudiantes")]
public class EstudiantesController : ControllerBase
{
    private readonly AppDb _db;

    public EstudiantesController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? grupoId)
    {
        var id = ProfesorId();
        var query = _db.Estudiantes.Where(e => e.ProfesorId == id);
        if (grupoId is not null)
            query = query.Where(e => e.GrupoId == grupoId);

        var lista = await query
            .OrderBy(e => e.Nombre)
            .Select(e => new
            {
                e.Id,
                e.Nombre,
                e.Documento,
                e.GrupoId,
                grupo = e.Grupo != null ? e.Grupo.Nombre : null
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] EstudianteRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var documento = (body.Documento ?? "").Trim();
        var password = body.Password ?? "";
        if (nombre.Length == 0 || nombre.Length > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del estudiante." });
        if (!DocumentoValido(documento))
            return BadRequest(new { mensaje = "El documento debe tener entre 5 y 15 dígitos." });
        if (password.Length < 6)
            return BadRequest(new { mensaje = "La clave debe tener al menos 6 caracteres." });

        if (await _db.Estudiantes.AnyAsync(e => e.Documento == documento))
            return BadRequest(new { mensaje = "Ese documento ya está registrado." });

        if (!await GrupoPropio(body.GrupoId))
            return BadRequest(new { mensaje = "Elige un grupo válido." });

        var estudiante = DbSeeder.Nuevo(ProfesorId(), body.GrupoId, nombre, documento, password);
        _db.Estudiantes.Add(estudiante);
        await _db.SaveChangesAsync();
        return Ok(new { estudiante.Id, estudiante.Nombre, estudiante.Documento, estudiante.GrupoId });
    }

    [HttpPut("{estudianteId:int}")]
    public async Task<IActionResult> Actualizar(int estudianteId, [FromBody] EstudianteUpdate body)
    {
        var estudiante = await _db.Estudiantes
            .FirstOrDefaultAsync(e => e.Id == estudianteId && e.ProfesorId == ProfesorId());
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });

        var nombre = (body.Nombre ?? "").Trim();
        if (nombre.Length == 0 || nombre.Length > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del estudiante." });
        if (!await GrupoPropio(body.GrupoId))
            return BadRequest(new { mensaje = "Elige un grupo válido." });

        estudiante.Nombre = nombre;
        estudiante.GrupoId = body.GrupoId;
        if (!string.IsNullOrWhiteSpace(body.Password))
        {
            if (body.Password.Trim().Length < 6)
                return BadRequest(new { mensaje = "La clave debe tener al menos 6 caracteres." });
            estudiante.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim());
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Estudiante actualizado." });
    }

    private int ProfesorId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> GrupoPropio(int? grupoId)
    {
        if (grupoId is null) return false;
        return await _db.Grupos.AnyAsync(g => g.Id == grupoId && g.ProfesorId == ProfesorId());
    }

    private static bool DocumentoValido(string documento) =>
        documento.Length is >= 5 and <= 15 && documento.All(char.IsDigit);
}

public record EstudianteRequest(string? Nombre, string? Documento, string? Password, int? GrupoId);
public record EstudianteUpdate(string? Nombre, int? GrupoId, string? Password);
