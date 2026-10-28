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

        if (rol.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            var admin = await _db.Administradores
                .FirstOrDefaultAsync(a => a.Usuario == usuario.ToLowerInvariant());
            if (admin is null || !BCrypt.Net.BCrypt.Verify(password, admin.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            return Ok(Token(admin.Id, admin.Nombre, "Admin", admin.Usuario));
        }

        if (rol.Equals("Profesor", StringComparison.OrdinalIgnoreCase))
        {
            var profesor = await _db.Profesores
                .FirstOrDefaultAsync(p => p.Usuario == usuario.ToLowerInvariant());
            if (profesor is null || !BCrypt.Net.BCrypt.Verify(password, profesor.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            if (!profesor.Activo)
                return Unauthorized(new { mensaje = "Tu usuario docente se encuentra inactivo. Comunícate con el Administrador." });

            return Ok(Token(profesor.Id, profesor.Nombre, "Profesor", profesor.Usuario));
        }

        if (rol.Equals("Director", StringComparison.OrdinalIgnoreCase))
        {
            var director = await _db.Directores
                .FirstOrDefaultAsync(d => d.Usuario == usuario.ToLowerInvariant());
            if (director is null || !BCrypt.Net.BCrypt.Verify(password, director.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            return Ok(Token(director.Id, director.Nombre, "Director", director.Usuario));
        }

        if (rol.Equals("Estudiante", StringComparison.OrdinalIgnoreCase))
        {
            var estudiante = await _db.Estudiantes
                .FirstOrDefaultAsync(e => e.Documento == usuario);
            if (estudiante is null || !BCrypt.Net.BCrypt.Verify(password, estudiante.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            if (!estudiante.Activo)
                return Unauthorized(new { mensaje = "Tu matrícula se encuentra inactiva. Comunícate con el Administrador institucional." });

            return Ok(Token(estudiante.Id, estudiante.Nombre, "Estudiante", estudiante.Documento, estudiante.DebeCambiarPassword));
        }

        if (rol.Equals("Acudiente", StringComparison.OrdinalIgnoreCase))
        {
            var acudiente = await _db.Acudientes
                .FirstOrDefaultAsync(a => a.Documento == usuario);
            if (acudiente is null || !BCrypt.Net.BCrypt.Verify(password, acudiente.PasswordHash))
                return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });

            if (!acudiente.Activo)
                return Unauthorized(new { mensaje = "Tu cuenta familiar se encuentra inactiva. Comunícate con el Administrador." });

            return Ok(Token(acudiente.Id, acudiente.Nombre, "Acudiente", acudiente.Documento));
        }

        return Unauthorized(new { mensaje = "Usuario o clave incorrectos." });
    }

    [AllowAnonymous]
    [HttpPost("solicitar-clave")]
    public async Task<IActionResult> SolicitarClave([FromBody] SolicitudClaveRequest body)
    {
        var documento = (body.Documento ?? "").Trim();
        var rol = (body.Rol ?? "Estudiante").Trim();
        var mensaje = (body.Mensaje ?? "").Trim();

        if (string.IsNullOrEmpty(documento))
            return BadRequest(new { mensaje = "Escribe tu número de documento o usuario institucional." });

        string nombre = "Usuario";
        if (rol.Equals("Estudiante", StringComparison.OrdinalIgnoreCase))
        {
            var est = await _db.Estudiantes.FirstOrDefaultAsync(e => e.Documento == documento);
            if (est is null)
                return NotFound(new { mensaje = "No se encontró ningún estudiante con ese documento." });
            nombre = est.Nombre;
        }
        else if (rol.Equals("Profesor", StringComparison.OrdinalIgnoreCase))
        {
            var prof = await _db.Profesores.FirstOrDefaultAsync(p => p.Usuario == documento.ToLowerInvariant());
            if (prof is null)
                return NotFound(new { mensaje = "No se encontró ningún docente con ese usuario." });
            nombre = prof.Nombre;
        }
        else if (rol.Equals("Acudiente", StringComparison.OrdinalIgnoreCase))
        {
            var acud = await _db.Acudientes.FirstOrDefaultAsync(a => a.Documento == documento);
            if (acud is null)
                return NotFound(new { mensaje = "No se encontró ningún acudiente con ese documento." });
            nombre = acud.Nombre;
        }

        var solicitud = new SolicitudClave
        {
            Documento = documento,
            Nombre = nombre,
            Rol = rol,
            Mensaje = string.IsNullOrEmpty(mensaje) ? "Olvidé mi contraseña institucional y solicito restablecimiento." : mensaje,
            Estado = "Pendiente",
            CreadaEn = DateTime.UtcNow
        };
        _db.SolicitudesClave.Add(solicitud);

        _db.Notificaciones.Add(new Notificacion
        {
            RolDestinatario = "Admin",
            Titulo = $"Solicitud de Clave: {nombre}",
            Mensaje = $"El usuario {nombre} ({rol}, Doc: {documento}) solicitó recuperar su contraseña.",
            Tipo = "Info",
            Link = "/admin/usuarios"
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Tu solicitud ha sido radicada ante el Administrador. Una vez verificada, el Administrador te asignará tu clave provisional.",
            nombre
        });
    }

    private object Token(int id, string nombre, string rol, string usuario, bool debeCambiarPassword = false)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim(ClaimTypes.Name, nombre),
            new Claim(ClaimTypes.Role, rol),
            new Claim("usuario", usuario),
            new Claim("debeCambiarPassword", debeCambiarPassword ? "true" : "false")
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
            usuario,
            debeCambiarPassword
        };
    }
}

public record LoginRequest(string? Usuario, string? Password, string? Rol);
public record SolicitudClaveRequest(string? Documento, string? Rol, string? Mensaje);
