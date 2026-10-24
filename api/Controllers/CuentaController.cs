using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QRCoder;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/cuenta")]
public class CuentaController : ControllerBase
{
    private readonly AppDb _db;

    public CuentaController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Perfil()
    {
        var id = UsuarioId();
        if (EsProfesor())
        {
            var profesor = await _db.Profesores.FindAsync(id);
            if (profesor is null) return Unauthorized();
            return Ok(new { nombre = profesor.Nombre, rol = "Profesor", usuario = profesor.Usuario });
        }

        var estudiante = await _db.Estudiantes.Include(e => e.Grupo).FirstOrDefaultAsync(e => e.Id == id);
        if (estudiante is null) return Unauthorized();
        return Ok(new
        {
            nombre = estudiante.Nombre,
            rol = "Estudiante",
            documento = estudiante.Documento,
            grupo = estudiante.Grupo?.Nombre
        });
    }

    [Authorize(Policy = "Estudiante")]
    [HttpGet("qr")]
    public async Task<IActionResult> Qr()
    {
        var estudiante = await _db.Estudiantes.FindAsync(UsuarioId());
        if (estudiante is null) return Unauthorized();

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(estudiante.QrToken, QRCodeGenerator.ECCLevel.H);
        var png = new PngByteQRCode(data);
        var bytes = png.GetGraphic(18);
        return File(bytes, "image/png", $"qr-{estudiante.Documento}.png");
    }

    [HttpPost("clave")]
    public async Task<IActionResult> CambiarClave([FromBody] ClaveRequest body)
    {
        var actual = body.Actual ?? "";
        var nueva = (body.Nueva ?? "").Trim();
        if (nueva.Length < 6)
            return BadRequest(new { mensaje = "La clave nueva debe tener al menos 6 caracteres." });

        if (EsProfesor())
        {
            var profesor = await _db.Profesores.FindAsync(UsuarioId());
            if (profesor is null || !BCrypt.Net.BCrypt.Verify(actual, profesor.PasswordHash))
                return BadRequest(new { mensaje = "La clave actual no coincide." });
            profesor.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nueva);
        }
        else
        {
            var estudiante = await _db.Estudiantes.FindAsync(UsuarioId());
            if (estudiante is null || !BCrypt.Net.BCrypt.Verify(actual, estudiante.PasswordHash))
                return BadRequest(new { mensaje = "La clave actual no coincide." });
            estudiante.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nueva);
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Clave actualizada." });
    }

    private int UsuarioId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool EsProfesor() => User.IsInRole("Profesor");
}

public record ClaveRequest(string? Actual, string? Nueva);
