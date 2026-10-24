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
        var query = _db.Estudiantes.Where(e =>
            e.Grupo != null && (e.Grupo.ProfesorId == id || e.Grupo.Materias.Any(v => v.Materia!.ProfesorId == id)));
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
                grupo = e.Grupo != null ? e.Grupo.Nombre : null,
                tieneFoto = e.Foto != null,
                tieneRostro = e.Rostros.Any(r => r.Pose == "frente"),
                carnet = e.Foto != null && e.Rostros.Any(r => r.Pose == "frente")
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

    [HttpPut("{estudianteId:int}/foto")]
    public async Task<IActionResult> GuardarFoto(int estudianteId, [FromBody] FotoRequest body)
    {
        var estudiante = await Visible(estudianteId);
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });
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

    [HttpPut("{estudianteId:int}/rostro")]
    public async Task<IActionResult> GuardarRostro(int estudianteId, [FromBody] RostroRequest body)
    {
        var estudiante = await Visible(estudianteId);
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });
        return await GuardarMuestras(estudiante, body.Muestras);
    }

    [HttpGet("{estudianteId:int}/carnet")]
    public async Task<IActionResult> Carnet(int estudianteId)
    {
        var estudiante = await _db.Estudiantes
            .Include(e => e.Grupo)
            .Include(e => e.Rostros)
            .FirstOrDefaultAsync(e => e.Id == estudianteId);
        if (estudiante is null || await Visible(estudianteId) is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });
        if (estudiante.Foto is null || estudiante.Rostros.All(r => r.Pose != "frente"))
            return BadRequest(new { mensaje = "El carnet se genera cuando hay foto y el rostro de frente." });
        return File(CarnetDibujo.Pintar(estudiante), "image/png", $"carnet-{estudiante.Documento}.png");
    }

    private async Task<IActionResult> GuardarMuestras(Estudiante estudiante, List<MuestraRostro>? muestras)
    {
        var lista = muestras ?? [];
        if (lista.Count != RostroUtil.Poses.Length || lista.Select(m => m.Pose).Distinct().Count() != RostroUtil.Poses.Length)
            return BadRequest(new { mensaje = "Hacen falta las cinco poses de la cara." });

        var anteriores = await _db.Rostros.Where(r => r.EstudianteId == estudiante.Id).ToListAsync();
        _db.Rostros.RemoveRange(anteriores);
        foreach (var muestra in lista)
        {
            var pose = (muestra.Pose ?? "").Trim().ToLowerInvariant();
            if (!RostroUtil.PoseValida(pose))
                return BadRequest(new { mensaje = "Hay una pose que no corresponde." });
            string vector;
            try
            {
                vector = RostroUtil.Guardar(muestra.Vector ?? []);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { mensaje = "Una de las lecturas de la cara no es válida." });
            }
            _db.Rostros.Add(new Rostro { EstudianteId = estudiante.Id, Pose = pose, Vector = vector });
        }
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Rostro guardado." });
    }

    private async Task<Estudiante?> Visible(int estudianteId)
    {
        var id = ProfesorId();
        return await _db.Estudiantes.FirstOrDefaultAsync(e =>
            e.Id == estudianteId && e.Grupo != null &&
            (e.Grupo.ProfesorId == id || e.Grupo.Materias.Any(v => v.Materia!.ProfesorId == id)));
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
public record FotoRequest(string? Imagen);
public record MuestraRostro(string? Pose, float[]? Vector);
public record RostroRequest(List<MuestraRostro>? Muestras);
