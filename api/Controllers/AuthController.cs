using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AsisQR.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDb _db;
    private readonly IConfiguration _config;

    public AuthController(AppDb db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        var usuario = (body.Usuario ?? "").Trim();
        var password = body.Password ?? "";
        var rol = (body.Rol ?? "").Trim();

        if (usuario.Length == 0 || password.Length == 0)
            return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

        if (rol.Equals("Profesor", StringComparison.OrdinalIgnoreCase))
        {
            var profesor = await _db.Profesores
                .FirstOrDefaultAsync(p => p.Usuario == usuario.ToLowerInvariant());
            if (profesor is null || !BCrypt.Net.BCrypt.Verify(password, profesor.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            return Ok(Token(profesor.Id, profesor.Nombre, "Profesor", profesor.Usuario));
        }

        if (rol.Equals("Estudiante", StringComparison.OrdinalIgnoreCase))
        {
            var estudiante = await _db.Estudiantes
                .FirstOrDefaultAsync(e => e.Documento == usuario);
            if (estudiante is null || !BCrypt.Net.BCrypt.Verify(password, estudiante.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            return Ok(Token(estudiante.Id, estudiante.Nombre, "Estudiante", estudiante.Documento));
        }

        return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });
    }

    private object Token(int id, string nombre, string rol, string usuario)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim(ClaimTypes.Name, nombre),
            new Claim(ClaimTypes.Role, rol),
            new Claim("usuario", usuario)
        };
        var jwt = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: creds);
        return new
        {
            token = new JwtSecurityTokenHandler().WriteToken(jwt),
            rol,
            nombre,
            usuario
        };
    }
}

public record LoginRequest(string? Usuario, string? Password, string? Rol);
