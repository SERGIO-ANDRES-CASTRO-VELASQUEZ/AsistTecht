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
        if (EsDirector())
        {
            var director = await _db.Directores.FindAsync(id);
            if (director is null) return Unauthorized();
            return Ok(new { nombre = director.Nombre, rol = "Director", usuario = director.Usuario });
        }

        if (EsProfesor())
        {
            var profesor = await _db.Profesores.FindAsync(id);
            if (profesor is null) return Unauthorized();
            return Ok(new { nombre = profesor.Nombre, rol = "Profesor", usuario = profesor.Usuario });
        }

        var estudiante = await _db.Estudiantes.Include(e => e.Grupo).Include(e => e.Rostros)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (estudiante is null) return Unauthorized();
        return Ok(new
        {
            nombre = estudiante.Nombre,
            rol = "Estudiante",
            documento = estudiante.Documento,
            grupo = estudiante.Grupo?.Nombre,
            carnet = estudiante.Foto != null && estudiante.Rostros.Any(r => r.Pose == "frente")
        });
    }

    [Authorize(Policy = "Estudiante")]
    [HttpGet("academico")]
    public async Task<IActionResult> Academico()
    {
        var estudiante = await _db.Estudiantes.FirstOrDefaultAsync(e => e.Id == UsuarioId());
        if (estudiante is null) return Unauthorized();
        if (estudiante.GrupoId is null)
            return Ok(new { materias = Array.Empty<object>() });

        var vinculos = await _db.MateriaGrupos
            .Where(x => x.GrupoId == estudiante.GrupoId)
            .Select(x => new { x.MateriaId, materia = x.Materia!.Nombre })
            .ToListAsync();

        var materias = new List<object>();
        foreach (var vinculo in vinculos.OrderBy(v => v.materia))
        {
            var columnas = await _db.NotaColumnas
                .Where(c => c.MateriaId == vinculo.MateriaId && c.GrupoId == estudiante.GrupoId)
                .OrderBy(c => c.Orden)
                .Select(c => new
                {
                    c.Nombre,
                    valor = c.Notas.Where(n => n.EstudianteId == estudiante.Id).Select(n => (decimal?)n.Valor).FirstOrDefault()
                })
                .ToListAsync();
            var fechas = await _db.Sesiones
                .Where(s => s.MateriaId == vinculo.MateriaId && s.GrupoId == estudiante.GrupoId)
                .OrderBy(s => s.Fecha)
                .Select(s => new
                {
                    fecha = s.Fecha.ToString("yyyy-MM-dd"),
                    presente = s.Asistencias.Any(a => a.EstudianteId == estudiante.Id)
                })
                .ToListAsync();
            materias.Add(new
            {
                vinculo.materia,
                columnas,
                fechas,
                ausencias = fechas.Count(f => !f.presente)
            });
        }

        return Ok(new { materias });
    }

    [Authorize(Policy = "Estudiante")]
    [HttpPut("foto")]
    public async Task<IActionResult> GuardarFoto([FromBody] FotoRequest body)
    {
        var estudiante = await _db.Estudiantes.FindAsync(UsuarioId());
        if (estudiante is null) return Unauthorized();
        try
        {
            var foto = RostroUtil.FotoDesdeBase64(body.Imagen);
            estudiante.Foto = foto;
            estudiante.FotoTipo = RostroUtil.TipoDe(foto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Foto guardada." });
    }

    [Authorize(Policy = "Estudiante")]
    [HttpPut("rostro")]
    public async Task<IActionResult> GuardarRostro([FromBody] RostroRequest body)
    {
        var estudiante = await _db.Estudiantes.FindAsync(UsuarioId());
        if (estudiante is null) return Unauthorized();
        var lista = body.Muestras ?? [];
        if (lista.Count != RostroUtil.Poses.Length || lista.Select(m => m.Pose).Distinct().Count() != RostroUtil.Poses.Length)
            return BadRequest(new { mensaje = "Hacen falta las cinco poses de la cara." });

        var anteriores = await _db.Rostros.Where(r => r.EstudianteId == estudiante.Id).ToListAsync();
        _db.Rostros.RemoveRange(anteriores);
        foreach (var muestra in lista)
        {
            var pose = (muestra.Pose ?? "").Trim().ToLowerInvariant();
            if (!RostroUtil.PoseValida(pose))
                return BadRequest(new { mensaje = "Hay una pose que no corresponde." });
            try
            {
                _db.Rostros.Add(new Rostro
                {
                    EstudianteId = estudiante.Id,
                    Pose = pose,
                    Vector = RostroUtil.Guardar(muestra.Vector ?? [])
                });
            }
            catch (ArgumentException)
            {
                return BadRequest(new { mensaje = "Una de las lecturas de la cara no es válida." });
            }
        }
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Rostro guardado." });
    }

    [Authorize(Policy = "Estudiante")]
    [HttpGet("carnet")]
    public async Task<IActionResult> Carnet()
    {
        var estudiante = await _db.Estudiantes.Include(e => e.Grupo).Include(e => e.Rostros)
            .FirstOrDefaultAsync(e => e.Id == UsuarioId());
        if (estudiante is null) return Unauthorized();
        if (estudiante.Foto is null || estudiante.Rostros.All(r => r.Pose != "frente"))
            return BadRequest(new { mensaje = "El carnet se genera cuando hay foto y el rostro de frente." });
        return File(CarnetDibujo.Pintar(estudiante), "image/png", $"carnet-{estudiante.Documento}.png");
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

        if (EsDirector())
        {
            var director = await _db.Directores.FindAsync(UsuarioId());
            if (director is null || !BCrypt.Net.BCrypt.Verify(actual, director.PasswordHash))
                return BadRequest(new { mensaje = "La clave actual no coincide." });
            director.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nueva);
        }
        else if (EsProfesor())
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
    private bool EsDirector() => User.IsInRole("Director");
}

public record ClaveRequest(string? Actual, string? Nueva);
