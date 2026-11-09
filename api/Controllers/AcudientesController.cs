using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/acudientes")]
public class AcudientesController : ControllerBase
{
    private readonly AppDb _db;

    public AcudientesController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var lista = await _db.Acudientes
            .OrderBy(a => a.Nombre)
            .Select(a => new
            {
                a.Id,
                a.Nombre,
                a.Documento,
                a.Telefono,
                a.Correo,
                estudiantes = a.Estudiantes.Select(e => new { e.Id, e.Nombre, e.Documento }).ToList()
            })
            .ToListAsync();

        return Ok(lista);
    }

    [Authorize(Policy = "Profesor")]
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] AcudienteRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var documento = (body.Documento ?? "").Trim();
        var password = body.Password ?? "Acudiente2026";

        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del acudiente." });
        if (documento.Length < 4)
            return BadRequest(new { mensaje = "Documento no válido." });

        if (await _db.Acudientes.AnyAsync(a => a.Documento == documento))
            return BadRequest(new { mensaje = "Ese acudiente ya está registrado." });

        var acudiente = new Acudiente
        {
            Nombre = nombre,
            Documento = documento,
            Telefono = (body.Telefono ?? "").Trim(),
            Correo = (body.Correo ?? "").Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };

        _db.Acudientes.Add(acudiente);
        await _db.SaveChangesAsync();

        if (body.EstudianteId.HasValue)
        {
            var estudiante = await _db.Estudiantes.FindAsync(body.EstudianteId.Value);
            if (estudiante is not null)
            {
                estudiante.AcudienteId = acudiente.Id;
                await _db.SaveChangesAsync();
            }
        }

        return Ok(new { acudiente.Id, acudiente.Nombre, acudiente.Documento });
    }

    [Authorize(Policy = "Profesor")]
    [HttpPut("{id:int}/vincular")]
    public async Task<IActionResult> VincularEstudiante(int id, [FromBody] VincularRequest body)
    {
        var acudiente = await _db.Acudientes.FindAsync(id);
        if (acudiente is null) return NotFound(new { mensaje = "No se encontró el acudiente." });

        var estudiante = await _db.Estudiantes.FindAsync(body.EstudianteId);
        if (estudiante is null) return NotFound(new { mensaje = "No se encontró el estudiante." });

        estudiante.AcudienteId = acudiente.Id;
        await _db.SaveChangesAsync();

        return Ok(new { mensaje = "Estudiante vinculado con éxito al acudiente." });
    }
}

public record AcudienteRequest(string? Nombre, string? Documento, string? Telefono, string? Correo, string? Password, int? EstudianteId);
public record VincularRequest(int EstudianteId);
