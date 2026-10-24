using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Director")]
[Route("api/profesores")]
public class ProfesoresController : ControllerBase
{
    private readonly AppDb _db;

    public ProfesoresController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var lista = await _db.Profesores
            .OrderBy(p => p.Nombre)
            .Select(p => new { p.Id, p.Nombre, p.Usuario })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] ProfesorRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var usuario = (body.Usuario ?? "").Trim().ToLowerInvariant();
        var password = body.Password ?? "";
        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del profesor." });
        if (usuario.Length is < 3 or > 40 || usuario.Any(char.IsWhiteSpace))
            return BadRequest(new { mensaje = "El usuario debe tener entre 3 y 40 caracteres, sin espacios." });
        if (password.Length < 6)
            return BadRequest(new { mensaje = "La clave debe tener al menos 6 caracteres." });
        if (await _db.Profesores.AnyAsync(p => p.Usuario == usuario))
            return BadRequest(new { mensaje = "Ese usuario ya existe." });

        var profesor = new Profesor
        {
            Nombre = nombre,
            Usuario = usuario,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };
        _db.Profesores.Add(profesor);
        await _db.SaveChangesAsync();
        return Ok(new { profesor.Id, profesor.Nombre, profesor.Usuario });
    }
}

public record ProfesorRequest(string? Nombre, string? Usuario, string? Password);
